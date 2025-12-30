const { Modules } = require("@medusajs/framework/utils")

const WEBHOOK_EVENT = "custom.payment_webhook_received"

const POST = async (req, res) => {
  try {
    const { provider } = req.params
    const options =
      // @ts-expect-error Not sure if .options exists on a module
      req.scope.resolve(Modules.PAYMENT).options || {}

    const event = {
      provider,
      payload: { data: req.body, rawData: req.rawBody, headers: req.headers },
    }

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    await eventBus.emit(
      { name: WEBHOOK_EVENT, data: event },
      {
        delay: options.webhook_delay || 5000,
        attempts: options.webhook_retries || 3,
      }
    )
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  res.sendStatus(200)
}

module.exports = { POST }
