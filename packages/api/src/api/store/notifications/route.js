const jwt = require("jsonwebtoken")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")
const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")

const MAX_NOTIFICATIONS = 200

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "metadata"],
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

const resolveCustomerIdFromIdentity = async (scope, authIdentityId) => {
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
      if (candidate) return candidate
    }

    if (authIdentityService.retrieve) {
      const identity = await authIdentityService.retrieve(authIdentityId)
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) return candidate
    }

    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id) return providerIdentity.entity_id
    }
  } catch {
    return null
  }
  return null
}

const getCustomerId = async (req) => {
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(req.scope, req.auth_context.auth_identity_id)
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
      (await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id)) ||
      null
    )
  } catch {
    return null
  }
}

const normalizeNotifications = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || ""),
      title: String(item.title || ""),
      message: String(item.message || ""),
      status: String(item.status || "news"),
      order_id: item.order_id ? String(item.order_id) : undefined,
      company_id: item.company_id ? String(item.company_id) : undefined,
      read: Boolean(item.read),
      created_at: item.created_at || new Date().toISOString(),
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : undefined,
    }))
    .filter((item) => item.id && item.title && item.message)
    .slice(0, MAX_NOTIFICATIONS)
}

const GET = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const notifications = normalizeNotifications(customer?.metadata?.notifications_history)
  return res.status(200).json({ notifications })
}

const POST = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const body = req.body || {}
  const readIds = Array.isArray(body.read_ids) ? body.read_ids.map((id) => String(id)) : []
  if (!readIds.length) {
    return res.status(400).json({ message: "read_ids é obrigatório." })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const current = normalizeNotifications(customer?.metadata?.notifications_history)
  const next = current.map((item) => (readIds.includes(item.id) ? { ...item, read: true } : item))

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: {
        metadata: {
          ...(customer.metadata || {}),
          notifications_history: next,
        },
      },
    },
  })

  return res.status(200).json({ notifications: next })
}

module.exports = { GET, POST }
