const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapNewsRow } = require("../../../utils/news")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 20, 1, 100)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)

  const rows = await db("news")
    .select(
      "id",
      "title",
      "summary",
      "content",
      "category",
      "image_url",
      "author",
      "source",
      "read_time",
      "published_at",
      "is_published",
      "created_at",
      "updated_at"
    )
    .where({ is_published: true })
    .orderBy("published_at", "desc")
    .limit(limit)
    .offset(offset)

  res.json({ news: rows.map(mapNewsRow) })
}

module.exports = { GET }
