const { ModuleProvider, Modules } = require("@medusajs/framework/utils")

const PixManualProviderService = require("./services/pix-manual")

module.exports = ModuleProvider(Modules.PAYMENT, {
  services: [PixManualProviderService],
})
