const crypto = require("crypto")
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const normalizeProvider = (value) => {
  if (!value) return null
  const provider = String(value).toLowerCase()
  if (!["fcm", "apns", "webpush", "expo"].includes(provider)) return null
  return provider
}

const normalizePlatform = (value) => {
  if (!value) return null
  const platform = String(value).toLowerCase()
  if (!["ios", "android", "web"].includes(platform)) return null
  return platform
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const customerId =
    req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const payload = req.body || {}
  const provider = normalizeProvider(payload.provider)
  const platform = normalizePlatform(payload.platform)
  const token = payload.token || null
  const subscription = payload.subscription || null

  if (!provider || !platform) {
    return res.status(400).json({ message: "provider e platform sao obrigatorios" })
  }
  if (provider === "webpush" && !subscription) {
    return res.status(400).json({ message: "subscription obrigatoria para webpush" })
  }
  if (provider !== "webpush" && !token) {
    return res.status(400).json({ message: "token obrigatorio" })
  }

  const now = new Date()
  const deviceId = payload.device_id || null
  const companyId = payload.company_id || null

  let existing = null
  if (token) {
    existing = await db("push_device_tokens")
      .select("id")
      .where({ provider, token })
      .first()
  }

  const data = {
    customer_id: customerId,
    company_id: companyId,
    provider,
    platform,
    token,
    subscription,
    device_id: deviceId,
    last_seen_at: now,
    disabled_at: null,
    updated_at: now,
  }

  if (deviceId) {
    await db("push_device_tokens")
      .where({
        customer_id: customerId,
        provider,
        device_id: deviceId,
      })
      .andWhere("token", "<>", token)
      .whereNull("disabled_at")
      .update({ disabled_at: now, updated_at: now })
  }

  if (existing?.id) {
    await db("push_device_tokens").where({ id: existing.id }).update(data)
    return res.json({ id: existing.id, status: "updated" })
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : `push-token-${Date.now()}`
  await db("push_device_tokens").insert({
    id,
    ...data,
    created_at: now,
  })

  return res.status(201).json({ id, status: "created" })
}

const DELETE = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const customerId =
    req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const payload = req.body || {}
  const provider = normalizeProvider(payload.provider)
  const token = payload.token || null
  const now = new Date()

  if (!provider || !token) {
    return res.status(400).json({ message: "provider e token sao obrigatorios" })
  }

  await db("push_device_tokens")
    .where({ provider, token, customer_id: customerId })
    .update({ disabled_at: now, updated_at: now })

  return res.json({ status: "disabled" })
}

module.exports = { POST, DELETE }
