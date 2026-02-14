const { ContainerRegistrationKeys, MedusaError } = require("@medusajs/framework/utils")

const PATCH = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const body = req.body || {}
  let terms = body.terms

  const existing = await db("business_types").select("id").where({ id }).first()
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Tipo de negócio não encontrado")
  }

  if (typeof terms === "string") {
    try {
      terms = JSON.parse(terms)
    } catch {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "terms deve ser um JSON válido")
    }
  }
  if (terms !== undefined && terms !== null && typeof terms !== "object") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "terms deve ser um objeto JSON")
  }

  const update = {
    ...(body.key ? { key: body.key } : {}),
    ...(body.label ? { label: body.label } : {}),
    ...(body.label_plural || body.labelPlural
      ? { label_plural: body.label_plural || body.labelPlural }
      : {}),
    ...(body.article_singular || body.articleSingular
      ? { article_singular: body.article_singular || body.articleSingular }
      : {}),
    ...(body.article_plural || body.articlePlural
      ? { article_plural: body.article_plural || body.articlePlural }
      : {}),
    ...(terms !== undefined ? { terms: terms || {} } : {}),
    ...(typeof body.is_active === "boolean" ? { is_active: body.is_active } : {}),
    updated_at: new Date(),
  }

  if (Object.keys(update).length === 1) {
    return res.status(200).json({ id, updated: false })
  }

  await db("business_types").where({ id }).update(update)
  res.status(200).json({ id, updated: true })
}

const DELETE = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const existing = await db("business_types").select("id").where({ id }).first()
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Tipo de negócio não encontrado")
  }
  await db("business_types").where({ id }).delete()
  res.status(200).json({ id, deleted: true })
}

module.exports = { PATCH, DELETE }
