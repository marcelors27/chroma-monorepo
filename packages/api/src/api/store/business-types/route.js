const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")

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
    .where({ is_active: true })
    .orderBy("label", "asc")
  res.json({ business_types: businessTypes })
}

module.exports = { GET }
