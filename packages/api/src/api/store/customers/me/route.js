const jwt = require("jsonwebtoken")
const {
  remoteQueryObjectFromString,
  ContainerRegistrationKeys,
  Modules,
} = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow, updateCustomersWorkflow } = require("@medusajs/core-flows")

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const isEmail = (value) => typeof value === "string" && value.includes("@")
const isCustomerId = (value) => typeof value === "string" && value.startsWith("cus_")

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

const findCustomerIdByEmail = async (scope, email, logger) => {
  if (!email) return null
  try {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const query = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { email }, limit: 1 },
      fields: ["id"],
    })
    const customers = await remoteQuery(query)
    const id = customers?.[0]?.id || null
    if (id) safeLog(logger, { msg: "findCustomerIdByEmail", email, id })
    return id
  } catch (e) {
    safeLog(logger, { msg: "findCustomerIdByEmail error", email, error: e?.message })
    return null
  }
}

const resolveEmailFromIdentity = async (scope, auth_identity_id, logger) => {
  if (!auth_identity_id) return null
  const { authIdentityService, providerIdentityService } = getAuthServices(scope)
  try {
    if (authIdentityService?.list) {
      const ids = await authIdentityService.list({ id: auth_identity_id })
      const identity = ids?.[0]
      const entity = identity?.entity_id || null
      if (isEmail(entity)) return entity
      const email = identity?.user_metadata?.email || identity?.app_metadata?.email || null
      if (isEmail(email)) return email
    }
    if (authIdentityService?.retrieve) {
      const identity = await authIdentityService.retrieve(auth_identity_id)
      const entity = identity?.entity_id || null
      if (isEmail(entity)) return entity
      const email = identity?.user_metadata?.email || identity?.app_metadata?.email || null
      if (isEmail(email)) return email
    }
    if (providerIdentityService?.list) {
      const providers = await providerIdentityService.list({ auth_identity_id })
      const provider = providers?.[0]
      const candidate = provider?.entity_id || null
      if (isEmail(candidate)) return candidate
      const providerEmail = provider?.user_metadata?.email
      if (isEmail(providerEmail)) return providerEmail
    }
    try {
      const authModule = scope.resolve(Modules.AUTH)
      if (authModule?.listProviderIdentities) {
        const providers = await authModule.listProviderIdentities(
          { auth_identity_id },
          { select: ["entity_id", "user_metadata"] }
        )
        const provider = providers?.[0]
        const candidate = provider?.entity_id || null
        if (isEmail(candidate)) return candidate
        const providerEmail = provider?.user_metadata?.email
        if (isEmail(providerEmail)) return providerEmail
      }
    } catch {}
  } catch (e) {
    safeLog(logger, { msg: "resolveEmailFromIdentity error", auth_identity_id, error: e?.message })
  }
  return null
}

const ensureCustomerForIdentity = async (scope, auth_identity_id, email, logger) => {
  const { authIdentityService, providerIdentityService } = getAuthServices(scope)

  const tryEmail = async (mail) => {
    if (!mail) return null
    if (isCustomerId(mail)) return mail
    if (!isEmail(mail)) return null
    const existing = await findCustomerIdByEmail(scope, mail, logger)
    if (existing) return existing
    if (!auth_identity_id) return null
    try {
      const { result } = await createCustomerAccountWorkflow(scope).run({
        input: {
          authIdentityId: auth_identity_id,
          customerData: { email: mail, approved: false, metadata: { approved: false } },
        },
      })
      safeLog(logger, { msg: "ensureCustomerForIdentity:created", auth_identity_id, email: mail, id: result?.id })
      return result?.id || null
    } catch (e) {
      safeLog(logger, { msg: "ensureCustomerForIdentity:error", auth_identity_id, email: mail, error: e?.message })
      return null
    }
  }

  // auth identity
  if (authIdentityService?.list) {
    const ids = await authIdentityService.list({ id: auth_identity_id })
    const identity = ids?.[0]
    const candidate =
      identity?.entity_id ||
      identity?.app_metadata?.customer_id ||
      identity?.user_metadata?.customer_id ||
      null
    const found = await tryEmail(candidate)
    if (found) return found
    const email = identity?.user_metadata?.email || identity?.app_metadata?.email || null
    const foundByEmail = await tryEmail(email)
    if (foundByEmail) return foundByEmail
  }
  if (authIdentityService?.retrieve) {
    const identity = await authIdentityService.retrieve(auth_identity_id)
    const candidate =
      identity?.entity_id ||
      identity?.app_metadata?.customer_id ||
      identity?.user_metadata?.customer_id ||
      null
    const found = await tryEmail(candidate)
    if (found) return found
    const email = identity?.user_metadata?.email || identity?.app_metadata?.email || null
    const foundByEmail = await tryEmail(email)
    if (foundByEmail) return foundByEmail
  }

  // provider identity
  if (providerIdentityService?.list) {
    const providers = await providerIdentityService.list({ auth_identity_id })
    const provider = providers?.[0]
    const candidate = provider?.entity_id || null
    const found = await tryEmail(candidate)
    if (found) return found
    const providerEmail = provider?.user_metadata?.email || email
    const foundByEmail = await tryEmail(providerEmail)
    if (foundByEmail) return foundByEmail
  }

  // fallback to provided email
  if (email) {
    const found = await tryEmail(email)
    if (found) return found
  }
  return null
}

