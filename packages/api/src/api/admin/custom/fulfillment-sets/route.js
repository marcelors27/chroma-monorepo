const pickHeaders = (headers) => {
  const next = {}
  if (headers.authorization) next.authorization = headers.authorization
  if (headers.accept) next.accept = headers.accept
  if (headers["content-type"]) next["content-type"] = headers["content-type"]
  return next
}

const buildUrl = (req, path) => {
  const base = process.env.MEDUSA_URL || "http://localhost:9000"
  const query = req?._parsedUrl?.search || ""
  return `${base}${path}${query}`
}

const GET = async (req, res) => {
  const url = buildUrl(req, "/admin/fulfillment-sets")
  const response = await fetch(url, {
    method: "GET",
    headers: pickHeaders(req.headers || {}),
  })
  const text = await response.text()
  res.status(response.status).send(text)
}

const POST = async (req, res) => {
  const url = buildUrl(req, "/admin/fulfillment-sets")
  const response = await fetch(url, {
    method: "POST",
    headers: pickHeaders(req.headers || {}),
    body: JSON.stringify(req.body || {}),
  })
  const text = await response.text()
  res.status(response.status).send(text)
}

module.exports = { GET, POST }

