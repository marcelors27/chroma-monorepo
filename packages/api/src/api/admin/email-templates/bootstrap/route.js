const {
  listTemplates,
  createTemplate,
  publishTemplate,
} = require("../../../../services/resend-templates")
const {
  buildWelcomeTemplate,
  buildCompanyAddedTemplate,
  buildBoletoAdminTemplate,
  buildPasswordResetTemplate,
  buildSocialLoginLinkedTemplate,
} = require("../../../../services/email-templates")

const upsertTemplate = async (definition) => {
  const list = await listTemplates({ limit: 100 })
  const templates = list?.data || list?.templates || []
  const existing = templates.find(
    (tpl) => String(tpl.name || "").toLowerCase() === definition.name.toLowerCase()
  )

  if (existing?.id) {
    return { id: existing.id, name: existing.name, status: "exists" }
  }

  const created = await createTemplate({
    name: definition.name,
    subject: definition.subject,
    html: definition.html,
    variables: definition.variables,
  })

  return { id: created?.id || created?.data?.id, name: definition.name, status: "created" }
}

const POST = async (_req, res) => {
  try {
    const welcome = buildWelcomeTemplate()
    const companyAdded = buildCompanyAddedTemplate()
    const boletoAdmin = buildBoletoAdminTemplate()
    const passwordReset = buildPasswordResetTemplate()
    const socialLoginLinked = buildSocialLoginLinkedTemplate()

    const results = []
    results.push(await upsertTemplate(welcome))
    results.push(await upsertTemplate(companyAdded))
    results.push(await upsertTemplate(boletoAdmin))
    results.push(await upsertTemplate(passwordReset))
    results.push(await upsertTemplate(socialLoginLinked))

    const published = []
    for (const entry of results) {
      if (entry?.id) {
        try {
          await publishTemplate(entry.id)
          published.push(entry.id)
          await new Promise((resolve) => setTimeout(resolve, 600))
        } catch {
          // ignore publish errors
        }
      }
    }

    res.json({ templates: results, published })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao criar templates" })
  }
}

module.exports = { POST }
