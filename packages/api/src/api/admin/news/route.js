const crypto = require("crypto")
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapNewsRow } = require("../../../utils/news")

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
  if (!value) return new Date()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return parsed
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
    .orderBy("published_at", "desc")
    .limit(limit)
    .offset(offset)

  res.json({ news: rows.map(mapNewsRow) })
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const payload = req.body || {}

  if (!payload.title || !payload.summary || !payload.content) {
    return res.status(400).json({ message: "title, summary e content sao obrigatorios" })
  }

  const now = new Date()
  const id = payload.id || (crypto.randomUUID ? crypto.randomUUID() : `news-${Date.now()}`)
  const publishedAt = parseDate(payload.published_at)
  const isPublished = parseBoolean(payload.is_published, true)
  const readTimeValue = payload.read_time ? Number(payload.read_time) : null
  const readTime = Number.isFinite(readTimeValue) ? readTimeValue : null

  const data = {
    id,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    category: payload.category || null,
    image_url: payload.image_url || null,
    author: payload.author || null,
    source: payload.source || payload.author || null,
    read_time: readTime,
    published_at: publishedAt,
    is_published: isPublished,
    created_at: now,
    updated_at: now,
  }

  await db("news").insert(data)

  const row = await db("news")
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
    .where({ id })
    .first()

  return res.status(201).json({ news: mapNewsRow(row) })
}

module.exports = { GET, POST }
