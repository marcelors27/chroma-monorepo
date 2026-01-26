const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapMarketingBannerRow } = require("../../../../utils/marketing-banners")

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

const PATCH = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing banner id" })

  const existing = await db("marketing_banners").select("id").where({ id }).first()
  if (!existing) return res.status(404).json({ message: "Banner nao encontrado" })

  const payload = req.body || {}
  const updates = {
    updated_at: new Date(),
  }

  if (payload.title !== undefined) updates.title = payload.title
  if (payload.subtitle !== undefined) updates.subtitle = payload.subtitle || null
  if (payload.image_url !== undefined) updates.image_url = payload.image_url || null
  if (payload.image_mobile_url !== undefined) updates.image_mobile_url = payload.image_mobile_url || null
  if (payload.animation_url !== undefined) updates.animation_url = payload.animation_url || null
  if (payload.animation_mobile_url !== undefined)
    updates.animation_mobile_url = payload.animation_mobile_url || null
  if (payload.link_type !== undefined) updates.link_type = payload.link_type || null
  if (payload.link_value !== undefined) updates.link_value = payload.link_value || null
  if (payload.sort_order !== undefined) {
    const sortOrderValue = Number(payload.sort_order)
    updates.sort_order = Number.isFinite(sortOrderValue) ? sortOrderValue : 0
  }
  if (payload.active_from !== undefined) updates.active_from = parseDate(payload.active_from)
  if (payload.active_until !== undefined) updates.active_until = parseDate(payload.active_until)
  if (payload.is_active !== undefined) updates.is_active = parseBoolean(payload.is_active, true)

  await db("marketing_banners").where({ id }).update(updates)

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

  return res.json({ banner: mapMarketingBannerRow(row) })
}

const DELETE = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing banner id" })

  const existing = await db("marketing_banners").select("id").where({ id }).first()
  if (!existing) return res.status(404).json({ message: "Banner nao encontrado" })

  await db("marketing_banners").where({ id }).delete()
  res.status(200).json({ id, object: "marketing_banner", deleted: true })
}

module.exports = { PATCH, DELETE }
