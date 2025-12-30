const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const {
  addToCartWorkflowId,
  addShippingMethodToCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflowId,
  createPaymentSessionsWorkflow,
  listShippingOptionsForCartWorkflow,
  updateCartWorkflowId,
  updateCustomersWorkflow,
} = require("@medusajs/core-flows")
const { sendEmail } = require("../services/send-email")
const { buildPendingPaymentEmail } = require("../services/pending-payment-email")

const normalizeRecurrences = (value) => {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && item.id && item.items?.length)
}

const clampDayOfMonth = (value, year, month) => {
  const maxDay = new Date(year, month + 1, 0).getDate()
  if (!value) return Math.min(1, maxDay)
  return Math.max(1, Math.min(value, maxDay))
}

const computeNextRun = ({
  frequency,
  dayOfWeek,
  dayOfMonth,
  startDate,
  lastRunAt,
}) => {
  const now = new Date()
  const start = startDate ? new Date(startDate) : now
  const last = lastRunAt ? new Date(lastRunAt) : null

  if (frequency === "monthly") {
    let year = now.getFullYear()
    let month = now.getMonth()
    const safeDay = clampDayOfMonth(dayOfMonth, year, month)
    let candidate = new Date(year, month, safeDay, 8, 0, 0, 0)
    if (candidate < start) {
      year = start.getFullYear()
      month = start.getMonth()
      const alignedDay = clampDayOfMonth(dayOfMonth, year, month)
      candidate = new Date(year, month, alignedDay, 8, 0, 0, 0)
    }
    while (candidate <= now || (last && candidate <= last)) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
      const alignedDay = clampDayOfMonth(dayOfMonth, year, month)
      candidate = new Date(year, month, alignedDay, 8, 0, 0, 0)
    }
    return candidate.toISOString()
  }

  const intervalWeeks = frequency === "biweekly" ? 2 : 1
  const desiredDow = Number.isFinite(dayOfWeek) ? Number(dayOfWeek) : 0
  let candidate = new Date(now)
  const diff = (desiredDow - candidate.getDay() + 7) % 7
  if (diff === 0) {
    candidate.setDate(candidate.getDate() + 7 * intervalWeeks)
  } else {
    candidate.setDate(candidate.getDate() + diff)
  }

  if (candidate < start) {
    candidate = new Date(start)
    const startDiff = (desiredDow - candidate.getDay() + 7) % 7
    candidate.setDate(candidate.getDate() + startDiff)
  }

  if (frequency === "biweekly" && start) {
    while (candidate <= now) {
      candidate.setDate(candidate.getDate() + 14)
    }
    const weeksBetween = Math.floor((candidate - start) / (7 * 24 * 60 * 60 * 1000))
    if (weeksBetween % 2 !== 0) {
      candidate.setDate(candidate.getDate() + 7)
    }
  }

  return candidate.toISOString()
}

const getCustomerBatch = async (remoteQuery, offset, limit) => {
  return remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: {
        limit,
        offset,
        order: { created_at: "DESC" },
      },
      fields: ["id", "email", "metadata"],
    })
  )
}

const findCompany = (customer, companyId) => {
  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  if (!companyId) return companies[0] || null
  return companies.find((company) => company?.id === companyId) || null
}

const buildShippingAddress = (company) => {
  const metadata = company?.metadata || {}
  return {
    first_name: "Condomínio",
    last_name: company?.fantasy_name || company?.trade_name || metadata.name || "Compras",
    address_1: metadata.address || metadata.name || "Endereco nao informado",
    address_2: metadata.complemento || undefined,
    city: metadata.city || "Cidade",
    postal_code: metadata.cep || "00000-000",
    province: metadata.state || "SP",
    country_code: "br",
    phone: metadata.phone || "",
    metadata: {
      company_id: company?.id || null,
      company_name: company?.fantasy_name || company?.trade_name || metadata.name || null,
      company_cnpj: company?.cnpj || metadata.cnpj || null,
    },
  }
}

const extractStripeDetailsFromSession = (session) => {
  if (!session) return {}
  const data = session?.data || {}
  const intent =
    data?.payment_intent?.payment_intent ||
    data?.payment_intent ||
    data
  const nextAction = intent?.next_action || {}
  const boleto = nextAction?.boleto_display_details || {}
  const pix = nextAction?.pix_display_qr_code || nextAction?.pix_display_details || {}
  return {
    boleto_line: boleto?.number || boleto?.barcode || boleto?.line,
    boleto_url: boleto?.hosted_voucher_url || boleto?.url,
    boleto_expires_at: boleto?.expires_at,
    pix_code: pix?.data || pix?.emv || pix?.qr_code?.data,
    pix_qr: pix?.image_url || pix?.qr_code?.image_url || pix?.image,
  }
}

