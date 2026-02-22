const { processPaymentWorkflowId, updateCustomersWorkflow } = require("@medusajs/core-flows")
const {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
  remoteQueryObjectFromString,
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

const removePendingPaymentFromCustomer = async (container, customer, paymentCollectionId) => {
  if (!customer) return
  const metadata = customer?.metadata || {}
  const current = Array.isArray(metadata?.pending_payments) ? metadata.pending_payments : []
  if (!current.length) return
  const next = current.filter((item) => item?.payment_collection_id !== paymentCollectionId)
  if (next.length === current.length) return
  await updateCustomersWorkflow(container).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...metadata, pending_payments: next } },
    },
  })
}

const cleanupPendingPayments = async (container, paymentCollectionId) => {
  if (!paymentCollectionId) return
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const customers = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { limit: 500 },
      fields: ["id", "metadata"],
    })
  )
  for (const customer of customers || []) {
    const entries = Array.isArray(customer?.metadata?.pending_payments)
      ? customer.metadata.pending_payments
      : []
    if (entries.some((entry) => entry?.payment_collection_id === paymentCollectionId)) {
      await removePendingPaymentFromCustomer(container, customer, paymentCollectionId)
    }
  }
}

const resolvePaymentCollectionId = async (container, sessionId) => {
  if (!sessionId) return null
  try {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const sessions = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "payment_session",
        variables: { filters: { id: sessionId }, limit: 1 },
        fields: ["id", "payment_collection_id", "data"],
      })
    )
    const session = sessions?.[0]
    return session?.payment_collection_id || session?.data?.payment_collection_id || null
  } catch {
    return null
  }
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

  if (processedEvent?.action === PaymentActions.SUCCESSFUL) {
    const paymentCollectionId = await resolvePaymentCollectionId(
      container,
      processedEvent?.data?.session_id
    )
    if (paymentCollectionId) {
      await cleanupPendingPayments(container, paymentCollectionId)
    }
  }
}

exports.default = paymentWebhookHandler
exports.config = {
  event: WEBHOOK_EVENT,
  context: {
    subscriberId: "custom-payment-webhook-handler",
  },
}
