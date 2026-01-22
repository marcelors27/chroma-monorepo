const { ContainerRegistrationKeys, MedusaError } = require("@medusajs/framework/utils")

const DELETE = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params

  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "id is required")
  }

  const existing = await db("news").select("id").where({ id }).first()
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Noticia nao encontrada")
  }

  await db("news").where({ id }).delete()

  res.status(200).json({ id, object: "news", deleted: true })
}

module.exports = { DELETE }
