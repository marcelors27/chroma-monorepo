const crypto = require("crypto")
const {
  Modules,
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { sendPasswordResetEmail } = require("../../../../services/email-template-sender")

const generatePassword = () => {
  const length = 12
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join("")
}

const fetchCustomerByEmail = async (scope, email) => {
  if (!email) return null
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { email }, limit: 1 },
    fields: ["id", "email", "first_name", "last_name"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0] || null
}

const POST = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const email = req.body?.email || req.body?.username

  if (!email) {
    return res.status(400).json({ message: "Email obrigatório" })
  }

  const customer = await fetchCustomerByEmail(req.scope, email)
  if (!customer) {
    return res.json({ ok: true })
  }

  const password = generatePassword()
  const authModule = req.scope.resolve(Modules.AUTH)
  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (!updated?.success) {
    return res.status(400).json({ message: updated?.error || "Não foi possível resetar a senha" })
  }

  const name =
    customer?.first_name || customer?.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : email

  await sendPasswordResetEmail({
    to: customer.email,
    name,
    password,
    logger,
  })

  return res.json({ ok: true })
}

module.exports = { POST }
