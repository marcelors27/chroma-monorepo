const { AbstractPaymentProvider, PaymentSessionStatus, PaymentActions } = require("@medusajs/framework/utils")
const { generatePix, buildTxId } = require("../../../services/pix")

class PixManualProviderService extends AbstractPaymentProvider {
  static identifier = "pix_manual"

  static validateOptions(options) {
    if (!options?.pixKey) {
      throw new Error("Required option `pixKey` is missing in Pix manual provider")
    }
    if (!options?.merchantName) {
      throw new Error("Required option `merchantName` is missing in Pix manual provider")
    }
    if (!options?.merchantCity) {
      throw new Error("Required option `merchantCity` is missing in Pix manual provider")
    }
  }

  constructor(container, options) {
    // @ts-ignore
    super(...arguments)
    this.container_ = container
    this.options_ = options || {}
  }

  get options() {
    return this.options_
  }

  async initiatePayment({ currency_code, amount, data }) {
    const txid =
      data?.payment_collection_id ||
      data?.metadata?.payment_collection_id ||
      data?.session_id
    const expiresAfterDays = Number(data?.pix_expires_after_days || 0) || null
    const expiresAt =
      expiresAfterDays && Number.isFinite(expiresAfterDays)
        ? Math.floor(Date.now() / 1000) + expiresAfterDays * 24 * 60 * 60
        : data?.pix_expires_at || null
    const { pix_code, pix_qr } = await generatePix({
      key: this.options_.pixKey,
      merchantName: this.options_.merchantName,
      merchantCity: this.options_.merchantCity,
      amount: typeof amount === "number" ? amount : 0,
      txid: buildTxId(txid),
      description: this.options_.description,
    })

    return {
      id: data?.session_id || buildTxId(txid),
      status: PaymentSessionStatus.PENDING,
      data: {
        currency_code,
        amount,
        payment_method_type: "pix",
        payment_method_types: ["pix"],
        status: "pending",
        pix_code,
        pix_qr,
        pix_txid: buildTxId(txid),
        pix_expires_after_days: expiresAfterDays || undefined,
        pix_expires_at: expiresAt || undefined,
      },
    }
  }

  async authorizePayment(input) {
    return this.getPaymentStatus(input)
  }

  async capturePayment({ data }) {
    return { data: { ...data, status: "captured" } }
  }

  async cancelPayment({ data }) {
    return { data: { ...data, status: "canceled" } }
  }

  async deletePayment(input) {
    return await this.cancelPayment(input)
  }

  async refundPayment({ data }) {
    return { data }
  }

  async retrievePayment({ data }) {
    return { data }
  }

  async updatePayment({ data, currency_code, amount }) {
    if (typeof amount === "number" && data?.amount === amount) {
      return this.getStatus(data)
    }
    const txid = data?.pix_txid || data?.payment_collection_id || data?.session_id
    const expiresAfterDays = Number(data?.pix_expires_after_days || 0) || null
    const expiresAt =
      data?.pix_expires_at ||
      (expiresAfterDays && Number.isFinite(expiresAfterDays)
        ? Math.floor(Date.now() / 1000) + expiresAfterDays * 24 * 60 * 60
        : null)
    const { pix_code, pix_qr } = await generatePix({
      key: this.options_.pixKey,
      merchantName: this.options_.merchantName,
      merchantCity: this.options_.merchantCity,
      amount: typeof amount === "number" ? amount : 0,
      txid: buildTxId(txid),
      description: this.options_.description,
    })
    return {
      status: PaymentSessionStatus.PENDING,
      data: {
        ...data,
        currency_code,
        amount,
        payment_method_type: "pix",
        payment_method_types: ["pix"],
        status: "pending",
        pix_code,
        pix_qr,
        pix_expires_after_days: expiresAfterDays || undefined,
        pix_expires_at: expiresAt || undefined,
      },
    }
  }

  getStatus(data) {
    if (data?.status === "captured") {
      return { status: PaymentSessionStatus.CAPTURED, data }
    }
    if (data?.status === "canceled") {
      return { status: PaymentSessionStatus.CANCELED, data }
    }
    return { status: PaymentSessionStatus.PENDING, data }
  }

  async getPaymentStatus({ data }) {
    return this.getStatus(data)
  }

  async getWebhookActionAndData() {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

module.exports = PixManualProviderService
