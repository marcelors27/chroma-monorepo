const crypto = require("crypto")
const { Modules } = require("@medusajs/framework/utils")
const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const jwt = require("jsonwebtoken")
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
      variables: { filters: { email } },
      fields: ["id"],
    })
    const customers = await remoteQuery(query)
    const id = customers?.[0]?.id || null
    if (id) {
      safeLog(logger, { msg: "findCustomerIdByEmail", email, id })
    }
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
      safeLog(logger, {
        msg: "resolveCustomerIdFromIdentity:list",
        authIdentityId,
        identityEntity: identity?.entity_id,
        user_metadata: identity?.user_metadata,
        app_metadata: identity?.app_metadata,
      })
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
      safeLog(logger, {
        msg: "resolveCustomerIdFromIdentity:retrieve",
        authIdentityId,
        identityEntity: identity?.entity_id,
        user_metadata: identity?.user_metadata,
        app_metadata: identity?.app_metadata,
      })
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
      safeLog(logger, {
        msg: "resolveCustomerIdFromIdentity:providerIdentity",
        authIdentityId,
        providerEntity: providerIdentity?.entity_id,
      })
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

const GET = async (req, res) => {
  const customerId = await getCustomerId(req, res)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }
  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []

  res.json({ companies })
}

const POST = async (req, res) => {
  // Debug headers/body to verify publishable key is reaching the API
  try {
    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    logger.info?.({
      msg: "store/companies POST",
      headers: {
        "x-publishable-api-key": req.headers["x-publishable-api-key"],
        "x-medusa-sales-channel-id": req.headers["x-medusa-sales-channel-id"],
        authorization: req.headers.authorization || "",
      },
      bodyKeys: Object.keys(req.body || {}),
    })
  } catch (e) {
    console.log("store/companies log error", e?.message || e)
  }

  const customerId = await getCustomerId(req, res)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const body = req.body || {}
  const trade_name = body.trade_name || body.tradeName || body.company_name || body.companyName || body.company
  const fantasy_name = body.fantasy_name || body.fantasyName || body.fantasy || trade_name
  const cnpj = body.cnpj || body.cnpj_digits || body.cnpjDigits

  if (!trade_name || !fantasy_name || !cnpj) {
    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    logger.info?.({
      msg: "store/companies missing fields",
      customerId,
      trade_name,
      fantasy_name,
      cnpj,
      body,
    })
    return res.status(400).json({
      message: "Campos obrigatórios: trade_name, fantasy_name, cnpj",
    })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }
  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []

  const exists = companies.find((c) => c.cnpj?.replace(/\D/g, "") === String(cnpj).replace(/\D/g, ""))
  if (exists) {
    return res.status(409).json({ message: "CNPJ já cadastrado para este usuário" })
  }

  const company = {
    id: `cmp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    trade_name,
    fantasy_name,
    cnpj,
    approved: false,
    created_at: new Date().toISOString(),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
  }

  const metadata = {
    ...(customer.metadata || {}),
    companies: [...companies, company],
  }

  // Update customer metadata via workflow
  const { updateCustomersWorkflow } = require("@medusajs/core-flows")
  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata },
    },
  })

  const refreshed = await fetchCustomer(req.scope, customerId)
  res.status(201).json({ company, customer: refreshed })
}

module.exports = { GET, POST }
