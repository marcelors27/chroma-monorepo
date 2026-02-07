const { ModuleProvider, Modules } = require("@medusajs/framework/utils")

const StripeProviderService = require("./services/stripe-provider")

module.exports = ModuleProvider(Modules.PAYMENT, {
  services: [StripeProviderService],
})
