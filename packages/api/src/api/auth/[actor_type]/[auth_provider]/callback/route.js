const jwt = require("jsonwebtoken")
const {
  ContainerRegistrationKeys,
  Modules,
  MedusaError,
  generateJwtToken,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow } = require("@medusajs/core-flows")

const isEmail = (value) => typeof value === "string" && value.includes("@")
const maskEmail = (value) => {
  if (!isEmail(value)) return value || null
  const [user, domain] = value.split("@")
  const maskedUser = user.length <= 2 ? `${user[0] || ""}*` : `${user.slice(0, 2)}***`
  return `${maskedUser}@${domain}`
}
const readHeaderValue = (value) => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const extractEmailFromIdToken = (req) => {
  const token =
    req.body?.identity_token ||
    req.body?.id_token ||
    req.query?.identity_token ||
    req.query?.id_token
  if (!token) return null
  try {
    const decoded = jwt.decode(token, { complete: true })
    const payload = decoded?.payload || {}
    const email = payload?.email || null
    return isEmail(email) ? email : null
  } catch {
    return null
  }
}

const findCustomerIdByEmail = async (scope, email) => {
  if (!email) return null
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { email }, limit: 1 },
    fields: ["id"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]?.id || null
}

const resolveEmailFromIdentity = async (scope, authIdentity) => {
  if (!authIdentity) return null
  const entity = authIdentity?.entity_id
  if (isEmail(entity)) return entity
  const identityEmail =
    authIdentity?.user_metadata?.email || authIdentity?.app_metadata?.email
  if (isEmail(identityEmail)) return identityEmail
  try {
    const providerIdentityService = scope.resolve("providerIdentityService")
    const providers = await providerIdentityService.list({
      auth_identity_id: authIdentity.id,
    })
    const provider = providers?.[0]
    const providerEntity = provider?.entity_id
    if (isEmail(providerEntity)) return providerEntity
    const providerEmail = provider?.user_metadata?.email
    if (isEmail(providerEmail)) return providerEmail
  } catch {}
  return null
}

const ensureCustomerId = async (scope, authIdentityId, email) => {
  if (!email || !authIdentityId) return null
  const existing = await findCustomerIdByEmail(scope, email)
  if (existing) return existing
  const { result } = await createCustomerAccountWorkflow(scope).run({
    input: {
      authIdentityId,
      customerData: { email, approved: false, metadata: { approved: false } },
    },
  })
  return result?.id || null
}

const updateAuthIdentityMetadata = async (scope, authIdentity, customerId) => {
  if (!authIdentity?.id || !customerId) return authIdentity
  const appMetadata = {
    ...(authIdentity.app_metadata || {}),
    customer_id: customerId,
  }
  const updated = { ...authIdentity, app_metadata: appMetadata }
  try {
    const authIdentityService = scope.resolve("authIdentityService")
    await authIdentityService.update({ id: authIdentity.id, app_metadata: appMetadata })
  } catch {}
  return updated
}

const buildToken = (authIdentity, actorType, authProvider, httpConfig, actorIdOverride) => {
  const providerIdentity = authIdentity?.provider_identities?.find(
    (identity) => identity.provider === authProvider
  )
  const entityIdKey = `${actorType}_id`
  const actorId = actorIdOverride || authIdentity?.app_metadata?.[entityIdKey] || ""
  const appMetadata = {
    ...(authIdentity?.app_metadata || {}),
    [entityIdKey]: actorId,
  }

  return generateJwtToken(
    {
      actor_id: actorId,
      actor_type: actorType,
      auth_identity_id: authIdentity?.id || "",
      app_metadata: appMetadata,
      user_metadata: providerIdentity?.user_metadata || {},
    },
    {
      secret: httpConfig.jwtSecret,
      expiresIn: httpConfig.jwtExpiresIn ?? httpConfig.jwtOptions?.expiresIn,
      jwtOptions: httpConfig.jwtOptions,
    }
  )
}

