const {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { deleteCustomersWorkflow } = require("@medusajs/core-flows")

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

const fetchCustomerById = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0] || null
}

const listAuthIdentitiesByCustomerId = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queries = [
    remoteQueryObjectFromString({
      entryPoint: "auth_identity",
      variables: { filters: { app_metadata: { customer_id: customerId } } },
      fields: ["id"],
    }),
    remoteQueryObjectFromString({
      entryPoint: "auth_identity",
      variables: { filters: { user_metadata: { customer_id: customerId } } },
      fields: ["id"],
    }),
  ]
  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        return await remoteQuery(query)
      } catch {
        return []
      }
    })
  )
  const all = results.flat().filter(Boolean)
  const unique = new Map(all.map((item) => [item.id, item]))
  return Array.from(unique.values())
}

const deleteAuthIdentityCascade = async (scope, authIdentityId) => {
  const { authIdentityService, providerIdentityService } = getAuthServices(scope)
  const deleted = { auth: 0, providers: 0 }

  if (providerIdentityService?.list && providerIdentityService?.delete) {
    const providers = await providerIdentityService.list({ auth_identity_id: authIdentityId })
    const providerIds = (providers || []).map((item) => item.id).filter(Boolean)
    if (providerIds.length) {
      await providerIdentityService.delete(providerIds)
      deleted.providers += providerIds.length
    }
  }

  if (authIdentityService?.delete) {
    await authIdentityService.delete([authIdentityId])
    deleted.auth += 1
  }

  return deleted
}

const DELETE = async (req, res) => {
  const userId = req.params.id

  if (!userId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "id is required")
  }

  const deleted = { customer: false, auth_identities: 0, provider_identities: 0 }

  const customer = await fetchCustomerById(req.scope, userId)
  if (customer?.id) {
    await deleteCustomersWorkflow(req.scope).run({
      input: { ids: [customer.id] },
    })
    deleted.customer = true

    const authIdentities = await listAuthIdentitiesByCustomerId(req.scope, customer.id)
    for (const identity of authIdentities) {
      const cascade = await deleteAuthIdentityCascade(req.scope, identity.id)
      deleted.auth_identities += cascade.auth
      deleted.provider_identities += cascade.providers
    }

    return res.status(200).json({ ok: true, deleted })
  }

  const { authIdentityService } = getAuthServices(req.scope)
  if (authIdentityService?.retrieve) {
    try {
      const identity = await authIdentityService.retrieve(userId)
      if (!identity?.id) {
        return res.status(404).json({ message: "Usuario nao encontrado" })
      }
      const cascade = await deleteAuthIdentityCascade(req.scope, identity.id)
      deleted.auth_identities += cascade.auth
      deleted.provider_identities += cascade.providers
      return res.status(200).json({ ok: true, deleted })
    } catch {
      return res.status(404).json({ message: "Usuario nao encontrado" })
    }
  }

  return res.status(404).json({ message: "Usuario nao encontrado" })
}

module.exports = { DELETE }
