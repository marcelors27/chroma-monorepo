const { publishTemplate } = require("../../../../../services/resend-templates")

const POST = async (req, res) => {
  const id = req.params?.id
  if (!id) return res.status(400).json({ message: "Missing template id" })
  try {
    const template = await publishTemplate(id)
    res.json({ template })
  } catch (err) {
    res.status(err?.status || 500).json({ message: err?.message || "Erro ao publicar template" })
  }
}

module.exports = { POST }
