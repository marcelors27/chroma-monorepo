const { ContainerRegistrationKeys, MedusaError } = require("@medusajs/framework/utils")

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase())
  return Boolean(value)
}

const PATCH = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params?.id
  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "id é obrigatório")
  }

  const existing = await db("manufacturers").select("id", "slug").where({ id }).first()
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Fabricante não encontrado")
  }

  const body = req.body || {}
  const updates = { updated_at: new Date() }

  if (body.name !== undefined) {
    const name = String(body.name || "").trim()
    if (!name) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "name inválido")
    }
    updates.name = name
  }
  if (body.slug !== undefined) {
    const slug = slugify(body.slug)
    if (!slug) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug inválido")
    }
    const slugOwner = await db("manufacturers").select("id").where({ slug }).first()
    if (slugOwner && slugOwner.id !== id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug já cadastrado")
    }
    updates.slug = slug
  }
  if (body.image_url !== undefined) updates.image_url = body.image_url || null
  if (body.is_active !== undefined) updates.is_active = parseBoolean(body.is_active, true)
  if (body.sort_order !== undefined) {
    const parsed = Number(body.sort_order)
    updates.sort_order = Number.isFinite(parsed) ? parsed : 0
  }

  await db("manufacturers").where({ id }).update(updates)
  const manufacturer = await db("manufacturers")
    .select("id", "name", "slug", "image_url", "is_active", "sort_order", "created_at", "updated_at")
    .where({ id })
    .first()

  res.json({ manufacturer })
}

const DELETE = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params?.id
  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "id é obrigatório")
  }

  const existing = await db("manufacturers").select("id").where({ id }).first()
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Fabricante não encontrado")
  }

  await db("manufacturers").where({ id }).delete()
  res.status(200).json({ id, object: "manufacturer", deleted: true })
}

module.exports = { PATCH, DELETE }
