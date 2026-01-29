const crypto = require("crypto")
const { Modules, ContainerRegistrationKeys, remoteQueryObjectFromString } = require("@medusajs/framework/utils")
const { sendPasswordResetEmail } = require("../../../../../services/email-template-sender")

const generatePassword = () => {
  const length = 12
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join("")
}

const fetchCustomerById = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email", "first_name", "last_name"],
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

const isEmail = (value) => typeof value === "string" && value.includes("@")

const POST = async (req, res) => {
  const customerId = req.params.id
  const password = generatePassword()

  const customer = await fetchCustomerById(req.scope, customerId)
  let email = customer?.email || null
  let name =
    customer?.first_name || customer?.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : null

  if (!email) {
    const authIdentityService = getAuthIdentityService(req.scope)
    if (authIdentityService?.retrieve) {
      try {
        const identity = await authIdentityService.retrieve(customerId)
        email =
          (isEmail(identity?.entity_id) && identity.entity_id) ||
          (isEmail(identity?.user_metadata?.email) && identity.user_metadata.email) ||
          (isEmail(identity?.app_metadata?.email) && identity.app_metadata.email) ||
          null
        name =
          identity?.user_metadata?.name ||
          `${identity?.user_metadata?.given_name || ""} ${
            identity?.user_metadata?.family_name || ""
          }`.trim() ||
          name
      } catch {}
    }
  }

  if (!email) {
    return res.status(404).json({ message: "Usuário não encontrado" })
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (!updated?.success) {
    return res.status(400).json({ message: updated?.error || "Não foi possível resetar a senha" })
  }

  await sendPasswordResetEmail({
    to: customer.email,
    name,
    password,
    logger: req.scope?.resolve ? req.scope.resolve("logger") : console,
  })

  return res.json({ ok: true })
}

module.exports = { POST }
