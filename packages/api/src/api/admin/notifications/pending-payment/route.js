const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")
const { sendEmail } = require("../../../../services/send-email")
const { buildPendingPaymentEmail } = require("../../../../services/pending-payment-email")
const { sendBoletoAdminEmail, sendPixAdminEmail } = require("../../../../services/email-template-sender")

const safeLog = (logger, payload) => {
  try {
    logger?.info?.(JSON.stringify(payload))
  } catch {
    logger?.info?.(payload)
  }
}

const fetchCustomers = async (scope, limit = 500) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: {}, limit },
    fields: ["id", "email", "metadata", "first_name", "last_name"],
  })
  return await remoteQuery(query)
}

const fetchCustomerById = async (scope, id) => {
  if (!id) return null
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id }, limit: 1 },
    fields: ["id", "email", "metadata", "first_name", "last_name"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0] || null
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

const formatBoletoExpiresAt = (value) => {
  if (!value) return ""
  if (typeof value === "number") {
    return new Date(value * 1000).toLocaleDateString("pt-BR")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toLocaleDateString("pt-BR")
}

const POST = async (req, res) => {
  const body = req.body || {}
  const method = body.payment_method || body.method
  const paymentCollectionId = body.payment_collection_id || body.paymentCollectionId
  const companyId = body.company_id || body.companyId
  const customerId = body.customer_id || body.customerId
  const details = body.details || {}

  if (!method || !paymentCollectionId || !companyId) {
    return res.status(400).json({ message: "Dados incompletos para envio do pagamento." })
  }
  if (method !== "boleto" && method !== "pix") {
    return res.status(400).json({ message: "Método de pagamento inválido." })
  }

  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  let customer = null
  let company = null

  if (customerId) {
    customer = await fetchCustomerById(req.scope, customerId)
  } else {
    const customers = await fetchCustomers(req.scope)
    for (const cust of customers) {
      const companies = Array.isArray(cust?.metadata?.companies) ? cust.metadata.companies : []
      const found = companies.find((item) => item?.id === companyId)
      if (found) {
        customer = cust
        company = found
        break
      }
    }
  }

  if (!customer) {
    return res.status(404).json({ message: "Customer não encontrado." })
  }

  if (!company) {
    const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
    company = companies.find((item) => item?.id === companyId)
  }

  if (!company) {
    return res.status(404).json({ message: "Condomínio não encontrado." })
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

  await sendEmail({ to: uniqueRecipients, subject, html, text, logger })

  const appendEmailLog = async (status, hasAttachment) => {
    const current = Array.isArray(customer?.metadata?.email_logs)
      ? customer.metadata.email_logs
      : []
    const entry = {
      type: method === "boleto" ? "boleto_admin" : "pix_admin",
      company_id: companyId || null,
      email: adminEmail || null,
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
        selector: { id: customer.id },
        update: { metadata: { ...(customer.metadata || {}), email_logs: next } },
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
      await appendEmailLog("sent", Boolean(attachment))
    } catch (err) {
      logger?.warn?.("[email] boleto admin falhou", { error: err?.message })
      await appendEmailLog("failed", Boolean(attachment))
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

      await appendEmailLog("sent", Boolean(attachment))
    } catch (err) {
      logger?.warn?.("[email] pix admin falhou", { error: err?.message })
      await appendEmailLog("failed", false)
    }
  }

  safeLog(logger, {
    msg: "admin:pending-payment:email-sent",
    companyId,
    paymentCollectionId,
    recipients: uniqueRecipients,
  })

  return res.status(200).json({ sent: true, recipients: uniqueRecipients })
}

module.exports = { POST }
