const { ContainerRegistrationKeys, remoteQueryObjectFromString } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")
const { mapPushNotificationRow } = require("../../../../utils/push-notifications")
const { sendFcm, sendApns, sendWebPush, sendExpo } = require("../../../../utils/push-sender")
const { publishNotificationEvent } = require("../../../../services/realtime-ws")

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const MAX_ERROR_LENGTH = 2000

const formatError = (err) => {
  if (!err) return "unknown_error"
  if (err instanceof Error) return err.stack || err.message || "unknown_error"
  if (typeof err === "string") return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

const concatErrors = (errors) => {
  if (!errors.length) return null
  const message = errors.join(" | ")
  return message.length > MAX_ERROR_LENGTH ? message.slice(0, MAX_ERROR_LENGTH) : message
}

const buildFailureSummary = ({ sent, failed, fcmFailed, apnsFailed, webFailed, expoFailed }) => {
  const parts = [
    `sent=${sent}`,
    `failed=${failed}`,
    `fcm_failed=${fcmFailed}`,
    `apns_failed=${apnsFailed}`,
    `web_failed=${webFailed}`,
    `expo_failed=${expoFailed}`,
  ]
  return parts.join(", ")
}

const fetchCustomersByIds = async (scope, ids) => {
  if (!ids?.length) return []
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: ids }, limit: Math.min(ids.length, 500) },
    fields: ["id", "metadata"],
  })
  const customers = await remoteQuery(query)
  return Array.isArray(customers) ? customers : []
}

const appendNotificationHistoryForCustomers = async (scope, customerIds, notification) => {
  if (!customerIds?.length) return
  const customers = await fetchCustomersByIds(scope, customerIds)
  for (const customer of customers) {
    const current = Array.isArray(customer?.metadata?.notifications_history)
      ? customer.metadata.notifications_history
      : []
    const dedupeKey = `${notification.status}|${notification.id}|${notification.message}`
    const deduped = current.filter((item) => item?.dedupe_key !== dedupeKey)
    const next = [
      {
        ...notification,
        read: false,
        dedupe_key: dedupeKey,
      },
      ...deduped,
    ].slice(0, 200)
    await updateCustomersWorkflow(scope).run({
      input: {
        selector: { id: customer.id },
        update: {
          metadata: { ...(customer.metadata || {}), notifications_history: next },
        },
      },
    })
  }
}

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
      "last_error",
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
        .update({ status: "failed", last_error: "no_tokens", updated_at: now })
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
    const expoTokens = tokens
      .filter((item) => item.provider === "expo" && item.token)
      .map((item) => item.token)

    const payload = {
      title: notification.title,
      message: notification.message,
      data: { notification_id: notification.id },
    }
    const targetCustomerIds = Array.from(
      new Set(tokens.map((item) => item.customer_id).filter(Boolean))
    )

    let sent = 0
    let failed = 0
    let fcmFailed = 0
    let apnsFailed = 0
    let webFailed = 0
    let expoFailed = 0
    const invalidTokenIds = []
    const errors = []

    try {
      const fcmResult = await sendFcm(fcmTokens, payload)
      sent += fcmResult.sent
      failed += fcmResult.failed
      fcmFailed += fcmResult.failed
      if (fcmResult.errors?.length) {
        errors.push(...fcmResult.errors.map((item) => `fcm:${item}`))
      }
      if (fcmResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "fcm" && fcmResult.invalidTokens.includes(item.token)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += fcmTokens.length
      fcmFailed += fcmTokens.length
      errors.push(`fcm:${formatError(err)}`)
    }

    try {
      const apnsResult = await sendApns(apnsTokens, payload)
      sent += apnsResult.sent
      failed += apnsResult.failed
      apnsFailed += apnsResult.failed
      if (apnsResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "apns" && apnsResult.invalidTokens.includes(item.token)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += apnsTokens.length
      apnsFailed += apnsTokens.length
      errors.push(`apns:${formatError(err)}`)
    }

    try {
      const webResult = await sendWebPush(webSubscriptions, payload)
      sent += webResult.sent
      failed += webResult.failed
      webFailed += webResult.failed
      if (webResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "webpush" && webResult.invalidTokens.includes(item.subscription)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += webSubscriptions.length
      webFailed += webSubscriptions.length
      errors.push(`webpush:${formatError(err)}`)
    }

    try {
      const expoResult = await sendExpo(expoTokens, payload)
      sent += expoResult.sent
      failed += expoResult.failed
      expoFailed += expoResult.failed
      if (expoResult.errors?.length) {
        errors.push(...expoResult.errors.map((item) => `expo:${item}`))
      }
      if (expoResult.invalidTokens.length) {
        const invalid = tokens.filter(
          (item) => item.provider === "expo" && expoResult.invalidTokens.includes(item.token)
        )
        invalidTokenIds.push(...invalid.map((item) => item.id))
      }
    } catch (err) {
      failed += expoTokens.length
      expoFailed += expoTokens.length
      errors.push(`expo:${formatError(err)}`)
    }

    if (invalidTokenIds.length) {
      await db("push_device_tokens")
        .whereIn("id", invalidTokenIds)
        .update({ disabled_at: now, updated_at: now })
    }

    const status = sent > 0 && failed > 0 ? "partial" : sent > 0 ? "sent" : "failed"
    const lastError =
      status === "sent"
        ? null
        : concatErrors(errors) ||
          buildFailureSummary({ sent, failed, fcmFailed, apnsFailed, webFailed, expoFailed })
    await db("push_notifications")
      .where({ id: notification.id })
      .update({
        status,
        sent_at: sent > 0 ? now : null,
        last_error: lastError,
        updated_at: now,
      })

    if (status === "sent" || status === "partial") {
      const notificationPayload = {
        id: `${notification.id}:${Date.now()}`,
        status: "news",
        title: notification.title,
        message: notification.message,
        created_at: new Date().toISOString(),
      }
      if (targetCustomerIds.length) {
        await appendNotificationHistoryForCustomers(req.scope, targetCustomerIds, notificationPayload)
        for (const customerId of targetCustomerIds) {
          publishNotificationEvent({
            customerId,
            type: "notification.push",
            notification: notificationPayload,
            data: { status },
          })
        }
      } else {
        publishNotificationEvent({
          type: "notification.push",
          notification: notificationPayload,
          data: { status },
        })
      }
    }

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
      "last_error",
      "sent_at",
      "created_at",
      "updated_at"
    )
    .whereIn("id", processedIds)

  res.json({ processed: processedIds.length, notifications: updated.map(mapPushNotificationRow) })
}

module.exports = { POST }
