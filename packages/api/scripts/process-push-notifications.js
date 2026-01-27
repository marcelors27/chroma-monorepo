const { Client } = require("pg")
const { loadEnv } = require("./load-env")
const { sendApns, sendFcm, sendWebPush } = require("../src/utils/push-sender")

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL || "postgres://medusa:medusa@localhost:5432/chroma"

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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
          `UPDATE push_notifications SET status = 'failed', updated_at = $1 WHERE id = $2`,
          [now, notification.id]
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
          const invalid = tokenRows.filter(
            (item) => item.provider === "fcm" && fcmResult.invalidTokens.includes(item.token)
          )
          invalidTokenIds.push(...invalid.map((item) => item.id))
        }
      } catch {
        failed += fcmTokens.length
      }

      try {
        const apnsResult = await sendApns(apnsTokens, payload)
        sent += apnsResult.sent
        failed += apnsResult.failed
        if (apnsResult.invalidTokens.length) {
          const invalid = tokenRows.filter(
            (item) => item.provider === "apns" && apnsResult.invalidTokens.includes(item.token)
          )
          invalidTokenIds.push(...invalid.map((item) => item.id))
        }
      } catch {
        failed += apnsTokens.length
      }

      try {
        const webResult = await sendWebPush(webSubscriptions, payload)
        sent += webResult.sent
        failed += webResult.failed
        if (webResult.invalidTokens.length) {
          const invalid = tokenRows.filter(
            (item) => item.provider === "webpush" && webResult.invalidTokens.includes(item.subscription)
          )
          invalidTokenIds.push(...invalid.map((item) => item.id))
        }
      } catch {
        failed += webSubscriptions.length
      }

      if (invalidTokenIds.length) {
        await client.query(
          `UPDATE push_device_tokens SET disabled_at = $1, updated_at = $1 WHERE id = ANY($2)`,
          [now, invalidTokenIds]
        )
      }

      const status = sent > 0 && failed > 0 ? "partial" : sent > 0 ? "sent" : "failed"
      await client.query(
        `UPDATE push_notifications SET status = $1, sent_at = $2, updated_at = $2 WHERE id = $3`,
        [status, sent > 0 ? now : null, notification.id]
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
