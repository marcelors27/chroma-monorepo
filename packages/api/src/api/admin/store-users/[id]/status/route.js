const { Modules, ContainerRegistrationKeys, remoteQueryObjectFromString } = require("@medusajs/framework/utils")

const fetchCustomerById = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "metadata"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

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

const POST = async (req, res) => {
  const userId = req.params.id
  const disabled = Boolean(req.body?.disabled)

  const customer = await fetchCustomerById(req.scope, userId)
  if (customer?.id) {
    const { updateCustomersWorkflow } = require("@medusajs/core-flows")
    await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: customer.id },
        update: { metadata: { ...(customer.metadata || {}), disabled } },
      },
    })
    return res.json({ ok: true, source: "customer", disabled })
  }

  const authIdentityService = getAuthIdentityService(req.scope)
  if (authIdentityService?.update) {
    const identity = await authIdentityService.retrieve(userId)
    if (!identity) {
      return res.status(404).json({ message: "Usuario nao encontrado" })
    }
    const nextAppMetadata = { ...(identity.app_metadata || {}), disabled }
    await authIdentityService.update({ id: identity.id, app_metadata: nextAppMetadata })
    return res.json({ ok: true, source: "identity", disabled })
  }

  return res.status(404).json({ message: "Usuario nao encontrado" })
}

module.exports = { POST }
