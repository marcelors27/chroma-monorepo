const admin = require("firebase-admin")
const apn = require("apn")
const webpush = require("web-push")

let firebaseApp = null
let apnProvider = null

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    null
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || null
  let credentials = null
  if (raw) {
    try {
      credentials = JSON.parse(raw)
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON invalido")
    }
  } else if (path) {
    credentials = require(path)
  }
  if (!credentials) {
    throw new Error("Credenciais do Firebase não configuradas")
  }
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(credentials),
  })
  return firebaseApp
}

const getApnProvider = () => {
  if (apnProvider) return apnProvider
  const key = process.env.APNS_KEY || null
  const keyId = process.env.APNS_KEY_ID || null
  const teamId = process.env.APNS_TEAM_ID || null
  const bundleId = process.env.APNS_BUNDLE_ID || null
  const production = String(process.env.APNS_PRODUCTION || "false").toLowerCase() === "true"

  if (!key || !keyId || !teamId || !bundleId) {
    throw new Error("Credenciais APNS incompletas")
  }

  apnProvider = new apn.Provider({
    token: { key, keyId, teamId },
    production,
  })
  return apnProvider
}

const ensureWebPushConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID não configurado")
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

const sendFcm = async (tokens, payload) => {
  if (!tokens.length) return { sent: 0, failed: 0, invalidTokens: [] }
  const app = getFirebaseApp()
  const response = await app.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.message,
    },
    data: payload.data || {},
  })
  const invalidTokens = []
  response.responses.forEach((item, index) => {
    if (!item.success) {
      const code = item.error?.code || ""
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        invalidTokens.push(tokens[index])
      }
    }
  })
  return { sent: response.successCount, failed: response.failureCount, invalidTokens }
}

const sendApns = async (tokens, payload) => {
  if (!tokens.length) return { sent: 0, failed: 0, invalidTokens: [] }
  const bundleId = process.env.APNS_BUNDLE_ID
  const provider = getApnProvider()
  const note = new apn.Notification()
  note.topic = bundleId
  note.alert = { title: payload.title, body: payload.message }
  note.payload = payload.data || {}
  const result = await provider.send(note, tokens)
  const invalidTokens = (result.failed || [])
    .map((item) => item.device)
    .filter(Boolean)
  return {
    sent: (result.sent || []).length,
    failed: (result.failed || []).length,
    invalidTokens,
  }
}

const sendWebPush = async (subscriptions, payload) => {
  if (!subscriptions.length) return { sent: 0, failed: 0, invalidTokens: [] }
  ensureWebPushConfig()
  let sent = 0
  let failed = 0
  const invalidTokens = []
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({ title: payload.title, message: payload.message, data: payload.data || {} })
      )
      sent += 1
    } catch (err) {
      failed += 1
      const status = err?.statusCode
      if (status === 404 || status === 410) {
        invalidTokens.push(sub)
      }
    }
  }
  return { sent, failed, invalidTokens }
}

module.exports = { sendFcm, sendApns, sendWebPush }
