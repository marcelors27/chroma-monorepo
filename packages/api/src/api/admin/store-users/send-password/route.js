const { sendEmail } = require("../../../../services/send-email")
const { buildUserPasswordEmail } = require("../../../../services/user-password-email")

const POST = async (req, res) => {
  const body = req.body || {}
  const email = body.email
  const password = body.password
  const firstName = body.first_name || body.firstName || ""
  const lastName = body.last_name || body.lastName || ""
  const kind = body.kind === "reset" ? "reset" : "invite"

  if (!email || !password) {
    return res.status(400).json({ message: "email e password obrigatorios" })
  }

  const name = `${firstName} ${lastName}`.trim() || null
  const { subject, html, text } = buildUserPasswordEmail({ name, password, kind })

  await sendEmail({
    to: email,
    subject,
    html,
    text,
    logger: req.scope?.resolve ? req.scope.resolve("logger") : console,
  })

  return res.json({ ok: true })
}

module.exports = { POST }