const fetchCustomer = async (scope, id) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id }, limit: 1 },
    fields: ["id", "email", "first_name", "last_name", "phone", "metadata", "created_at"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const resolveCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console

  // try auth_context first
  let customerId = req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null
  let authIdentityId = req.auth_context?.auth_identity_id
  let email = null

  // decode token if needed
  if (!customerId || !authIdentityId) {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const [, token] = authHeader.split(" ")
      if (token) {
        try {
          const config = req.scope.resolve("configModule")
          const http = config.projectConfig?.http || {}
          const verified = jwt.verify(
            token,
            http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
            http.jwtVerifyOptions || http.jwtOptions || {}
          )
          authIdentityId = authIdentityId || verified.auth_identity_id
          if (verified.actor_id && isCustomerId(verified.actor_id)) {
            customerId = customerId || verified.actor_id
          }
          email = email || verified.entity_id || verified.email
          if (email && !isEmail(email)) {
            email = null
          }
        } catch (e) {
          safeLog(logger, { msg: "customers/me jwt decode error", error: e?.message })
        }
      }
    }
  }

  if (!customerId || !isCustomerId(customerId)) {
    customerId = null
    if (!email) {
      email = await resolveEmailFromIdentity(req.scope, authIdentityId, logger)
    }
    customerId = await ensureCustomerForIdentity(req.scope, authIdentityId, email, logger)
  }

  if (!customerId && authIdentityId) {
    try {
      const authModule = req.scope.resolve(Modules.AUTH)
      const identities = await authModule.listProviderIdentities(
        { auth_identity_id: authIdentityId },
        { select: ["entity_id"] }
      )
      const candidate = identities?.[0]?.entity_id
      if (candidate && String(candidate).includes("@")) {
        customerId = await ensureCustomerForIdentity(req.scope, authIdentityId, candidate, logger)
      }
    } catch {}
  }

  if (!customerId) {
    safeLog(logger, {
      msg: "customers/me resolveCustomerId failed",
      auth_identity_id: authIdentityId,
      actor_id: req.auth_context?.actor_id,
      actor_type: req.auth_context?.actor_type,
    })
    return null
  }

  return customerId
}

const GET = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  try {
    logger?.info?.(
      JSON.stringify({
        msg: "customers/me auth_context",
        actor_type: req.auth_context?.actor_type,
        actor_id: req.auth_context?.actor_id,
        auth_identity_id: req.auth_context?.auth_identity_id,
      })
    )
  } catch {}
  const customerId = await resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }
  return res.json({ customer })
}

const POST = async (req, res) => {
  const customerId = await resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const current = await fetchCustomer(req.scope, customerId)
  if (!current) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const body = req.body || {}
  const update = {}
  if (body.first_name !== undefined) update.first_name = body.first_name
  if (body.last_name !== undefined) update.last_name = body.last_name
  if (body.phone !== undefined) update.phone = body.phone

  if (body.metadata && typeof body.metadata === "object") {
    update.metadata = { ...(current.metadata || {}), ...body.metadata }
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update,
    },
  })

  const refreshed = await fetchCustomer(req.scope, customerId)
  return res.json({ customer: refreshed })
}

module.exports = { GET, POST }
