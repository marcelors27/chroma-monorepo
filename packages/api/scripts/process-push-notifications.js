const { Client } = require("pg")
const { loadEnv } = require("./load-env")
const { sendApns, sendFcm, sendWebPush, sendExpo } = require("../src/utils/push-sender")

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL || "postgres://medusa:medusa@localhost:5432/chroma"

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

async function run() {
  const limit = clamp(Number(process.env.PUSH_PROCESS_LIMIT) || 100, 1, 500)
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  const now = new Date()

  try {
    const { rows } = await client.query(
      `
      SELECT id, title, message, target_type, target_company_ids, target_user_ids
      FROM push_notifications
      WHERE status IN ('queued', 'scheduled')
        AND (send_at IS NULL OR send_at <= $1)
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [now, limit]
    )

    if (!rows.length) {
      console.log("[push-process] Nenhuma notificação pendente.")
      return
    }

    let processed = 0

    for (const notification of rows) {
      const targetType = notification.target_type
      const companyIds = notification.target_company_ids || []
      const userIds = notification.target_user_ids || []

      let tokensQuery = `
        SELECT id, provider, token, subscription
        FROM push_device_tokens
        WHERE disabled_at IS NULL
      `
      const params = []
      if (targetType === "companies") {
        tokensQuery += " AND company_id = ANY($1)"
        params.push(companyIds)
      } else if (targetType === "users") {
        tokensQuery += " AND customer_id = ANY($1)"
        params.push(userIds)
      }

      const tokenRows = params.length
        ? (await client.query(tokensQuery, params)).rows
        : (await client.query(tokensQuery)).rows

      if (!tokenRows.length) {
        await client.query(
          `UPDATE push_notifications SET status = 'failed', last_error = $1, updated_at = $2 WHERE id = $3`,
          ["no_tokens", now, notification.id]
        )
        processed += 1
        continue
      }

      const fcmTokens = tokenRows
        .filter((item) => item.provider === "fcm" && item.token)
        .map((item) => item.token)
      const apnsTokens = tokenRows
        .filter((item) => item.provider === "apns" && item.token)
        .map((item) => item.token)
      const webSubscriptions = tokenRows
        .filter((item) => item.provider === "webpush" && item.subscription)
        .map((item) => item.subscription)
      const expoTokens = tokenRows
        .filter((item) => item.provider === "expo" && item.token)
        .map((item) => item.token)

      const payload = {
        title: notification.title,
        message: notification.message,
        data: { notification_id: notification.id },
      }

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
          const invalid = tokenRows.filter(
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
          const invalid = tokenRows.filter(
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
          const invalid = tokenRows.filter(
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
          const invalid = tokenRows.filter(
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
        await client.query(
          `UPDATE push_device_tokens SET disabled_at = $1, updated_at = $1 WHERE id = ANY($2)`,
          [now, invalidTokenIds]
        )
      }

      const status = sent > 0 && failed > 0 ? "partial" : sent > 0 ? "sent" : "failed"
      const lastError =
        status === "sent"
          ? null
          : concatErrors(errors) ||
            buildFailureSummary({ sent, failed, fcmFailed, apnsFailed, webFailed, expoFailed })
      await client.query(
        `UPDATE push_notifications SET status = $1, sent_at = $2, last_error = $3, updated_at = $2 WHERE id = $4`,
        [status, sent > 0 ? now : null, lastError, notification.id]
      )
      processed += 1
    }

    console.log(`[push-process] Processadas: ${processed}`)
  } finally {
    await client.end()
  }
}

run().catch((err) => {
  console.error("[push-process] Falha:", err?.message || err)
  process.exit(1)
})
