const jwt = require("jsonwebtoken")
const { Modules } = require("@medusajs/framework/utils")
const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

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
      if (providerIdentity?.entity_id) {
        return providerIdentity.entity_id
      }
    }
  } catch {
    return null
  }
  return null
}

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

const fetchOrder = async (scope, orderId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: { id: orderId }, limit: 1 },
    fields: ["id", "total", "status", "payment_status", "shipping_address", "metadata"],
  })
  const orders = await remoteQuery(query)
  return orders?.[0]
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(req.scope, req.auth_context.auth_identity_id, logger)
    if (resolved) return resolved
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return null
  }

  const [, token] = authHeader.split(" ")
  if (!token) {
    return null
  }

  try {
    const config = req.scope.resolve("configModule")
    const http = config.projectConfig?.http || {}
    const verified = jwt.verify(
      token,
      http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
      http.jwtVerifyOptions || http.jwtOptions || {}
    )
    const direct = verified.actor_id || verified.customer_id || verified.app_metadata?.customer_id
    if (direct) return direct
    return await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)
  } catch (e) {
    safeLog(logger, { msg: "points:jwt error", error: e?.message })
    return null
  }
}

const POST = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const orderId = req.body?.order_id || req.body?.orderId
  if (!orderId) {
    return res.status(400).json({ message: "order_id obrigatorio" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const idx = companies.findIndex((c) => c.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: "Company not found" })
  }

  const order = await fetchOrder(req.scope, orderId)
  if (!order) {
    return res.status(404).json({ message: "Order not found" })
  }

  const paymentStatus = order.payment_status || order.paymentStatus
  if (paymentStatus && !["captured", "paid", "authorized"].includes(paymentStatus)) {
    return res.status(400).json({ message: "Pedido ainda nao pago." })
  }

  const orderCompanyId =
    order?.shipping_address?.metadata?.company_id ||
    order?.shipping_address?.metadata?.condo_id ||
    order?.metadata?.company_id ||
    null

  if (orderCompanyId && orderCompanyId !== req.params.id) {
    return res.status(400).json({ message: "Pedido nao pertence ao condominio." })
  }

  const current = companies[idx]
  const metadata = current?.metadata || {}
  const existingOrders = Array.isArray(metadata.points_orders) ? metadata.points_orders : []

  if (existingOrders.includes(orderId)) {
    return res.status(200).json({
      points_earned: 0,
      points_balance: Number(metadata.points_balance || 0),
      points_total: Number(metadata.points_total || 0),
    })
  }

  const totalCents = Number(order.total || 0)
  const pointsEarned = Math.floor(totalCents / 100)
  const nextBalance = Number(metadata.points_balance || 0) + pointsEarned
  const nextTotal = Number(metadata.points_total || 0) + pointsEarned

  const updated = {
    ...current,
    metadata: {
      ...metadata,
      points_balance: nextBalance,
      points_total: nextTotal,
      points_orders: [...existingOrders, orderId],
    },
  }

  const nextCompanies = [...companies]
  nextCompanies[idx] = updated

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: { ...(customer.metadata || {}), companies: nextCompanies } },
    },
  })

  return res.json({
    points_earned: pointsEarned,
    points_balance: nextBalance,
    points_total: nextTotal,
  })
}

module.exports = { POST }
