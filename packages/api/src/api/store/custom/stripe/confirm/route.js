const { MedusaError } = require("@medusajs/framework/utils")

const getStripeClient = () => {
  const apiKey = process.env.STRIPE_API_KEY
  if (!apiKey) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Stripe não configurado.")
  }
  // Lazy require to avoid loading when unused
  // eslint-disable-next-line global-require
  return require("stripe")(apiKey)
}

const extractIntentId = (clientSecret) => {
  if (!clientSecret || typeof clientSecret !== "string") return null
  const [id] = clientSecret.split("_secret_")
  return id || null
}

const POST = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const payload = req.body || {}
  const method = String(payload?.payment_method || "").toLowerCase()
  const clientSecret = payload?.client_secret
  const intentId = extractIntentId(clientSecret)

  if (!intentId) {
    return res.status(400).json({ message: "client_secret inválido." })
  }
  if (!["boleto", "pix"].includes(method)) {
    return res.status(400).json({ message: "payment_method inválido." })
  }

  const rawBilling = payload?.billing_details || {}
  const billingDetails = {
    name: rawBilling?.name,
    email: rawBilling?.email,
    phone: rawBilling?.phone,
    address: rawBilling?.address
      ? {
          line1: rawBilling.address.line1,
          line2: rawBilling.address.line2,
          city: rawBilling.address.city,
          state: rawBilling.address.state,
          postal_code: rawBilling.address.postalCode || rawBilling.address.postal_code,
          country: rawBilling.address.country,
        }
      : undefined,
  }
  const taxId = payload?.tax_id

  try {
    logger?.info?.(
      JSON.stringify({
        msg: "stripe:confirm:start",
        intent_id: intentId,
        method,
        has_billing_details: Boolean(payload?.billing_details),
      })
    )
    const stripe = getStripeClient()
    const payment_method_data = {
      type: method,
      billing_details: billingDetails,
    }
    if (method === "boleto") {
      payment_method_data.boleto = { tax_id: taxId || "00000000000" }
    }
    const payment_intent = await stripe.paymentIntents.confirm(intentId, {
      payment_method_data,
    })
    logger?.info?.(
      JSON.stringify({
        msg: "stripe:confirm:success",
        intent_id: payment_intent?.id,
        status: payment_intent?.status,
      })
    )
    return res.status(200).json({ payment_intent })
  } catch (err) {
    const message = err?.message || "Erro ao confirmar pagamento."
    logger?.error?.(
      JSON.stringify({
        msg: "stripe:confirm:error",
        intent_id: intentId,
        error: message,
      })
    )
    return res.status(500).json({ message })
  }
}

module.exports = { POST }
