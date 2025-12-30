const { processPaymentWorkflowId } = require("@medusajs/core-flows")
const {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
} = require("@medusajs/framework/utils")

const WEBHOOK_EVENT = "custom.payment_webhook_received"

const isCardWebhookPayload = (payload) => {
  const event = payload?.data
  const object = event?.data?.object || event?.object
  const types = object?.payment_method_types || object?.payment_method_type

  if (Array.isArray(types)) {
    return types.includes("card")
  }
  return types === "card"
}

async function paymentWebhookHandler({ event, container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const paymentService = container.resolve(Modules.PAYMENT)
  const input = event.data

  if (input.payload?.rawData?.type === "Buffer") {
    input.payload.rawData = Buffer.from(input.payload.rawData.data)
  }

  const processedEvent = await paymentService.getWebhookActionAndData(input)
  if (!processedEvent.data) {
    return
  }

  if (isCardWebhookPayload(input.payload)) {
    logger.info(
      `[hooks] payment-webhook: cartao ignorado para ${processedEvent?.data?.session_id}`
    )
    return
  }

  if (
    processedEvent?.action === PaymentActions.NOT_SUPPORTED ||
    processedEvent?.action === PaymentActions.CANCELED ||
    processedEvent?.action === PaymentActions.FAILED ||
    processedEvent?.action === PaymentActions.REQUIRES_MORE
  ) {
    return
  }

  const wfEngine = container.resolve(Modules.WORKFLOW_ENGINE)
  await wfEngine.run(processPaymentWorkflowId, { input: processedEvent })
}

exports.default = paymentWebhookHandler
exports.config = {
  event: WEBHOOK_EVENT,
  context: {
    subscriberId: "custom-payment-webhook-handler",
  },
}
