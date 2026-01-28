const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.body?.id
  if (!id) {
    return res.status(400).json({ message: "id obrigatorio" })
  }

  const now = new Date()
  const updated = await db("push_notifications")
    .where({ id })
    .update({
      status: "queued",
      sent_at: null,
      last_error: null,
      updated_at: now,
    })

  if (!updated) {
    return res.status(404).json({ message: "Notificação não encontrada" })
  }

  return res.json({ id, status: "queued" })
}

module.exports = { POST }
