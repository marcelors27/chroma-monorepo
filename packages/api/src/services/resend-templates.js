const RESEND_API = "https://api.resend.com"

const ensureConfig = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ausente")
  }
  return apiKey
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const resendRequest = async (path, options = {}) => {
  const apiKey = ensureConfig()
  const maxRetries = Number.isFinite(options.retries) ? options.retries : 2

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(`${RESEND_API}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after")) || 1
      await sleep(retryAfter * 1000)
      continue
    }

    if (!response.ok) {
      const message = await response.text()
      const error = new Error(message || "Resend request failed")
      error.status = response.status
      throw error
    }

    return response.json()
  }
}

const listTemplates = async ({ limit, after, before } = {}) => {
  const params = new URLSearchParams()
  const safeLimit = limit ? Math.min(Math.max(Number(limit), 1), 100) : undefined
  if (safeLimit) params.set("limit", String(safeLimit))
  if (after) params.set("after", String(after))
  if (before) params.set("before", String(before))
  const query = params.toString()
  return resendRequest(`/templates${query ? `?${query}` : ""}`)
}

const getTemplate = async (id) => {
  return resendRequest(`/templates/${id}`)
}

const createTemplate = async (payload) => {
  return resendRequest("/templates", { method: "POST", body: payload })
}

const updateTemplate = async (id, payload) => {
  return resendRequest(`/templates/${id}`, { method: "PATCH", body: payload })
}

const deleteTemplate = async (id) => {
  return resendRequest(`/templates/${id}`, { method: "DELETE" })
}

const publishTemplate = async (id) => {
  return resendRequest(`/templates/${id}/publish`, { method: "POST" })
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
}
