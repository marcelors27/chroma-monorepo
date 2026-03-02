const jwt = require("jsonwebtoken")
const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { sendEmail } = require("../../../../services/send-email")
const { buildPendingPaymentEmail } = require("../../../../services/pending-payment-email")
const { sendBoletoAdminEmail, sendPixAdminEmail } = require("../../../../services/email-template-sender")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")
const { publishNotificationEvent } = require("../../../../services/realtime-ws")

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email", "metadata", "approved", "first_name", "last_name", "created_at"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const getAuthServices = (scope) => {
  const services = {}
  try {
    services.authIdentityService = scope.resolve("authIdentityService")
  } catch {}
  try {
    services.providerIdentityService = scope.resolve("providerIdentityService")
  } catch {}
  try {
    const authModule = scope.resolve(Modules.AUTH)
    services.authIdentityService =
      services.authIdentityService ||
      authModule?.authIdentityService_ ||
      authModule?.authIdentityService
    services.providerIdentityService =
      services.providerIdentityService ||
      authModule?.providerIdentityService_ ||
      authModule?.providerIdentityService
  } catch {}
  return services
}

const resolveCustomerIdFromIdentity = async (scope, authIdentityId, logger) => {
  if (!authIdentityId) return null
  try {
    const { authIdentityService, providerIdentityService } = getAuthServices(scope)
    if (!authIdentityService && !providerIdentityService) return null

    if (authIdentityService.list) {
      const identities = await authIdentityService.list({ id: authIdentityId })
      const identity = identities?.[0]
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (authIdentityService.retrieve) {
      const identity = await authIdentityService.retrieve(authIdentityId)
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id) {
        return providerIdentity.entity_id
      }
    }
  } catch (e) {
    safeLog(logger, { msg: "resolveCustomerIdFromIdentity:error", error: e?.message })
    return null
  }
  return null
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(
      req.scope,
      req.auth_context.auth_identity_id,
      logger
    )
    if (resolved) return resolved
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const [, token] = authHeader.split(" ")
  if (!token) return null

  try {
    const config = req.scope.resolve("configModule")
    const http = config.projectConfig?.http || {}
    const verified = jwt.verify(
      token,
      http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
      http.jwtVerifyOptions || http.jwtOptions || {}
    )
    return (
      verified.actor_id ||
      verified.customer_id ||
      verified.app_metadata?.customer_id ||
      (await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)) ||
      null
    )
  } catch (e) {
    safeLog(logger, { msg: "getCustomerId:jwt error", error: e?.message })
    return null
  }
}


