const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["GET", "POST"],
    matcher: "/admin/manufacturers",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["PATCH", "DELETE"],
    matcher: "/admin/manufacturers/:id",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
