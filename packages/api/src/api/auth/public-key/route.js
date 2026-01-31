const { resolvePublicKey } = require("../../../services/auth-encryption")

const GET = async (_req, res) => {
  const publicKey = resolvePublicKey()
  return res.json({ public_key: publicKey })
}

module.exports = { GET }
