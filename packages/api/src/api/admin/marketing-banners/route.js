const crypto = require("crypto")
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapMarketingBannerRow } = require("../../../utils/marketing-banners")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 50, 1, 200)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase())
  }
  return Boolean(value)
}

const parseDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const hasMedia = (payload) =>
  Boolean(
    payload.image_url ||
      payload.image_mobile_url ||
      payload.animation_url ||
      payload.animation_mobile_url
  )

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)

  const rows = await db("marketing_banners")
    .select(
      "id",
      "title",
      "subtitle",
      "image_url",
      "image_mobile_url",
      "animation_url",
      "animation_mobile_url",
      "link_type",
      "link_value",
      "sort_order",
      "active_from",
      "active_until",
      "is_active",
      "created_at",
      "updated_at"
    )
    .orderBy([{ column: "sort_order", order: "desc" }, { column: "created_at", order: "desc" }])
    .limit(limit)
    .offset(offset)

  res.json({ banners: rows.map(mapMarketingBannerRow) })
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const payload = req.body || {}

  if (!payload.title) {
    return res.status(400).json({ message: "title e obrigatorio" })
  }
  if (!hasMedia(payload)) {
    return res.status(400).json({ message: "Informe ao menos uma imagem ou animacao." })
  }

  const now = new Date()
  const id = payload.id || (crypto.randomUUID ? crypto.randomUUID() : `banner-${Date.now()}`)
  const isActive = parseBoolean(payload.is_active, true)
  const activeFrom = parseDate(payload.active_from)
  const activeUntil = parseDate(payload.active_until)
  const sortOrderValue = Number(payload.sort_order)
  const sortOrder = Number.isFinite(sortOrderValue) ? sortOrderValue : 0

  const data = {
    id,
    title: payload.title,
    subtitle: payload.subtitle || null,
    image_url: payload.image_url || null,
    image_mobile_url: payload.image_mobile_url || null,
    animation_url: payload.animation_url || null,
    animation_mobile_url: payload.animation_mobile_url || null,
    link_type: payload.link_type || null,
    link_value: payload.link_value || null,
    sort_order: sortOrder,
    active_from: activeFrom,
    active_until: activeUntil,
    is_active: isActive,
    created_at: now,
    updated_at: now,
  }

  await db("marketing_banners").insert(data)

  const row = await db("marketing_banners")
    .select(
      "id",
      "title",
      "subtitle",
      "image_url",
      "image_mobile_url",
      "animation_url",
      "animation_mobile_url",
      "link_type",
      "link_value",
      "sort_order",
      "active_from",
      "active_until",
      "is_active",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .first()

  return res.status(201).json({ banner: mapMarketingBannerRow(row) })
}

module.exports = { GET, POST }
