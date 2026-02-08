const jwt = require("jsonwebtoken")
const {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { processPaymentWorkflow } = require("@medusajs/core-flows")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")
const { PaymentSessionStatus } = require("@medusajs/utils")
const { completeCartWorkflowId } = require("@medusajs/core-flows")

const isTestBoletoEnabled = () => process.env.ENABLE_TEST_BOLETO === "true"
const isNonProd = () => process.env.NODE_ENV !== "production"

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const getAuthServices = (scope) => {
  const services = {}
  try {
    services.authIdentityService = scope.resolve("authIdentityService")
  } catch {}
  try {
    services.providerIdentityService = scope.resolve("providerIdentityService")
  } catch {}
  try {
    const authModule = scope.resolve(Modules.AUTH)
    services.authIdentityService =
      services.authIdentityService ||
      authModule?.authIdentityService_ ||
      authModule?.authIdentityService
    services.providerIdentityService =
      services.providerIdentityService ||
      authModule?.providerIdentityService_ ||
      authModule?.providerIdentityService
  } catch {}
  return services
}

const resolveCustomerIdFromIdentity = async (scope, authIdentityId, logger) => {
  if (!authIdentityId) return null
  try {
    const { authIdentityService, providerIdentityService } = getAuthServices(scope)
    if (!authIdentityService && !providerIdentityService) return null

    if (authIdentityService.list) {
      const identities = await authIdentityService.list({ id: authIdentityId })
      const identity = identities?.[0]
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (authIdentityService.retrieve) {
      const identity = await authIdentityService.retrieve(authIdentityId)
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id) {
        return providerIdentity.entity_id
      }
    }
  } catch (e) {
    safeLog(logger, { msg: "test-boleto:resolveCustomerId:error", error: e?.message })
    return null
  }
  return null
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(
      req.scope,
      req.auth_context.auth_identity_id,
      logger
    )
    if (resolved) return resolved
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const [, token] = authHeader.split(" ")
  if (!token) return null

  try {
    const config = req.scope.resolve("configModule")
    const http = config.projectConfig?.http || {}
    const verified = jwt.verify(
      token,
      http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
      http.jwtVerifyOptions || http.jwtOptions || {}
    )
    return (
      verified.actor_id ||
      verified.customer_id ||
      verified.app_metadata?.customer_id ||
      (await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)) ||
      null
    )
  } catch (e) {
    safeLog(logger, { msg: "test-boleto:getCustomerId:jwt", error: e?.message })
    return null
  }
}

const isBoletoSession = (session) => {
  if (!session) return false
  const data = session?.data || {}
  const directTypes = data?.payment_method_types || data?.payment_method_type
  const intentTypes =
    data?.payment_intent?.payment_method_types ||
    data?.payment_intent?.payment_method_type ||
    data?.payment_intent?.payment_intent?.payment_method_types
  const normalize = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    return [value]
  }
  const types = [...normalize(directTypes), ...normalize(intentTypes)].filter(Boolean)
  return types.includes("boleto")
}

const removePendingPaymentFromCustomer = async (scope, customer, paymentCollectionId) => {
  if (!customer) return
  const metadata = customer?.metadata || {}
  const current = Array.isArray(metadata?.pending_payments) ? metadata.pending_payments : []
  if (!current.length) return
  const next = current.filter(
    (item) => item?.payment_collection_id !== paymentCollectionId
  )
  await updateCustomersWorkflow(scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...metadata, pending_payments: next } },
    },
  })
}

const appendTestPaymentLog = async (scope, customer, payload) => {
  if (!customer) return
  const metadata = customer?.metadata || {}
  const current = Array.isArray(metadata?.test_payment_logs) ? metadata.test_payment_logs : []
  const entry = {
    type: "test_boleto",
    payment_collection_id: payload?.payment_collection_id || null,
    session_id: payload?.session_id || null,
    actor_customer_id: payload?.actor_customer_id || null,
    ip: payload?.ip || null,
    user_agent: payload?.user_agent || null,
    created_at: new Date().toISOString(),
  }
  const next = [entry, ...current].slice(0, 50)
  await updateCustomersWorkflow(scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...metadata, test_payment_logs: next } },
    },
  })
}

