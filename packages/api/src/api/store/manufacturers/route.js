const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 100, 1, 300)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)

  const rows = await db("manufacturers")
    .select("id", "name", "slug", "image_url", "is_active", "sort_order")
    .where({ is_active: true })
    .orderBy([{ column: "sort_order", order: "desc" }, { column: "name", order: "asc" }])
    .limit(limit)
    .offset(offset)

  res.json({ manufacturers: rows })
}

module.exports = { GET }
