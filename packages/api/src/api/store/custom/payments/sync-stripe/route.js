const pollStripePaymentSessions = require("../../../../../jobs/poll-stripe-payment-sessions")

const POST = async (req, res) => {
  try {
    await pollStripePaymentSessions(req.scope)
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Erro ao sincronizar pagamentos." })
  }
}

module.exports = { POST }
