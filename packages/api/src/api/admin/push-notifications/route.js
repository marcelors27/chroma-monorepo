const crypto = require("crypto")
const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapPushNotificationRow } = require("../../../utils/push-notifications")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const parsePagination = (query) => {
  const limit = clamp(Number(query?.limit) || 50, 1, 200)
  const offset = clamp(Number(query?.offset) || 0, 0, 10000)
  return { limit, offset }
}

const parseDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const normalizeTarget = (target = {}) => {
  const type = target.type || "all"
  if (!["all", "companies", "users"].includes(type)) {
    return { error: "target.type invalido" }
  }
  const companyIds = Array.isArray(target.company_ids) ? target.company_ids.filter(Boolean) : []
  const userIds = Array.isArray(target.user_ids) ? target.user_ids.filter(Boolean) : []
  if (type === "companies" && companyIds.length === 0) {
    return { error: "Informe company_ids para target companies" }
  }
  if (type === "users" && userIds.length === 0) {
    return { error: "Informe user_ids para target users" }
  }
  return { type, companyIds, userIds }
}

const GET = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { limit, offset } = parsePagination(req.query)

  const rows = await db("push_notifications")
    .select(
      "id",
      "title",
      "message",
      "target_type",
      "target_company_ids",
      "target_user_ids",
      "send_at",
      "status",
      "last_error",
      "sent_at",
      "created_at",
      "updated_at"
    )
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset)

  res.json({ notifications: rows.map(mapPushNotificationRow) })
}

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const payload = req.body || {}

  if (!payload.title || !payload.message) {
    return res.status(400).json({ message: "title e message sao obrigatorios" })
  }

  const target = normalizeTarget(payload.target)
  if (target.error) {
    return res.status(400).json({ message: target.error })
  }

  const now = new Date()
  const sendAt = parseDate(payload.send_at)
  const status = sendAt && sendAt > now ? "scheduled" : "queued"
  const id = payload.id || (crypto.randomUUID ? crypto.randomUUID() : `push-${Date.now()}`)

  const data = {
    id,
    title: payload.title,
    message: payload.message,
    target_type: target.type,
    target_company_ids:
      target.type === "companies" ? JSON.stringify(target.companyIds) : null,
    target_user_ids: target.type === "users" ? JSON.stringify(target.userIds) : null,
    send_at: sendAt,
    status,
    last_error: null,
    sent_at: null,
    created_at: now,
    updated_at: now,
  }

  await db("push_notifications").insert(data)

  const row = await db("push_notifications")
    .select(
      "id",
      "title",
      "message",
      "target_type",
      "target_company_ids",
      "target_user_ids",
      "send_at",
      "status",
      "last_error",
      "sent_at",
      "created_at",
      "updated_at"
    )
    .where({ id })
    .first()

  return res.status(201).json({ notification: mapPushNotificationRow(row) })
}

module.exports = { GET, POST }
