const buildPendingPaymentEmail = ({ method, companyName, details, checkoutUrl }) => {
  const logoUrl = process.env.CHROMA_LOGO_URL || ""
  const title = method === "boleto" ? "Boleto disponível" : "PIX disponível"
  const subtitle =
    method === "boleto"
      ? `Seu boleto está disponível para o condomínio ${companyName}.`
      : `Seu PIX está disponível para o condomínio ${companyName}.`

  const rows = []
  const textRows = []

  if (method === "boleto") {
    if (details?.boleto_line) {
      rows.push({
        label: "Linha digitável",
        value: details.boleto_line,
      })
      textRows.push(`Linha digitável: ${details.boleto_line}`)
    }
    if (details?.boleto_url) {
      rows.push({
        label: "Boleto",
        value: `<a href="${details.boleto_url}" style="color:#0f766e;text-decoration:none;">Abrir boleto</a>`,
      })
      textRows.push(`Boleto: ${details.boleto_url}`)
    }
  } else if (method === "pix") {
    if (details?.pix_code) {
      rows.push({
        label: "Código PIX",
        value: details.pix_code,
      })
      textRows.push(`Codigo PIX: ${details.pix_code}`)
    }
    if (details?.pix_qr) {
      rows.push({
        label: "QR Code",
        value: `<a href="${details.pix_qr}" style="color:#0f766e;text-decoration:none;">Ver QR</a>`,
      })
      textRows.push(`QR Code: ${details.pix_qr}`)
    }
  }

  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;">${row.label}</td>
          <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600;">${row.value}</td>
        </tr>
      `
    )
    .join("")

  const actionButton = checkoutUrl
    ? `
      <div style="margin-top:20px;text-align:center;">
        <a
          href="${checkoutUrl}"
          style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;"
        >
          Ver pagamento
        </a>
      </div>
    `
    : ""

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Chroma" style="height:32px;display:block;" />`
    : `<span style="font-size:20px;font-weight:700;color:#0f766e;letter-spacing:0.5px;">Chroma</span>`

  const html = `
    <div style="background:#0b0f1a;padding:32px 0;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
        <tr>
          <td style="padding:0 24px 16px;">
            ${logoBlock}
          </td>
        </tr>
        <tr>
          <td style="background:#111827;border-radius:16px;padding:28px 28px 24px;">
            <h1 style="color:#f9fafb;font-size:22px;margin:0 0 8px;">${title}</h1>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">
              ${subtitle}
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #1f2937;">
              ${rowsHtml}
            </table>
            ${actionButton}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:12px;padding:16px 24px 0;">
            Esta mensagem foi enviada automaticamente pelo Chroma.
          </td>
        </tr>
      </table>
    </div>
  `

  const text = [
    title,
    subtitle,
    ...textRows,
    checkoutUrl ? `Ver pagamento: ${checkoutUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return { html, text }
}

module.exports = { buildPendingPaymentEmail }
