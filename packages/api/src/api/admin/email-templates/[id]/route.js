const {
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../../../../services/resend-templates")

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

const GET = async (req, res) => {
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing template id" })
  try {
    const template = await getTemplate(id)
    res.json({ template })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao buscar template" })
  }
}

const PATCH = async (req, res) => {
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing template id" })
  const payload = req.body || {}
  try {
    const template = await updateTemplate(id, {
      ...payload,
      variables: payload.variables ? normalizeVariables(payload.variables) : undefined,
    })
    res.json({ template })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao atualizar template" })
  }
}

const DELETE = async (req, res) => {
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing template id" })
  try {
    const deleted = await deleteTemplate(id)
    res.json({ template: deleted })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao remover template" })
  }
}

module.exports = { GET, PATCH, DELETE }
