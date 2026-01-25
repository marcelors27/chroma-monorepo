const { Modules, remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const fetchCustomers = async (scope, limit) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: {},
      order: { created_at: "DESC" },
      limit,
    },
    fields: ["id", "email", "first_name", "last_name", "phone", "metadata", "created_at"],
  })
  return await remoteQuery(query)
}

const isEmail = (value) => typeof value === "string" && value.includes("@")

const getAuthIdentityService = (scope) => {
  try {
    return scope.resolve("authIdentityService")
  } catch {}
  try {
    const authModule = scope.resolve(Modules.AUTH)
    return authModule?.authIdentityService_ || authModule?.authIdentityService
  } catch {}
  return null
}

const listAuthIdentities = async (scope, limit) => {
  const authIdentityService = getAuthIdentityService(scope)
  if (!authIdentityService?.list) return []
  try {
    return await authIdentityService.list(
      {},
      { select: ["id", "entity_id", "user_metadata", "app_metadata", "created_at"], take: limit }
    )
  } catch (error) {
    try {
      return await authIdentityService.list({})
    } catch {
      return []
    }
  }
}

const GET = async (req, res) => {
  const limit = Math.min(Number(req.query?.limit) || 500, 500)
  const customers = await fetchCustomers(req.scope, limit)

  const users = customers.map((customer) => ({
    ...customer,
    companies: Array.isArray(customer.metadata?.companies) ? customer.metadata.companies : [],
    disabled: Boolean(customer?.metadata?.disabled),
    source: "customer",
  }))

  const customerByEmail = new Map(
    users
      .filter((user) => isEmail(user.email))
      .map((user) => [String(user.email).toLowerCase(), user])
  )

  const identities = await listAuthIdentities(req.scope, limit)
  identities.forEach((identity) => {
    const email =
      (isEmail(identity?.entity_id) && identity.entity_id) ||
      (isEmail(identity?.user_metadata?.email) && identity.user_metadata.email) ||
      (isEmail(identity?.app_metadata?.email) && identity.app_metadata.email) ||
      null
    if (!email) return
    const normalized = String(email).toLowerCase()
    if (customerByEmail.has(normalized)) return
    const firstName =
      identity?.user_metadata?.given_name ||
      identity?.user_metadata?.first_name ||
      identity?.user_metadata?.name ||
      null
    const lastName =
      identity?.user_metadata?.family_name || identity?.user_metadata?.last_name || null
    users.push({
      id: identity.id,
      email: normalized,
      first_name: firstName,
      last_name: lastName,
      phone: identity?.user_metadata?.phone || null,
      created_at: identity?.created_at || null,
      metadata: identity?.user_metadata || {},
      disabled: Boolean(identity?.app_metadata?.disabled || identity?.user_metadata?.disabled),
      companies: [],
      source: "identity",
      auth_identity_id: identity.id,
    })
  })

  res.json({ users })
}

module.exports = { GET }
