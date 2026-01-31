const crypto = require("crypto")

const PRIVATE_KEY_ENV = "CHROMA_AUTH_PRIVATE_KEY"
const PUBLIC_KEY_ENV = "CHROMA_AUTH_PUBLIC_KEY"

const normalizePem = (value) => {
  if (!value || typeof value !== "string") return null
  return value.replace(/\\n/g, "\n").trim()
}

const getPrivateKey = () => normalizePem(process.env[PRIVATE_KEY_ENV])

const resolvePublicKey = () => {
  const explicit = normalizePem(process.env[PUBLIC_KEY_ENV])
  if (explicit) return explicit
  const privateKey = getPrivateKey()
  if (!privateKey) return null
  try {
    return crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" })
  } catch {
    return null
  }
}

const decryptLoginPayload = (payload) => {
  const privateKey = getPrivateKey()
  if (!privateKey) {
    return { error: "missing_private_key" }
  }
  try {
    const buffer = Buffer.from(payload, "base64")
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    )
    const data = JSON.parse(decrypted.toString("utf8"))
    return { data }
  } catch (error) {
    return { error: error?.message || "decrypt_failed" }
  }
}

module.exports = { resolvePublicKey, decryptLoginPayload }
