const { generatePixQrBuffer } = require("../../../../../services/pix")

const GET = async (req, res) => {
  const code = req.query?.code
  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "code obrigatório" })
  }
  try {
    const buffer = await generatePixQrBuffer(code)
    res.setHeader("Content-Type", "image/png")
    return res.status(200).send(buffer)
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Falha ao gerar QR" })
  }
}

module.exports = { GET }