const POST = async (req, res) => {
  if (!isTestBoletoEnabled() || !isNonProd()) {
    return res.status(404).json({ message: "Not found" })
  }

  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const paymentCollectionId =
    req.body?.payment_collection_id || req.body?.paymentCollectionId
  if (!paymentCollectionId) {
    return res.status(400).json({ message: "payment_collection_id obrigatório." })
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const paymentCollections = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "payment_collection",
      variables: { filters: { id: paymentCollectionId }, limit: 1 },
      fields: [
        "id",
        "payment_sessions.id",
        "payment_sessions.provider_id",
        "payment_sessions.status",
        "payment_sessions.amount",
        "payment_sessions.currency_code",
        "payment_sessions.data",
      ],
    })
  )
  const collection = paymentCollections?.[0]
  const sessions = collection?.payment_sessions || []
  const target = sessions.find(
    (session) =>
      session?.provider_id?.startsWith("pp_stripe") && isBoletoSession(session)
  )

  if (!target?.id) {
    return res.status(404).json({ message: "Sessão boleto não encontrada." })
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT)
  const paymentSessionService =
    paymentModule?.paymentSessionService_ || paymentModule?.paymentSessionService
  const paymentService = paymentModule?.paymentService_ || paymentModule?.paymentService

  let session = null
  if (paymentSessionService?.retrieve) {
    session = await paymentSessionService.retrieve(target.id, {
      select: [
        "id",
        "data",
        "provider_id",
        "amount",
        "currency_code",
        "payment_collection_id",
        "authorized_at",
      ],
    })
  }

  if (!session) {
    return res.status(404).json({ message: "Sessão boleto não encontrada." })
  }

  try {
    if (typeof paymentModule?.authorizePaymentSession_ === "function") {
      await paymentModule.authorizePaymentSession_(session, session.data || {}, PaymentSessionStatus.CAPTURED, {})
    } else if (paymentService && paymentSessionService?.update) {
      await paymentSessionService.update({
        id: session.id,
        status: PaymentSessionStatus.AUTHORIZED,
        data: session.data,
        authorized_at: session.authorized_at || new Date(),
      })
      const payment = await paymentService.create({
        amount: session.amount,
        currency_code: session.currency_code,
        payment_session: session.id,
        payment_collection_id: session.payment_collection_id,
        provider_id: session.provider_id,
        data: session.data,
      })
      if (typeof paymentModule?.capturePayment === "function") {
        await paymentModule.capturePayment({
          payment_id: payment.id,
          amount: session.amount,
          is_captured: true,
        })
      }
    }
  } catch (err) {
    logger?.warn?.("test-boleto:authorize-failed", { error: err?.message })
  }

  if (typeof paymentModule?.maybeUpdatePaymentCollection_ === "function") {
    try {
      await paymentModule.maybeUpdatePaymentCollection_(session.payment_collection_id)
    } catch (err) {
      logger?.warn?.("test-boleto:collection-update-failed", { error: err?.message })
    }
  }

  if (paymentSessionService?.update) {
    try {
      await paymentSessionService.update({
        id: session.id,
        status: PaymentSessionStatus.CAPTURED,
        data: { ...(session.data || {}), status: "captured" },
      })
    } catch (err) {
      logger?.warn?.("test-boleto:session-update-failed", { error: err?.message })
    }
  }

  try {
    const cartPaymentCollection = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { payment_collection_id: paymentCollectionId }, limit: 1 },
        fields: ["cart_id"],
      })
    )
    const cartId = cartPaymentCollection?.[0]?.cart_id
    if (cartId) {
      const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
      await workflowEngine.run(completeCartWorkflowId, { input: { id: cartId } })
    }
  } catch (err) {
    logger?.warn?.("test-boleto:complete-cart-failed", { error: err?.message })
  }

  const customer = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { id: customerId }, limit: 1 },
      fields: ["id", "metadata"],
    })
  )
  await removePendingPaymentFromCustomer(req.scope, customer?.[0], paymentCollectionId)
  try {
    const forwardedFor = req.headers["x-forwarded-for"]
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")?.[0]?.trim() || req.ip
    await appendTestPaymentLog(req.scope, customer?.[0], {
      payment_collection_id: paymentCollectionId,
      session_id: target.id,
      actor_customer_id: customerId,
      ip,
      user_agent: req.headers["user-agent"] || null,
    })
  } catch (err) {
    logger?.warn?.("test-boleto:log-failed", { error: err?.message })
  }

  safeLog(logger, {
    msg: "test-boleto:completed",
    payment_collection_id: paymentCollectionId,
    session_id: target.id,
  })

  return res.status(200).json({ ok: true, payment_collection_id: paymentCollectionId })
}

module.exports = { POST }
