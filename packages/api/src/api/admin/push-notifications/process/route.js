const { ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { mapPushNotificationRow } = require("../../../../utils/push-notifications")
const { sendFcm, sendApns, sendWebPush } = require("../../../../utils/push-sender")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const POST = async (req, res) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const limit = clamp(Number(req.body?.limit) || 50, 1, 200)
  const now = new Date()

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
      "sent_at",
      "created_at",
      "updated_at"
    )
    .whereIn("status", ["queued", "scheduled"])
    .andWhere((qb) => {
      qb.whereNull("send_at").orWhere("send_at", "<=", now)
    })
    .orderBy("created_at", "asc")
    .limit(limit)

  if (!rows.length) {
    return res.json({ processed: 0, notifications: [] })
  }

  const processedIds = []

  for (const notification of rows) {
    const targetType = notification.target_type
    const companyIds = notification.target_company_ids || []
    const userIds = notification.target_user_ids || []

    let tokensQuery = db("push_device_tokens")
      .select(
        "id",
        "provider",
        "token",
        "subscription",
        "platform",
        "customer_id",
        "company_id"
      )
      .whereNull("disabled_at")

    if (targetType === "companies") {
      tokensQuery = tokensQuery.whereIn("company_id", companyIds)
    } else if (targetType === "users") {
      tokensQuery = tokensQuery.whereIn("customer_id", userIds)
    }

    const tokens = await tokensQuery
    if (!tokens.length) {
      await db("push_notifications")
        .where({ id: notification.id })
        .update({ status: "failed", updated_at: now })
      processedIds.push(notification.id)
      continue
    }

    const fcmTokens = tokens
      .filter((item) => item.provider === "fcm" && item.token)
      .map((item) => item.token)
    const apnsTokens = tokens
      .filter((item) => item.provider === "apns" && item.token)
      .map((item) => item.token)
    const webSubscriptions = tokens
      .filter((item) => item.provider === "webpush" && item.subscription)
      .map((item) => item.subscription)

    const payload = {
      title: notification.title,
      message: notification.message,
      data: { notification_id: notification.id },
    }

    let sent = 0
    let failed = 0
    const invalidTokenIds = []

    try {
      const fcmResult = await sendFcm(fcmTokens, payload)
      sent += fcmResult.sent
      failed += fcmResult.failed
      if (fcmResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "fcm" && fcmResult.invalidTokens.includes(item.token)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += fcmTokens.length
    }

    try {
      const apnsResult = await sendApns(apnsTokens, payload)
      sent += apnsResult.sent
      failed += apnsResult.failed
      if (apnsResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "apns" && apnsResult.invalidTokens.includes(item.token)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += apnsTokens.length
    }

    try {
      const webResult = await sendWebPush(webSubscriptions, payload)
      sent += webResult.sent
      failed += webResult.failed
      if (webResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "webpush" && webResult.invalidTokens.includes(item.subscription)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += webSubscriptions.length
    }

    if (invalidTokenIds.length) {
      await db("push_device_tokens")
        .whereIn("id", invalidTokenIds)
        .update({ disabled_at: now, updated_at: now })
    }

    const status = sent > 0 && failed > 0 ? "partial" : sent > 0 ? "sent" : "failed"
    await db("push_notifications")
      .where({ id: notification.id })
      .update({
        status,
        sent_at: sent > 0 ? now : null,
        updated_at: now,
      })

    processedIds.push(notification.id)
  }

  const updated = await db("push_notifications")
    .select(
      "id",
      "title",
      "message",
      "target_type",
      "target_company_ids",
      "target_user_ids",
      "send_at",
      "status",
      "sent_at",
      "created_at",
      "updated_at"
    )
    .whereIn("id", processedIds)

  res.json({ processed: processedIds.length, notifications: updated.map(mapPushNotificationRow) })
}

module.exports = { POST }
