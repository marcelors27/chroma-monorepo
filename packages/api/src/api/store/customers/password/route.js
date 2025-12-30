const { Modules } = require("@medusajs/framework/utils")

const POST = async (req, res) => {
  const authModule = req.scope.resolve(Modules.AUTH)
  const authIdentityId = req.auth_context?.auth_identity_id
  const body = req.body || {}
  const oldPassword = body.old_password || body.current_password
  const newPassword = body.password || body.new_password

  if (!authIdentityId) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Campos obrigatórios: senha atual e nova senha" })
  }

  const identities = await authModule.listProviderIdentities(
    { auth_identity_id: authIdentityId },
    { select: ["entity_id"] }
  )
  const email = identities?.[0]?.entity_id
  if (!email) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const authCheck = await authModule.authenticate("emailpass", {
    body: { email, password: oldPassword },
  })
  if (!authCheck?.success) {
    return res.status(401).json({ message: "Senha atual inválida" })
  }

  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: newPassword,
  })

  if (!updated?.success) {
    return res.status(400).json({ message: updated?.error || "Não foi possível atualizar a senha" })
  }

  return res.json({ ok: true })
}

module.exports = { POST }
