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

const fetchCustomerByEmail = async (scope, email) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { email }, limit: 1 },
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

const isValidDateValue = (value) => {
  if (!value) return true
  return Number.isFinite(Date.parse(value))
}

const POST = async (req, res) => {
  const customerId = await getCustomerId(req, res)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const body = req.body || {}
  const email = body.email || body.targetEmail || body.target_email
  const start_date = body.start_date || body.startDate || null
  const end_date = body.end_date || body.endDate || null
  const permanent = Boolean(body.permanent || body.definitive)

  if (!email) {
    return res.status(400).json({ message: "Informe o email do usuário destino." })
  }

  if (!end_date && !permanent) {
    return res.status(400).json({ message: "Informe data final ou confirme a transferência definitiva." })
  }

  if (!isValidDateValue(start_date) || !isValidDateValue(end_date)) {
    return res.status(400).json({ message: "Datas inválidas para a transferência." })
  }

  if (start_date && end_date && Date.parse(start_date) > Date.parse(end_date)) {
    return res.status(400).json({ message: "A data final deve ser maior que a data inicial." })
  }

  const owner = await fetchCustomer(req.scope, customerId)
  if (!owner) {
    return res.status(404).json({ message: "Customer not found" })
  }

  if (owner.email && owner.email.toLowerCase() === String(email).toLowerCase()) {
    return res.status(400).json({ message: "Escolha um usuário diferente do proprietário." })
  }

  const companies = Array.isArray(owner?.metadata?.companies) ? owner.metadata.companies : []
  const idx = companies.findIndex((c) => c.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: "Company not found" })
  }

  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const targetId = await findCustomerIdByEmail(req.scope, String(email).toLowerCase(), logger)
  if (!targetId) {
    return res.status(404).json({ message: "Usuário destino não encontrado." })
  }

  const targetCustomer = await fetchCustomerByEmail(req.scope, String(email).toLowerCase())
  if (!targetCustomer) {
    return res.status(404).json({ message: "Usuário destino não encontrado." })
  }

  const targetCompanies = Array.isArray(targetCustomer?.metadata?.companies)
    ? targetCustomer.metadata.companies
    : []

  const company = companies[idx]
  const alreadyAssigned = targetCompanies.some(
    (c) => c.id === company.id || c.cnpj?.replace(/\D/g, "") === String(company.cnpj).replace(/\D/g, "")
  )
  if (alreadyAssigned) {
    return res.status(409).json({ message: "Este condomínio já está vinculado ao usuário destino." })
  }

  const transfer = {
    from_customer_id: owner.id,
    from_email: owner.email || null,
    to_email: String(email).toLowerCase(),
    start_date: start_date || null,
    end_date: end_date || null,
    permanent: Boolean(permanent && !end_date),
    created_at: new Date().toISOString(),
  }

  const delegatedCompany = {
    ...company,
    delegated: true,
    transfer,
    metadata: {
      ...(company.metadata || {}),
      transfer,
    },
  }

  const nextTargetMetadata = {
    ...(targetCustomer.metadata || {}),
    companies: [...targetCompanies, delegatedCompany],
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: targetCustomer.id },
      update: { metadata: nextTargetMetadata },
    },
  })

  if (transfer.permanent) {
    const nextCompanies = companies.filter((c) => c.id !== company.id)
    const nextOwnerMetadata = {
      ...(owner.metadata || {}),
      companies: nextCompanies,
    }
    await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: owner.id },
        update: { metadata: nextOwnerMetadata },
      },
    })
  }

  return res.status(200).json({
    company: delegatedCompany,
    transfer,
  })
}

module.exports = { POST }