const handle = async (req, res) => {
  const { actor_type, auth_provider } = req.params
  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const service = req.scope.resolve(Modules.AUTH)
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const linkExisting =
    req.body?.link_existing === true ||
    req.body?.linkExisting === true ||
    req.body?.link_existing === "true" ||
    req.body?.linkExisting === "true"
  const flow_id = readHeaderValue(req.headers?.["x-debug-flow-id"])
  const hasIdentityToken = !!(
    req.body?.identity_token ||
    req.body?.id_token ||
    req.query?.identity_token ||
    req.query?.id_token
  )
  const hasAuthorizationCode = !!(req.body?.authorization_code || req.body?.code || req.query?.code)
  const hasAccessToken = !!(req.body?.access_token || req.query?.access_token)
  const hasState = !!(req.body?.state || req.query?.state)
  const authData = {
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    protocol: req.protocol,
  }

  const { success, error, authIdentity } = await service.validateCallback(auth_provider, authData)
  if (!success || !authIdentity) {
    try {
      logger?.warn?.(
        JSON.stringify({
          msg: "auth callback validation failed",
          actor_type,
          auth_provider,
          flow_id,
          link_existing: linkExisting,
          has_identity_token: hasIdentityToken,
          has_authorization_code: hasAuthorizationCode,
          has_access_token: hasAccessToken,
          has_state: hasState,
          error: error || "Authentication failed",
        })
      )
    } catch {}
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, error || "Authentication failed")
  }
  try {
    logger?.info?.(
      JSON.stringify({
        msg: "auth callback validated",
        actor_type,
        auth_provider,
        flow_id,
        link_existing: linkExisting,
        has_identity_token: hasIdentityToken,
        has_authorization_code: hasAuthorizationCode,
        has_access_token: hasAccessToken,
        has_state: hasState,
        auth_identity_id: authIdentity?.id || null,
      })
    )
  } catch {}

  let effectiveIdentity = authIdentity
  let linkedCustomerId = null
  if (
    actor_type === "customer" &&
    (auth_provider === "apple" || auth_provider === "google" || auth_provider === "facebook")
  ) {
    const email =
      (await resolveEmailFromIdentity(req.scope, authIdentity)) ||
      extractEmailFromIdToken(req)
    const existingId = email ? await findCustomerIdByEmail(req.scope, email) : null
    try {
      logger?.info?.(
        JSON.stringify({
          msg: "auth callback resolve customer",
          actor_type,
          auth_provider,
          flow_id,
          link_existing: linkExisting,
          auth_identity_id: authIdentity?.id || null,
          email: maskEmail(email),
          existing_customer_id: existingId,
        })
      )
    } catch {}
    if (auth_provider === "apple" && existingId && !linkExisting) {
      try {
        logger?.info?.(
          JSON.stringify({
            msg: "auth callback link required",
            actor_type,
            auth_provider,
            flow_id,
            auth_identity_id: authIdentity?.id || null,
            email: maskEmail(email),
            existing_customer_id: existingId,
          })
        )
      } catch {}
      return res.status(409).json({
        message: "link_required",
        code: "link_required",
        email,
      })
    }
    const customerId =
      existingId || (await ensureCustomerId(req.scope, authIdentity.id, email))
    if (customerId) {
      linkedCustomerId = customerId
      effectiveIdentity = await updateAuthIdentityMetadata(req.scope, authIdentity, customerId)
      try {
        logger?.info?.(
          JSON.stringify({
            msg: "auth callback linked customer",
            actor_type,
            auth_provider,
            flow_id,
            auth_identity_id: authIdentity?.id || null,
            customer_id: customerId,
          })
        )
      } catch {}
    }
  }

  const token = buildToken(
    effectiveIdentity,
    actor_type,
    auth_provider,
    config.projectConfig.http || {},
    linkedCustomerId || effectiveIdentity?.app_metadata?.customer_id
  )
  try {
    logger?.info?.(
      JSON.stringify({
        msg: "auth callback token issued",
        actor_type,
        auth_provider,
        flow_id,
        actor_id: linkedCustomerId || effectiveIdentity?.app_metadata?.customer_id || "",
        link_existing: linkExisting,
        email_source: actor_type === "customer" && auth_provider === "apple" ? "resolved" : "n/a",
      })
    )
  } catch {}
  return res.json({ token })
}

const GET = async (req, res) => {
  await handle(req, res)
}

const POST = async (req, res) => {
  await handle(req, res)
}

module.exports = { GET, POST }
