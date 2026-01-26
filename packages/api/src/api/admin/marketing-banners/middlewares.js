const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["GET", "POST"],
    matcher: "/admin/marketing-banners",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["PATCH", "DELETE"],
    matcher: "/admin/marketing-banners/:id",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
