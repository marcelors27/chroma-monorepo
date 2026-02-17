const crypto = require("crypto")
const { ContainerRegistrationKeys, MedusaError } = require("@medusajs/framework/utils")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 100, 1, 300)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

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

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)

  const rows = await db("manufacturers")
    .select("id", "name", "slug", "image_url", "is_active", "sort_order", "created_at", "updated_at")
    .orderBy([{ column: "sort_order", order: "desc" }, { column: "name", order: "asc" }])
    .limit(limit)
    .offset(offset)

  res.json({ manufacturers: rows })
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body || {}
  const name = String(body.name || "").trim()
  const slug = slugify(body.slug || name)

  if (!name) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "name é obrigatório")
  }
  if (!slug) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug inválido")
  }

  const exists = await db("manufacturers").select("id").where({ slug }).first()
  if (exists) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug já cadastrado")
  }

  const sortOrderValue = Number(body.sort_order)
  const sortOrder = Number.isFinite(sortOrderValue) ? sortOrderValue : 0
  const now = new Date()
  const id =
    body.id || (crypto.randomUUID ? crypto.randomUUID() : `manufacturer-${Date.now()}`)
  const payload = {
    id,
    name,
    slug,
    image_url: body.image_url || null,
    is_active: parseBoolean(body.is_active, true),
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  }

  await db("manufacturers").insert(payload)
  res.status(201).json({ manufacturer: payload })
}

module.exports = { GET, POST }
