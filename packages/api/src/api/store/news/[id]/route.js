const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapNewsRow } = require("../../../../utils/news")

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = req.params?.id

  if (!id) {
    return res.status(400).json({ message: "Missing news id" })
  }

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
    .where({ id, is_published: true })
    .first()

  if (!row) {
    return res.status(404).json({ message: "Noticia nao encontrada" })
  }

  return res.json({ news: mapNewsRow(row) })
}

module.exports = { GET }
