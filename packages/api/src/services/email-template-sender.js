const { sendEmail } = require("./send-email")
const { listTemplates } = require("./resend-templates")
const {
  WELCOME_TEMPLATE_NAME,
  COMPANY_ADDED_TEMPLATE_NAME,
  BOLETO_ADMIN_TEMPLATE_NAME,
  PASSWORD_RESET_TEMPLATE_NAME,
  buildWelcomeTemplate,
  buildCompanyAddedTemplate,
  buildBoletoAdminTemplate,
  buildPasswordResetTemplate,
  renderTemplateHtml,
} = require("./email-templates")

const DEFAULT_DASHBOARD_URL = process.env.FRONT_STORE_URL || "http://localhost:5173"

const resolveTemplateIdByName = async (name, logger) => {
  try {
    const list = await listTemplates({ limit: 200 })
    const templates = list?.data || list?.templates || []
    const found = templates.find((tpl) => String(tpl.name || "").toLowerCase() === name.toLowerCase())
    return found?.id || null
  } catch (error) {
    logger?.warn?.("[email] falha ao listar templates", { error: error?.message })
    return null
  }
}

const sendTemplateOrFallback = async ({
  to,
  subject,
  templateName,
  templateDefinition,
  variables,
  attachments,
  logger,
}) => {
  const templateId = await resolveTemplateIdByName(templateName, logger)
  if (templateId) {
    return sendEmail({
      to,
      subject,
      templateId,
      templateData: variables,
      attachments,
      logger,
    })
  }

  const html = renderTemplateHtml(templateDefinition, variables)
  return sendEmail({ to, subject, html, text: subject, attachments, logger })
}

const buildCondosList = (companies) => {
  if (!Array.isArray(companies) || !companies.length) {
    return "Nenhum condominio adicionado ainda."
  }
  return companies
    .map((company) => {
      const name = company?.fantasy_name || company?.trade_name || company?.name || "Condominio"
      const cnpj = company?.cnpj ? ` (${company.cnpj})` : ""
      return `• ${name}${cnpj}`
    })
    .join("<br/>")
}

const sendWelcomeEmail = async ({ to, name, companies, logger }) => {
  if (!to) return { skipped: true }
  const template = buildWelcomeTemplate()
  const variables = {
    USER_NAME: name || to,
    CONDOS_LIST: buildCondosList(companies),
    DASHBOARD_URL: DEFAULT_DASHBOARD_URL,
  }

  return sendTemplateOrFallback({
    to,
    subject: template.subject,
    templateName: WELCOME_TEMPLATE_NAME,
    templateDefinition: template,
    variables,
    logger,
  })
}

const sendCompanyAddedEmail = async ({ to, name, company, totalCompanies, logger }) => {
  if (!to) return { skipped: true }
  const template = buildCompanyAddedTemplate()
  const variables = {
    USER_NAME: name || to,
    COMPANY_NAME:
      company?.fantasy_name || company?.trade_name || company?.name || "Condominio",
    COMPANY_CNPJ: company?.cnpj || "",
    COMPANY_TOTAL: String(totalCompanies ?? ""),
  }

  return sendTemplateOrFallback({
    to,
    subject: template.subject,
    templateName: COMPANY_ADDED_TEMPLATE_NAME,
    templateDefinition: template,
    variables,
    logger,
  })
}

const sendBoletoAdminEmail = async ({
  to,
  companyName,
  boletoLine,
  boletoUrl,
  boletoExpiresAt,
  attachments,
  logger,
}) => {
  if (!to) return { skipped: true }
  const template = buildBoletoAdminTemplate()
  const variables = {
    COMPANY_NAME: companyName || "",
    BOLETO_LINE: boletoLine || "",
    BOLETO_URL: boletoUrl || "",
    BOLETO_EXPIRES_AT: boletoExpiresAt || "",
  }

  return sendTemplateOrFallback({
    to,
    subject: template.subject,
    templateName: BOLETO_ADMIN_TEMPLATE_NAME,
    templateDefinition: template,
    variables,
    attachments,
    logger,
  })
}

const sendPasswordResetEmail = async ({ to, name, password, logger }) => {
  if (!to) return { skipped: true }
  const template = buildPasswordResetTemplate()
  const variables = {
    USER_NAME: name || to,
    NEW_PASSWORD: password || "",
  }

  return sendTemplateOrFallback({
    to,
    subject: template.subject,
    templateName: PASSWORD_RESET_TEMPLATE_NAME,
    templateDefinition: template,
    variables,
    logger,
  })
}

module.exports = { sendWelcomeEmail, sendCompanyAddedEmail, sendBoletoAdminEmail, sendPasswordResetEmail }
