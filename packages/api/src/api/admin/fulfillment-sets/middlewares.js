const ALLOW_HEADERS =
  "Content-Type, Authorization, X-Publishable-Api-Key, X-Medusa-Sales-Channel-Id, X-Company-Id, X-Company, Accept"

const applyCors = (req, res) => {
  const origin = req.headers.origin || "*"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Headers", ALLOW_HEADERS)
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
}

const preflight = (req, res) => {
  applyCors(req, res)
  return res.sendStatus(204)
}

module.exports = [
  {
    method: ["OPTIONS"],
    matcher: ["/admin/fulfillment-sets", "/admin/fulfillment-sets/*"],
    middlewares: [preflight],
  },
]
