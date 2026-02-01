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

const DELETE = async (req, res) => {
  const url = buildUrl(req, `/admin/service-zones/${req.params.id}`)
  const response = await fetch(url, {
    method: "DELETE",
    headers: pickHeaders(req.headers || {}),
  })
  const text = await response.text()
  res.status(response.status).send(text)
}

module.exports = { DELETE }

