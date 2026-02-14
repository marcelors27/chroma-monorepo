const { ContainerRegistrationKeys, MedusaError } = require("@medusajs/framework/utils")
const crypto = require("crypto")

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const businessTypes = await db("business_types")
    .select(
      "id",
      "key",
      "label",
      "label_plural",
      "article_singular",
      "article_plural",
      "terms",
      "is_active",
      "created_at",
      "updated_at"
    )
    .orderBy("label", "asc")
  res.json({ business_types: businessTypes })
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body || {}
  const label = body.label
  const labelPlural = body.label_plural || body.labelPlural
  const key = body.key || slugify(label)
  let terms = body.terms

  if (!label || !labelPlural || !key) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "label, label_plural e key são obrigatórios")
  }
  if (typeof terms === "string") {
    try {
      terms = JSON.parse(terms)
    } catch {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "terms deve ser um JSON válido")
    }
  }
  if (terms && typeof terms !== "object") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "terms deve ser um objeto JSON")
  }

  const existing = await db("business_types").select("id").where({ key }).first()
  if (existing) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "key já cadastrado")
  }

  const id = body.id || `bt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
  const payload = {
    id,
    key,
    label,
    label_plural: labelPlural,
    article_singular: body.article_singular || body.articleSingular || null,
    article_plural: body.article_plural || body.articlePlural || null,
    terms: terms || {},
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    created_at: new Date(),
    updated_at: new Date(),
  }

  await db("business_types").insert(payload)
  res.status(201).json({ business_type: payload })
}

module.exports = { GET, POST }
