const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapMarketingBannerRow } = require("../../../utils/marketing-banners")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 20, 1, 100)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

const nowTimestamp = () => new Date().toISOString()

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)
  const now = nowTimestamp()

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
    .where({ is_active: true })
    .andWhere((qb) => {
      qb.whereNull("active_from").orWhere("active_from", "<=", now)
    })
    .andWhere((qb) => {
      qb.whereNull("active_until").orWhere("active_until", ">=", now)
    })
    .orderBy([{ column: "sort_order", order: "desc" }, { column: "created_at", order: "desc" }])
    .limit(limit)
    .offset(offset)

  res.json({ banners: rows.map(mapMarketingBannerRow) })
}

module.exports = { GET }
