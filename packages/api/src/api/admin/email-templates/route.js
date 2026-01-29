const {
  listTemplates,
  createTemplate,
} = require("../../../services/resend-templates")

const GET = async (req, res) => {
  try {
    const list = await listTemplates({
      limit: req.query?.limit,
      after: req.query?.after,
      before: req.query?.before,
    })
    const templates = list?.data || list?.templates || []
    res.json({ templates })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao listar templates" })
  }
}

const normalizeVariables = (variables) => {
  if (!Array.isArray(variables)) return []
  return variables
    .map((entry) => {
      if (!entry) return null
      if (entry.key) return entry
      if (entry.name) return { key: entry.name, type: entry.type, fallback: entry.fallback }
      return null
    })
    .filter(Boolean)
}

const POST = async (req, res) => {
  const payload = req.body || {}
  if (!payload.name || !payload.html) {
    return res.status(400).json({ message: "name e html sao obrigatorios" })
  }
  if (!payload.subject) {
    return res.status(400).json({ message: "subject e obrigatorio" })
  }

  try {
    const created = await createTemplate({
      name: payload.name,
      subject: payload.subject,
      html: payload.html,
      variables: normalizeVariables(payload.variables),
    })
    res.status(201).json({ template: created })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao criar template" })
  }
}

module.exports = { GET, POST }