const resolveSalesChannel = async (remoteQuery) => {
  const env = process.env.RECURRENCE_SALES_CHANNEL_ID
  if (env) return env
  const channels = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "sales_channel",
      variables: { limit: 1 },
      fields: ["id"],
    })
  )
  return channels?.[0]?.id || null
}

const resolveRegion = async (remoteQuery) => {
  const env = process.env.RECURRENCE_REGION_ID
  if (env) return env
  const regions = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "region",
      variables: { limit: 1 },
      fields: ["id"],
    })
  )
  return regions?.[0]?.id || null
}

const mergePendingPayments = (current, pending) => {
  const map = new Map()
  for (const item of current) {
    if (!item?.payment_collection_id) continue
    map.set(item.payment_collection_id, item)
  }
  if (pending?.payment_collection_id) {
    const existing = map.get(pending.payment_collection_id)
    map.set(pending.payment_collection_id, {
      ...existing,
      ...pending,
      details: { ...existing?.details, ...pending?.details },
    })
  }
  return Array.from(map.values())
}

const runRecurringPurchases = async function runRecurringPurchases(container) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) || console
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const workflowEngine = container.resolve(Modules.WORKFLOW_ENGINE)

  const salesChannelId = await resolveSalesChannel(remoteQuery)
  const regionId = await resolveRegion(remoteQuery)

  let offset = 0
  const limit = 100
  let batch = await getCustomerBatch(remoteQuery, offset, limit)

  while (batch?.length) {
    for (const customer of batch) {
      const recurrences = normalizeRecurrences(customer?.metadata?.recurrences)
      if (!recurrences.length) continue

      const updatedRecurrences = [...recurrences]
      let pendingPayments = Array.isArray(customer?.metadata?.pending_payments)
        ? customer.metadata.pending_payments
        : []
      let changed = false

      for (let idx = 0; idx < recurrences.length; idx += 1) {
        const recurrence = recurrences[idx]
        if (recurrence.status !== "active") continue
        if (!recurrence.next_run_at) continue

        const due = new Date(recurrence.next_run_at) <= new Date()
        if (!due) continue

        const now = new Date().toISOString()
        try {
          const { result } = await createCartWorkflow(container).run({
            input: {
              customer_id: customer.id,
              sales_channel_id: salesChannelId || undefined,
              region_id: regionId || undefined,
            },
          })

          const cartId = result?.id
          if (!cartId) throw new Error("Falha ao criar carrinho")

          await workflowEngine.run(addToCartWorkflowId, {
            input: {
              cart_id: cartId,
              items: recurrence.items.map((item) => ({
                variant_id: item.variant_id,
                quantity: item.quantity,
              })),
            },
          })

          const company = findCompany(customer, recurrence.company_id)
          const shippingAddress = buildShippingAddress(company)
          await workflowEngine.run(updateCartWorkflowId, {
            input: {
              id: cartId,
              shipping_address: shippingAddress,
            },
          })

          const { result: shippingOptions } = await listShippingOptionsForCartWorkflow(container).run({
            input: { cart_id: cartId, is_return: false },
          })

          const optionId = shippingOptions?.[0]?.id
          if (!optionId) throw new Error("Sem opções de frete para recorrência")

          await addShippingMethodToCartWorkflow(container).run({
            input: {
              cart_id: cartId,
              options: [{ id: optionId }],
            },
          })

          await workflowEngine.run(createPaymentCollectionForCartWorkflowId, {
            input: { cart_id: cartId },
          })

          const [cartCollectionRelation] = await remoteQuery(
            remoteQueryObjectFromString({
              entryPoint: "cart_payment_collection",
              variables: { filters: { cart_id: cartId }, limit: 1 },
              fields: ["payment_collection.id"],
            })
          )
          const paymentCollectionId = cartCollectionRelation?.payment_collection?.id
          if (!paymentCollectionId) {
            throw new Error("Falha ao criar pagamento")
          }

          const providerId = "pp_stripe_stripe"
          const paymentData = {
            payment_method_types:
              recurrence.payment_method === "credit"
                ? ["card"]
                : [recurrence.payment_method],
            capture_method: "automatic",
            confirm: recurrence.payment_method !== "credit",
            payment_method_data:
              recurrence.payment_method === "boleto"
                ? {
                    type: "boleto",
                    boleto: { tax_id: "00000000000" },
                    billing_details: {
                      name: shippingAddress.first_name,
                      email: customer.email,
                      address: {
                        line1: shippingAddress.address_1,
                        line2: shippingAddress.address_2,
                        city: shippingAddress.city,
                        state: shippingAddress.province,
                        postal_code: shippingAddress.postal_code,
                        country: "BR",
                      },
                    },
                  }
                : recurrence.payment_method === "pix"
                  ? {
                      type: "pix",
                      billing_details: {
                        name: shippingAddress.first_name,
                        email: customer.email,
                      },
                    }
                  : undefined,
          }

          await createPaymentSessionsWorkflow(container).run({
            input: {
              payment_collection_id: paymentCollectionId,
              provider_id: providerId,
              customer_id: customer.id,
              data: paymentData,
            },
          })

          const paymentCollection = await remoteQuery(
            remoteQueryObjectFromString({
              entryPoint: "payment_collection",
              variables: { filters: { id: paymentCollectionId }, limit: 1 },
              fields: ["id", "payment_sessions.id", "payment_sessions.provider_id", "payment_sessions.data"],
            })
          )
          const collection = paymentCollection?.[0]
          const session = collection?.payment_sessions?.find((s) => s?.provider_id === providerId)
          const details = extractStripeDetailsFromSession(session)

          const pending = {
            cart_id: cartId,
            payment_collection_id: collection?.id || paymentCollectionId,
            method: recurrence.payment_method,
            created_at: now,
            details,
          }

          pendingPayments = mergePendingPayments(pendingPayments, pending)

          const nextRunAt = computeNextRun({
            frequency: recurrence.frequency,
            dayOfWeek: recurrence.day_of_week,
            dayOfMonth: recurrence.day_of_month,
            startDate: recurrence.start_date,
            lastRunAt: now,
          })

          updatedRecurrences[idx] = {
            ...recurrence,
            last_run_at: now,
            next_run_at: nextRunAt,
            updated_at: now,
          }
          changed = true

          const companyName =
            company?.fantasy_name || company?.trade_name || company?.metadata?.name || "Condomínio"
          const storeUrl = process.env.STORE_URL || process.env.FRONTEND_URL || ""
          const checkoutUrl = storeUrl
            ? `${storeUrl.replace(/\/$/, "")}/checkout?pending=${encodeURIComponent(collection?.id || paymentCollectionId)}`
            : ""
          const { html, text } = buildPendingPaymentEmail({
            method: recurrence.payment_method,
            companyName,
            details,
            checkoutUrl,
          })

          const recipients = [
            company?.metadata?.email,
            company?.metadata?.administradoraEmail,
          ].filter(Boolean)
          if (recipients.length) {
            await sendEmail({
              to: Array.from(new Set(recipients)),
              subject:
                recurrence.payment_method === "boleto"
                  ? `Boleto disponível - ${companyName}`
                  : recurrence.payment_method === "pix"
                    ? `PIX disponível - ${companyName}`
                    : `Pagamento disponível - ${companyName}`,
              html,
              text,
              logger,
            })
          }
        } catch (error) {
          const message = error?.message || "Falha na recorrência"
          logger.warn(`[recurrences] ${customer.id} ${recurrence.id} falhou: ${message}`)
          updatedRecurrences[idx] = {
            ...recurrence,
            status: "paused",
            last_error: message,
            updated_at: new Date().toISOString(),
            next_run_at: null,
          }
          changed = true
        }
      }

      if (changed) {
        const nextMetadata = {
          ...(customer.metadata || {}),
          recurrences: updatedRecurrences,
          pending_payments: pendingPayments,
        }
        await updateCustomersWorkflow(container).run({
          input: {
            selector: { id: customer.id },
            update: { metadata: nextMetadata },
          },
        })
      }
    }

    offset += limit
    batch = await getCustomerBatch(remoteQuery, offset, limit)
  }
}

exports.default = runRecurringPurchases
exports.config = {
  name: "run-recurring-purchases",
  schedule: "0 8 * * *",
}
