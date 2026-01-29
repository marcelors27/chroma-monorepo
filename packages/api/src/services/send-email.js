const sendEmail = async ({
  to,
  subject,
  html,
  text,
  templateId,
  templateData,
  attachments,
  logger,
}) => {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const log = logger || console

  if (!apiKey || !from) {
    log.warn?.("[email] RESEND_API_KEY/RESEND_FROM ausentes; envio ignorado")
    return { skipped: true }
  }

  const payload = {
    from,
    to,
    subject,
  }

  if (templateId) {
    payload.template_id = templateId
    payload.template_data = templateData || {}
  } else {
    payload.html = html
    payload.text = text
  }

  if (attachments?.length) {
    payload.attachments = attachments
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    log.warn?.("[email] envio falhou", { status: response.status, message })
    return { error: message }
  }

  return response.json()
}

module.exports = { sendEmail }
