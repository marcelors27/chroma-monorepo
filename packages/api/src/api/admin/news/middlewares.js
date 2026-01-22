const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["GET", "POST"],
    matcher: "/admin/news",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/news/:id",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
