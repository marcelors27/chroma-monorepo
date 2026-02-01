const { authenticate } = require("@medusajs/framework/http")

module.exports = [
  {
    method: ["GET", "POST"],
    matcher: "/admin/custom/service-zones",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/custom/service-zones/:id",
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
]
