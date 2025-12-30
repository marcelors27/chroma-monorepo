const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["POST"],
    matcher: "/admin/companies/:id/approve",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
