const jwt = require("jsonwebtoken")
const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { sendEmail } = require("../../../../services/send-email")
const { buildPendingPaymentEmail } = require("../../../../services/pending-payment-email")

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email", "metadata", "approved", "first_name", "last_name", "created_at"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
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
    safeLog(logger, { msg: "resolveCustomerIdFromIdentity:error", error: e?.message })
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
    safeLog(logger, { msg: "getCustomerId:jwt error", error: e?.message })
    return null
  }
}


const POST = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const body = req.body || {}
  const method = body.payment_method || body.method
  const paymentCollectionId = body.payment_collection_id || body.paymentCollectionId
  const companyId = body.company_id || body.companyId
  const details = body.details || {}

  if (!method || !paymentCollectionId || !companyId) {
    return res.status(400).json({ message: "Dados incompletos para envio do pagamento." })
  }
  if (method !== "boleto" && method !== "pix") {
    return res.status(400).json({ message: "Método de pagamento inválido." })
  }

  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const company = companies.find((item) => item?.id === companyId)
  if (!company) {
    return res.status(404).json({ message: "Condomínio não encontrado." })
  }

  const contactEmail = company?.metadata?.email || null
  const adminEmail = company?.metadata?.administradoraEmail || null
  const recipients = [contactEmail, adminEmail].filter(Boolean)
  const uniqueRecipients = Array.from(new Set(recipients))

  if (!uniqueRecipients.length) {
    return res.status(400).json({ message: "Condomínio sem e-mails configurados." })
  }

  const companyName = company?.fantasy_name || company?.trade_name || company?.metadata?.name || "Condomínio"
  const storeUrl = process.env.STORE_URL || process.env.FRONTEND_URL || ""
  const checkoutUrl = storeUrl
    ? `${storeUrl.replace(/\/$/, "")}/checkout?pending=${encodeURIComponent(paymentCollectionId)}`
    : ""

  const { html, text } = buildPendingPaymentEmail({
    method,
    companyName,
    details,
    checkoutUrl,
  })
  const subject =
    method === "boleto"
      ? `Boleto disponível - ${companyName}`
      : `PIX disponível - ${companyName}`

  await sendEmail({
    to: uniqueRecipients,
    subject,
    html,
    text,
    logger,
  })

  safeLog(logger, {
    msg: "pending-payment:email-sent",
    companyId,
    paymentCollectionId,
    recipients: uniqueRecipients,
  })

  return res.status(200).json({ sent: true, recipients: uniqueRecipients })
}

module.exports = { POST }
