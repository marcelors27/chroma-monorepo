const { PaymentActions, PaymentSessionStatus } = require("@medusajs/utils")
const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { processPaymentWorkflow } = require("@medusajs/core-flows")

const PENDING_STATUSES = [
  PaymentSessionStatus.PENDING,
  PaymentSessionStatus.REQUIRES_MORE,
]

const resolveAction = (status) => {
  if (status === PaymentSessionStatus.CAPTURED) {
    return PaymentActions.SUCCESSFUL
  }
  if (status === PaymentSessionStatus.AUTHORIZED) {
    return PaymentActions.AUTHORIZED
  }
  return null
}

const isCardPaymentSession = (session, providerStatus) => {
  const fromSession = session?.data?.payment_method_types || session?.data?.payment_method_type
  if (Array.isArray(fromSession) && fromSession.includes("card")) return true
  if (fromSession === "card") return true

  const statusData = providerStatus?.data
  const directTypes =
    statusData?.payment_method_types || statusData?.payment_method_type
  if (Array.isArray(directTypes) && directTypes.includes("card")) return true
  if (directTypes === "card") return true

  const intentTypes = statusData?.payment_intent?.payment_method_types
  if (Array.isArray(intentTypes) && intentTypes.includes("card")) return true

  return false
}

const pollStripePaymentSessions = async function pollStripePaymentSessions(container) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const paymentModule = container.resolve(Modules.PAYMENT)
  const paymentProviderService =
    paymentModule?.paymentProviderService_ || paymentModule?.paymentProviderService
  const paymentSessionService =
    paymentModule?.paymentSessionService_ || paymentModule?.paymentSessionService
  if (!paymentProviderService) {
    logger.warn("[jobs] poll-stripe-payment-sessions: paymentProviderService indisponivel")
    return
  }
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  let sessions = []
  if (paymentSessionService?.list) {
    sessions = await paymentSessionService.list(
      { status: PENDING_STATUSES },
      {
        select: ["id", "provider_id", "status", "data", "amount", "currency_code"],
        take: 200,
      }
    )
    sessions = sessions.filter((session) =>
      session?.provider_id?.startsWith("pp_stripe")
    )
  } else if (remoteQuery) {
    const query = remoteQueryObjectFromString({
      entryPoint: "payment_session",
      variables: {
        filters: {
          status: PENDING_STATUSES,
          provider_id: { $like: "pp_stripe%" },
        },
        limit: 200,
      },
      fields: ["id", "provider_id", "status", "data", "amount", "currency_code"],
    })
    sessions = await remoteQuery(query)
  } else {
    logger.warn("[jobs] poll-stripe-payment-sessions: sem fonte para listar sessions")
    return
  }

  for (const session of sessions) {
    try {
      const providerStatus = await paymentProviderService.getStatus(
        session.provider_id,
        { data: session.data }
      )

      const nextStatus = providerStatus?.status
      const nextData = providerStatus?.data ?? session.data
      if (!nextStatus || PENDING_STATUSES.includes(nextStatus)) {
        if (paymentSessionService?.update && nextData !== session.data) {
          await paymentSessionService.update({ id: session.id, data: nextData })
        }
        continue
      }

      const action = resolveAction(nextStatus)
      const isCardSession = isCardPaymentSession(session, providerStatus)
      if (isCardSession) {
        logger.info(
          `[jobs] poll-stripe-payment-sessions: cartao ignorado para ${session.id} (${nextStatus})`
        )
      }
      if (!action || action === PaymentActions.AUTHORIZED || isCardSession) {
        if (paymentSessionService?.update) {
          await paymentSessionService.update({
            id: session.id,
            status: nextStatus,
            data: nextData,
          })
        }
        continue
      }

      await processPaymentWorkflow(container).run({
        input: {
          action,
          data: {
            session_id: session.id,
            amount: session.amount,
          },
        },
      })
      if (paymentSessionService?.update) {
        await paymentSessionService.update({
          id: session.id,
          status: nextStatus,
          data: nextData,
        })
      }
    } catch (err) {
      logger.warn(
        `[jobs] poll-stripe-payment-sessions failed for ${session?.id}: ${
          err?.message || err
        }`
      )
    }
  }
}

exports.default = pollStripePaymentSessions
exports.config = {
  name: "poll-stripe-payment-sessions",
  schedule: "*/1 * * * *",
}
