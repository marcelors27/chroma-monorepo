const jwt = require("jsonwebtoken")
const { Modules } = require("@medusajs/framework/utils")
const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow, updateCustomersWorkflow } = require("@medusajs/core-flows")

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

const ensureCustomerForIdentity = async (scope, authIdentityId, email, logger) => {
  // Try email lookup first
  const existing = await findCustomerIdByEmail(scope, email, logger)
  if (existing) return existing

  if (!authIdentityId || !email) return null

  try {
    const { result } = await createCustomerAccountWorkflow(scope).run({
      input: {
        authIdentityId,
        customerData: { email, approved: false, metadata: { approved: false } },
      },
    })
    safeLog(logger, { msg: "ensureCustomerForIdentity:created", authIdentityId, email, id: result?.id })
    return result?.id || null
  } catch (e) {
    safeLog(logger, { msg: "ensureCustomerForIdentity:error", error: e?.message, authIdentityId, email })
    return null
  }
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

    // Fallback: provider identities bound to this auth_identity_id
    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id) {
        const candidate = providerIdentity.entity_id
        if (candidate.includes("@")) {
          const emailId = await ensureCustomerForIdentity(scope, authIdentityId, candidate, logger)
          if (emailId) return emailId
        }
        return candidate
      }
    }
  } catch {
    return null
  }
  return null
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  // authenticate middleware populates auth_context; accept customer or store with auth_identity_id
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    safeLog(logger, {
      msg: "getCustomerId:actor",
      actor_type: "customer",
      actor_id: req.auth_context.actor_id,
    })
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(
      req.scope,
      req.auth_context.auth_identity_id,
      logger
    )
    safeLog(logger, {
      msg: "getCustomerId:store actor",
      auth_identity_id: req.auth_context.auth_identity_id,
      resolved,
    })
    if (resolved) return resolved
  }

  // Fallback: decode bearer token manually to extract actor/customer id or auth_identity_id
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
    if (direct) {
      safeLog(logger, { msg: "getCustomerId:jwt direct", direct, actor_type: verified.actor_type })
      if (String(direct).includes("@")) {
        const id = await ensureCustomerForIdentity(req.scope, verified.auth_identity_id, direct, logger)
        if (id) return id
      }
      return direct
    }

    const resolved = await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)
    safeLog(logger, {
      msg: "getCustomerId:jwt resolved via auth_identity",
      auth_identity_id: verified.auth_identity_id,
      resolved,
    })
    if (resolved && String(resolved).includes("@")) {
      const id = await ensureCustomerForIdentity(req.scope, verified.auth_identity_id, resolved, logger)
      if (id) return id
    }
    return resolved
  } catch (e) {
    safeLog(logger, { msg: "getCustomerId:jwt error", error: e?.message })
    return null
  }
}

const PATCH = async (req, res) => {
  const customerId = await getCustomerId(req, res)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
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

  const body = req.body || {}
  const trade_name = body.trade_name || body.tradeName
  const fantasy_name = body.fantasy_name || body.fantasyName
  const cnpj = body.cnpj || body.cnpj_digits || body.cnpjDigits
  const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata : null

  const current = companies[idx]
  const updated = {
    ...current,
    trade_name: trade_name !== undefined ? trade_name : current.trade_name,
    fantasy_name: fantasy_name !== undefined ? fantasy_name : current.fantasy_name,
    cnpj: cnpj !== undefined ? cnpj : current.cnpj,
    metadata: metadata ? { ...(current.metadata || {}), ...metadata } : current.metadata,
  }

  const nextCompanies = [...companies]
  nextCompanies[idx] = updated

  const nextMetadata = {
    ...(customer.metadata || {}),
    companies: nextCompanies,
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: nextMetadata },
    },
  })

  return res.json({ company: updated })
}

module.exports = { PATCH }