const POST = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const body = req.body || {}
  const method = body.payment_method || body.method
  const paymentCollectionId = body.payment_collection_id || body.paymentCollectionId
  const details = body.details || {}
  const companyId =
    body.company_id ||
    body.companyId ||
    details?.company_id ||
    details?.companyId ||
    null

  if (!method || !paymentCollectionId || !companyId) {
    return res.status(400).json({ message: "Dados incompletos para envio do pagamento." })
  }
  if (method !== "boleto" && method !== "pix") {
    return res.status(400).json({ message: "Método de pagamento inválido." })
  }

  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const company = companies.find((item) => item?.id === companyId)
  if (!company) {
    return res.status(404).json({ message: "Condomínio não encontrado." })
  }

  const normalizeEmails = (value) => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.map((email) => String(email).trim()).filter(Boolean)
    }
    if (typeof value === "string") {
      return value
        .split(/[;,]+/)
        .map((email) => email.trim())
        .filter(Boolean)
    }
    return []
  }

  const contactEmail = company?.metadata?.email || null
  const adminEmail = company?.metadata?.administradoraEmail || null
  const billingEmails =
    normalizeEmails(company?.metadata?.billing_emails) ||
    normalizeEmails(company?.metadata?.billingEmails)
  const recipients = [...billingEmails, contactEmail, adminEmail].filter(Boolean)
  const uniqueRecipients = Array.from(new Set(recipients))

  if (!uniqueRecipients.length) {
    return res.status(400).json({ message: "Condomínio sem e-mails configurados." })
  }

  const companyName = company?.fantasy_name || company?.trade_name || company?.metadata?.name || "Condomínio"
  const storeUrl = process.env.STORE_URL || process.env.FRONTEND_URL || ""
  const checkoutUrl = storeUrl
    ? `${storeUrl.replace(/\/$/, "")}/checkout?pending=${encodeURIComponent(paymentCollectionId)}`
    : ""

  const { html, text } = buildPendingPaymentEmail({
    method,
    companyName,
    details,
    checkoutUrl,
  })
  const subject =
    method === "boleto"
      ? `Boleto disponível - ${companyName}`
      : `PIX disponível - ${companyName}`

  await sendEmail({
    to: uniqueRecipients,
    subject,
    html,
    text,
    logger,
  })

  const formatBoletoExpiresAt = (value) => {
    if (!value) return ""
    if (typeof value === "number") {
      return new Date(value * 1000).toLocaleDateString("pt-BR")
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toLocaleDateString("pt-BR")
  }

  const isStripeUrl = (url) => {
    if (!url) return false
    try {
      const parsed = new URL(url)
      return parsed.hostname.includes("stripe") || parsed.hostname.includes("stripe.com")
    } catch {
      return false
    }
  }

  const fetchBoletoAttachment = async (url, filename) => {
    if (!url) return null
    if (!isStripeUrl(url)) return null
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Boleto download failed (${response.status})`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    return {
      filename,
      content: buffer.toString("base64"),
      contentType: "application/pdf",
    }
  }

  const appendEmailLog = async (type, status, hasAttachment) => {
    if (!adminEmail) return
    const current = Array.isArray(customer?.metadata?.email_logs)
      ? customer.metadata.email_logs
      : []
    const entry = {
      type,
      company_id: companyId || null,
      email: adminEmail,
      status,
      payment_collection_id: paymentCollectionId || null,
      method,
      details: details || {},
      sent_at: new Date().toISOString(),
      has_attachment: Boolean(hasAttachment),
    }
    const next = [entry, ...current].slice(0, 50)
    await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: customerId },
        update: { metadata: { ...(customer.metadata || {}), email_logs: next } },
      },
    })
  }

  const appendNotificationHistory = async (notification) => {
    const current = Array.isArray(customer?.metadata?.notifications_history)
      ? customer.metadata.notifications_history
      : []
    const dedupeKey = `${notification.status}|${notification.payment_collection_id || ""}|${notification.message}`
    const deduped = current.filter((item) => item?.dedupe_key !== dedupeKey)
    const next = [
      {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        order_id: notification.order_id || null,
        payment_collection_id: notification.payment_collection_id || null,
        company_id: notification.company_id || null,
        method: notification.method || null,
        created_at: notification.created_at,
        read: false,
        dedupe_key: dedupeKey,
      },
      ...deduped,
    ].slice(0, 200)
    await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: customerId },
        update: {
          metadata: { ...(customer.metadata || {}), notifications_history: next },
        },
      },
    })
  }

  if (method === "boleto" && adminEmail) {

    let attachment = null
    try {
      const filename = `boleto-${companyId || "chroma"}.pdf`
      attachment = await fetchBoletoAttachment(details?.boleto_url, filename)
    } catch (err) {
      logger?.warn?.("[email] boleto attachment falhou", { error: err?.message })
    }

    try {
      await sendBoletoAdminEmail({
        to: adminEmail,
        companyName,
        boletoLine: details?.boleto_line || "",
        boletoUrl: details?.boleto_url || "",
        boletoExpiresAt: formatBoletoExpiresAt(details?.boleto_expires_at),
        attachments: attachment ? [attachment] : undefined,
        logger,
      })
      try {
        await appendEmailLog("boleto_admin", "sent", Boolean(attachment))
      } catch (err) {
        logger?.warn?.("[email] log boleto admin falhou", { error: err?.message })
      }
    } catch (err) {
      logger?.warn?.("[email] boleto admin falhou", { error: err?.message })
      try {
        await appendEmailLog("boleto_admin", "failed", Boolean(attachment))
      } catch (logErr) {
        logger?.warn?.("[email] log boleto admin falhou", { error: logErr?.message })
      }
    }
  }

  if (method === "pix" && adminEmail) {
    try {
      const storeUrl = process.env.STORE_URL || process.env.FRONTEND_URL || ""
      const qrUrl =
        details?.pix_qr && String(details.pix_qr).startsWith("http")
          ? details.pix_qr
          : details?.pix_code && storeUrl
            ? `${storeUrl.replace(/\/$/, "")}/store/custom/pix/qr?code=${encodeURIComponent(details.pix_code)}`
            : ""

      let attachment = null
      let embeddedImage = ""
      if (details?.pix_qr && String(details.pix_qr).startsWith("data:image/png")) {
        const base64 = String(details.pix_qr).split(",")[1] || ""
        if (base64) {
          attachment = {
            filename: `pix-${companyId || "chroma"}.png`,
            content: base64,
            contentType: "image/png",
          }
          embeddedImage = `<div style="margin:16px 0;">
  <img src="data:image/png;base64,${base64}" alt="QR Code PIX" style="max-width:180px;width:100%;height:auto;border-radius:12px;border:1px solid #1f2937;" />
</div>`
        }
      }

      await sendPixAdminEmail({
        to: adminEmail,
        companyName,
        pixCode: details?.pix_code || "",
        pixTxid: details?.pix_txid || "",
        pixQrUrl: qrUrl,
        pixQrImage: embeddedImage,
        attachments: attachment ? [attachment] : undefined,
        logger,
      })

      try {
        await appendEmailLog("pix_admin", "sent", Boolean(attachment))
      } catch (err) {
        logger?.warn?.("[email] log pix admin falhou", { error: err?.message })
      }
    } catch (err) {
      logger?.warn?.("[email] pix admin falhou", { error: err?.message })
      try {
        await appendEmailLog("pix_admin", "failed", false)
      } catch (logErr) {
        logger?.warn?.("[email] log pix admin falhou", { error: logErr?.message })
      }
    }
  }

  safeLog(logger, {
    msg: "pending-payment:email-sent",
    companyId,
    paymentCollectionId,
    recipients: uniqueRecipients,
  })

  const realtimeNotification = {
    id: `${paymentCollectionId}:${Date.now()}`,
    status: method === "boleto" ? "pending_boleto" : "pending_pix",
    title: method === "boleto" ? "Boleto gerado" : "PIX gerado",
    message: `Pagamento pendente para ${companyName}.`,
    payment_collection_id: paymentCollectionId,
    company_id: companyId,
    method,
    created_at: new Date().toISOString(),
  }

  await appendNotificationHistory(realtimeNotification)

  publishNotificationEvent({
    customerId,
    companyId,
    type: "notification.created",
    notification: realtimeNotification,
  })

  return res.status(200).json({ sent: true, recipients: uniqueRecipients })
}

module.exports = { POST }
