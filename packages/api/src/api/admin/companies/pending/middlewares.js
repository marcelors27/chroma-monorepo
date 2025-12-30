const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["GET"],
    matcher: "/admin/companies/pending",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
