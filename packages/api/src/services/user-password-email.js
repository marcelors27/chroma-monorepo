const fs = require("fs")
const path = require("path")

const renderTemplate = (template, data) => {
  return Object.entries(data).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, "g"), value ?? ""),
    template
  )
}

const loadTemplate = (filename) => {
  const filepath = path.join(__dirname, "templates", filename)
  try {
    return fs.readFileSync(filepath, "utf8")
  } catch {
    return null
  }
}

const buildUserPasswordEmail = ({ name, password, kind }) => {
  const safeName = name || "Cliente"
  const subject =
    kind === "reset" ? "Sua nova senha de acesso" : "Acesso ao Chroma - senha provisoria"

  const htmlTemplate = loadTemplate(kind === "reset" ? "user-reset.html" : "user-invite.html")
  const html =
    htmlTemplate &&
    renderTemplate(htmlTemplate, {
      name: safeName,
      password,
    })

  const textIntro =
    kind === "reset"
      ? "Sua senha foi resetada. Use a senha abaixo para acessar."
      : "Sua conta foi criada. Use a senha provisoria abaixo para acessar."

  const text = `Ola ${safeName},

${textIntro}

Senha: ${password}

Recomendamos trocar a senha no primeiro acesso.
Se voce nao solicitou esta acao, ignore este email.
`

  return {
    subject,
    html:
      html ||
      `<div style="font-family: Arial, sans-serif; line-height: 1.5;"><p>Ola ${safeName},</p><p>${textIntro}</p><p><strong>Senha:</strong> ${password}</p><p>Recomendamos trocar a senha no primeiro acesso.</p><p>Se voce nao solicitou esta acao, ignore este email.</p></div>`,
    text,
  }
}

module.exports = { buildUserPasswordEmail }
