const WELCOME_TEMPLATE_NAME = "Chroma | Boas-vindas"
const COMPANY_ADDED_TEMPLATE_NAME = "Chroma | Condominio adicionado"
const BOLETO_ADMIN_TEMPLATE_NAME = "Chroma | Boleto para administradora"
const PASSWORD_RESET_TEMPLATE_NAME = "Chroma | Reset de senha"

const buildWelcomeTemplate = () => {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 16px;">Bem-vindo ao Chroma, {{{USER_NAME}}}</h2>
    <p style="margin: 0 0 12px;">Seu cadastro foi concluido com sucesso.</p>
    <p style="margin: 0 0 12px;">Condominios adicionados:</p>
    <div style="padding: 12px; background: #f3f4f6; border-radius: 8px;">{{{CONDOS_LIST}}}</div>
    <p style="margin: 16px 0 0;">Acesse a plataforma para acompanhar pedidos, recorrencias e pontos.</p>
    <p style="margin: 8px 0 0;"><a href="{{{DASHBOARD_URL}}}" style="color: #2563eb;">Entrar no Chroma</a></p>
  </div>
  `.trim()

  return {
    name: WELCOME_TEMPLATE_NAME,
    subject: "Bem-vindo ao Chroma",
    html,
    variables: [
      { key: "USER_NAME", type: "string", fallback: "" },
      { key: "CONDOS_LIST", type: "string", fallback: "Nenhum condominio adicionado ainda." },
      { key: "DASHBOARD_URL", type: "string", fallback: "" },
    ],
  }
}

const buildCompanyAddedTemplate = () => {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 16px;">Condominio adicionado com sucesso</h2>
    <p style="margin: 0 0 12px;">Ola {{{USER_NAME}}}, um novo condominio foi vinculado a sua conta.</p>
    <ul style="margin: 0 0 12px; padding-left: 20px;">
      <li><strong>Nome:</strong> {{{COMPANY_NAME}}}</li>
      <li><strong>CNPJ:</strong> {{{COMPANY_CNPJ}}}</li>
      <li><strong>Total de condominios:</strong> {{{COMPANY_TOTAL}}}</li>
    </ul>
    <p style="margin: 16px 0 0;">Se voce nao reconhece essa adicao, responda este email.</p>
  </div>
  `.trim()

  return {
    name: COMPANY_ADDED_TEMPLATE_NAME,
    subject: "Novo condominio adicionado",
    html,
    variables: [
      { key: "USER_NAME", type: "string", fallback: "" },
      { key: "COMPANY_NAME", type: "string", fallback: "" },
      { key: "COMPANY_CNPJ", type: "string", fallback: "" },
      { key: "COMPANY_TOTAL", type: "string", fallback: "0" },
    ],
  }
}

const buildBoletoAdminTemplate = () => {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 16px;">Boleto para administradora</h2>
    <p style="margin: 0 0 12px;">Segue o boleto do condominio {{{COMPANY_NAME}}}.</p>
    <ul style="margin: 0 0 12px; padding-left: 20px;">
      <li><strong>Linha digitavel:</strong> {{{BOLETO_LINE}}}</li>
      <li><strong>Validade:</strong> {{{BOLETO_EXPIRES_AT}}}</li>
    </ul>
    <p style="margin: 0 0 12px;">
      <a href="{{{BOLETO_URL}}}" style="color: #2563eb;">Abrir boleto</a>
    </p>
    <p style="margin: 16px 0 0;">O PDF tambem foi anexado a este email.</p>
  </div>
  `.trim()

  return {
    name: BOLETO_ADMIN_TEMPLATE_NAME,
    subject: "Boleto para administradora",
    html,
    variables: [
      { key: "COMPANY_NAME", type: "string", fallback: "" },
      { key: "BOLETO_LINE", type: "string", fallback: "" },
      { key: "BOLETO_URL", type: "string", fallback: "" },
      { key: "BOLETO_EXPIRES_AT", type: "string", fallback: "" },
    ],
  }
}

const buildPasswordResetTemplate = () => {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 16px;">Senha redefinida</h2>
    <p style="margin: 0 0 12px;">Olá {{{USER_NAME}}}, sua senha foi redefinida.</p>
    <p style="margin: 0 0 12px;">Sua nova senha temporária é:</p>
    <div style="padding:12px 16px;background:#f3f4f6;border-radius:8px;font-weight:700;">
      {{{NEW_PASSWORD}}}
    </div>
    <p style="margin: 16px 0 0;">Recomendamos trocar a senha no primeiro acesso.</p>
  </div>
  `.trim()

  return {
    name: PASSWORD_RESET_TEMPLATE_NAME,
    subject: "Sua senha foi redefinida",
    html,
    variables: [
      { key: "USER_NAME", type: "string", fallback: "" },
      { key: "NEW_PASSWORD", type: "string", fallback: "" },
    ],
  }
}

const renderTemplateHtml = (template, variables) => {
  let html = template.html
  Object.entries(variables || {}).forEach(([key, value]) => {
    const safeValue = value === null || value === undefined ? "" : String(value)
    html = html
      .replace(new RegExp(`{{{${key}}}}`, "g"), safeValue)
      .replace(new RegExp(`{{${key}}}`, "g"), safeValue)
  })
  return html
}

module.exports = {
  WELCOME_TEMPLATE_NAME,
  COMPANY_ADDED_TEMPLATE_NAME,
  BOLETO_ADMIN_TEMPLATE_NAME,
  PASSWORD_RESET_TEMPLATE_NAME,
  buildWelcomeTemplate,
  buildCompanyAddedTemplate,
  buildBoletoAdminTemplate,
  buildPasswordResetTemplate,
  renderTemplateHtml,
}
