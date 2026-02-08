const QRCode = require("qrcode")
const fs = require("fs")
const path = require("path")
let sharp = null

try {
  // Optional dependency for logo compositing
  // eslint-disable-next-line global-require
  sharp = require("sharp")
} catch {}

const CRC16_TABLE = (() => {
  const table = []
  for (let i = 0; i < 256; i += 1) {
    let value = i << 8
    for (let j = 0; j < 8; j += 1) {
      if ((value & 0x8000) !== 0) {
        value = ((value << 1) ^ 0x1021) & 0xffff
      } else {
        value = (value << 1) & 0xffff
      }
    }
    table.push(value)
  }
  return table
})()

const crc16 = (payload) => {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i)
    crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ code) & 0xff]) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

const tlv = (id, value) => {
  const text = value ?? ""
  return `${id}${String(text.length).padStart(2, "0")}${text}`
}

const sanitizeText = (value, max) => {
  const text = String(value || "").trim()
  if (!text) return ""
  const cleaned = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 .,-]/g, "")
    .trim()
  return max ? cleaned.slice(0, max) : cleaned
}

const buildPixPayload = ({
  key,
  merchantName,
  merchantCity,
  amount,
  txid,
  description,
}) => {
  const safeKey = String(key || "").trim()
  const safeName = sanitizeText(merchantName, 25) || "CHROMA"
  const safeCity = sanitizeText(merchantCity, 15) || "SAO PAULO"
  const safeTxid = sanitizeText(txid, 25) || "CHROMA"

  const accountInfo = [
    tlv("00", "BR.GOV.BCB.PIX"),
    tlv("01", safeKey),
    description ? tlv("02", sanitizeText(description, 50)) : "",
  ]
    .filter(Boolean)
    .join("")

  const additional = tlv("05", safeTxid)
  const amountText =
    typeof amount === "number" && Number.isFinite(amount)
      ? amount.toFixed(2)
      : ""

  const payload =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("26", accountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amountText ? tlv("54", amountText) : "") +
    tlv("58", "BR") +
    tlv("59", safeName) +
    tlv("60", safeCity) +
    tlv("62", additional)

  const toSign = `${payload}6304`
  return `${toSign}${crc16(toSign)}`
}

const buildTxId = (base) => {
  const raw = String(base || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!raw) return `CHROMA${Date.now().toString(36).toUpperCase()}`
  return raw.slice(0, 25)
}

const resolveLogoBuffer = (() => {
  let cached = null
  return () => {
    if (cached) return cached
    try {
      const logoPath = path.resolve(__dirname, "../../../..", "logo.png")
      if (fs.existsSync(logoPath)) {
        cached = fs.readFileSync(logoPath)
      }
    } catch {}
    return cached
  }
})()

const QR_OPTIONS = { margin: 1, width: 360, errorCorrectionLevel: "H" }

const generatePixQrBuffer = async (payload) => {
  const baseQr = await QRCode.toBuffer(payload, QR_OPTIONS)
  if (!sharp) return baseQr
  const logoBuffer = resolveLogoBuffer()
  if (!logoBuffer) return baseQr

  try {
    const qrSize = QR_OPTIONS.width || 360
    const minLogoSize = 140
    const targetLogoSize = Math.round(qrSize * 0.4)
    const logoSize = Math.min(Math.max(minLogoSize, targetLogoSize), Math.round(qrSize * 0.45))

    const logo = await sharp(logoBuffer)
      .ensureAlpha()
      .trim({ threshold: 12 })
      .resize(logoSize, logoSize, { fit: "contain" })
      .tint({ r: 0, g: 0, b: 0 })
      .png()
      .toBuffer()

    const left = Math.floor((qrSize - logoSize) / 2)
    const top = Math.floor((qrSize - logoSize) / 2)

    return await sharp(baseQr)
      .composite([{ input: logo, left, top }])
      .png()
      .toBuffer()
  } catch {
    return baseQr
  }
}

const generatePix = async ({
  key,
  merchantName,
  merchantCity,
  amount,
  txid,
  description,
}) => {
  const payload = buildPixPayload({
    key,
    merchantName,
    merchantCity,
    amount,
    txid: buildTxId(txid),
    description,
  })
  const qrBuffer = await generatePixQrBuffer(payload)
  const qr = `data:image/png;base64,${qrBuffer.toString("base64")}`
  return { pix_code: payload, pix_qr: qr }
}

module.exports = { buildPixPayload, generatePix, buildTxId, generatePixQrBuffer }
