const { PaymentActions, isPresent } = require("@medusajs/framework/utils")

const StripeBase =
  require("@medusajs/payment-stripe/dist/core/stripe-base")?.default ||
  require("@medusajs/payment-stripe/dist/core/stripe-base")
const PaymentProviderKeys =
  require("@medusajs/payment-stripe/dist/types")?.PaymentProviderKeys ||
  require("@medusajs/payment-stripe/dist/types").PaymentProviderKeys

class StripeProviderService extends StripeBase {
  constructor(_, options) {
    super(_, options)
  }

  get paymentIntentOptions() {
    return {}
  }

  async initiatePayment({ currency_code, amount, data, context }) {
    const additionalParameters = this.normalizePaymentIntentParameters(data)
    const intentRequest = {
      amount,
      currency: currency_code,
      metadata: {
        ...(data?.metadata ?? {}),
        session_id: data?.session_id,
      },
      ...additionalParameters,
    }
    intentRequest.customer = context?.account_holder?.data?.id

    const sessionData = await this.executeWithRetry(() =>
      this.stripe_.paymentIntents.create(intentRequest, {
        idempotencyKey: context?.idempotency_key,
      })
    )

    const isPaymentIntent = "id" in sessionData
    return {
      id: isPaymentIntent ? sessionData.id : data?.session_id,
      ...this.getStatus(sessionData),
    }
  }

  async refundPayment({ amount, data, context }) {
    const id = data?.id
    if (!id) {
      throw this.buildError(
        "No payment intent ID provided while refunding payment",
        new Error("No payment intent ID provided")
      )
    }
    try {
      await this.stripe_.refunds.create(
        {
          amount,
          payment_intent: id,
        },
        {
          idempotencyKey: context?.idempotency_key,
        }
      )
    } catch (e) {
      throw this.buildError("An error occurred in refundPayment", e)
    }
    return { data }
  }

  async retrievePayment({ data }) {
    try {
      const id = data?.id
      const intent = await this.stripe_.paymentIntents.retrieve(id)
      return { data: intent }
    } catch (e) {
      throw this.buildError("An error occurred in retrievePayment", e)
    }
  }

  async updatePayment({ data, currency_code, amount, context }) {
    const amountNumeric = amount
    if (isPresent(amount) && data?.amount === amountNumeric) {
      return this.getStatus(data)
    }

    try {
      const id = data?.id
      const intentRequest = {
        amount: amountNumeric,
        currency: currency_code,
        metadata: data?.metadata,
      }
      const sessionData = await this.executeWithRetry(() =>
        this.stripe_.paymentIntents.update(id, intentRequest, {
          idempotencyKey: context?.idempotency_key,
        })
      )
      return this.getStatus(sessionData)
    } catch (e) {
      throw this.buildError(
        "An error occurred in updatePayment during update of stripe payment intent",
        e
      )
    }
  }

  async getWebhookActionAndData(webhookData) {
    const event = this.constructWebhookEvent(webhookData)
    const intent = event.data.object
    switch (event.type) {
      case "payment_intent.created":
      case "payment_intent.processing":
        return {
          action: PaymentActions.PENDING,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount,
          },
        }
      case "payment_intent.canceled":
        return {
          action: PaymentActions.CANCELED,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount,
          },
        }
      case "payment_intent.payment_failed":
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount,
          },
        }
      case "payment_intent.requires_action":
        return {
          action: PaymentActions.REQUIRES_MORE,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount,
          },
        }
      case "payment_intent.amount_capturable_updated":
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount_capturable,
          },
        }
      case "payment_intent.partially_funded":
        return {
          action: PaymentActions.REQUIRES_MORE,
          data: {
            session_id: intent.metadata.session_id,
            amount:
              intent.next_action?.display_bank_transfer_instructions
                ?.amount_remaining ?? intent.amount,
          },
        }
      case "payment_intent.succeeded":
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: intent.metadata.session_id,
            amount: intent.amount_received,
          },
        }
      default:
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}

StripeProviderService.identifier = PaymentProviderKeys.STRIPE

module.exports = StripeProviderService
