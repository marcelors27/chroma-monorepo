const {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { processPaymentWorkflow } = require("@medusajs/core-flows")
const { PaymentSessionStatus } = require("@medusajs/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

const parseLimit = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 100
  return Math.min(Math.max(num, 1), 500)
}

const toDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const collectPendingPixPayments = (customers, filters) => {
  const logs = []
  const companyId = filters?.companyId ? String(filters.companyId) : null
  const txid = filters?.txid ? String(filters.txid).trim() : null
  const paymentCollectionId = filters?.paymentCollectionId
    ? String(filters.paymentCollectionId).trim()
    : null
  const fromDate = toDate(filters?.dateFrom)
  const toDateValue = toDate(filters?.dateTo)
  for (const customer of customers || []) {
    const entries = Array.isArray(customer?.metadata?.pending_payments)
      ? customer.metadata.pending_payments
      : []
    for (const entry of entries) {
      if (!entry || entry.method !== "pix") continue
      if (companyId && String(entry?.details?.company_id || "") !== companyId) continue
      if (paymentCollectionId && String(entry?.payment_collection_id || "") !== paymentCollectionId) continue
      if (txid && String(entry?.details?.pix_txid || "").toLowerCase() !== txid.toLowerCase()) continue
      if (fromDate || toDateValue) {
        const createdAt = entry?.created_at ? new Date(entry.created_at) : null
        if (!createdAt || Number.isNaN(createdAt.getTime())) continue
        if (fromDate && createdAt < fromDate) continue
        if (toDateValue && createdAt > toDateValue) continue
      }
      logs.push({
        ...entry,
        user_id: customer.id,
        user_email: customer.email,
        user_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
      })
    }
  }
  logs.sort((a, b) => {
    const aTime = a?.created_at ? Date.parse(a.created_at) : 0
    const bTime = b?.created_at ? Date.parse(b.created_at) : 0
    return bTime - aTime
  })
  return logs
}

const removePendingPaymentFromCustomer = async (scope, customer, paymentCollectionId) => {
  if (!customer) return
  const metadata = customer?.metadata || {}
  const current = Array.isArray(metadata?.pending_payments) ? metadata.pending_payments : []
  if (!current.length) return
  const next = current.filter((item) => item?.payment_collection_id !== paymentCollectionId)
  await updateCustomersWorkflow(scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...metadata, pending_payments: next } },
    },
  })
}

const appendPixManualLog = async (scope, customer, payload) => {
  if (!customer) return
  const metadata = customer?.metadata || {}
  const current = Array.isArray(metadata?.pix_manual_logs) ? metadata.pix_manual_logs : []
  const entry = {
    type: "pix_manual_confirmed",
    payment_collection_id: payload?.payment_collection_id || null,
    session_id: payload?.session_id || null,
    actor_user_id: payload?.actor_user_id || null,
    actor_type: payload?.actor_type || null,
    ip: payload?.ip || null,
    user_agent: payload?.user_agent || null,
    created_at: new Date().toISOString(),
  }
  const next = [entry, ...current].slice(0, 50)
  await updateCustomersWorkflow(scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...metadata, pix_manual_logs: next } },
    },
  })
}

const GET = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const userId = req.query?.user_id || req.query?.userId || null
  const companyId = req.query?.company_id || req.query?.companyId || null
  const txid = req.query?.txid || null
  const paymentCollectionId = req.query?.payment_collection_id || req.query?.paymentCollectionId || null
  const dateFrom = req.query?.date_from || req.query?.dateFrom || null
  const dateTo = req.query?.date_to || req.query?.dateTo || null
  const limit = parseLimit(req.query?.limit)
  const offset = Number(req.query?.offset || 0)

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: userId ? { id: userId } : {},
      limit: userId ? 1 : 500,
    },
    fields: ["id", "email", "first_name", "last_name", "metadata", "created_at"],
  })

  try {
    const customers = await remoteQuery(query)
    const logs = collectPendingPixPayments(customers, {
      companyId,
      txid,
      paymentCollectionId,
      dateFrom,
      dateTo,
    })
    const paginated = logs.slice(offset, offset + limit)
    res.json({ logs: paginated, total: logs.length, limit, offset })
  } catch (err) {
    logger?.warn?.("[pending-pix] falha", { error: err?.message })
    res.status(500).json({ message: "Erro ao listar pendências PIX" })
  }
}

const POST = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const paymentCollectionId =
    req.body?.payment_collection_id || req.body?.paymentCollectionId
  const customerId = req.body?.customer_id || req.body?.customerId || null

  if (!paymentCollectionId) {
    return res.status(400).json({ message: "payment_collection_id obrigatório." })
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const paymentCollections = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "payment_collection",
      variables: { filters: { id: paymentCollectionId }, limit: 1 },
      fields: [
        "id",
        "payment_sessions.id",
        "payment_sessions.provider_id",
        "payment_sessions.status",
        "payment_sessions.amount",
        "payment_sessions.currency_code",
        "payment_sessions.data",
      ],
    })
  )
  const collection = paymentCollections?.[0]
  const sessions = collection?.payment_sessions || []
  const target = sessions.find(
    (session) =>
      session?.provider_id === "pp_pix_manual_pix_manual"
  )

  if (!target?.id) {
    return res.status(404).json({ message: "Sessão PIX manual não encontrada." })
  }

  await processPaymentWorkflow(req.scope).run({
    input: {
      action: PaymentActions.SUCCESSFUL,
      data: {
        session_id: target.id,
        amount: target.amount,
      },
    },
  })

  const paymentModule = req.scope.resolve(Modules.PAYMENT)
  const paymentSessionService =
    paymentModule?.paymentSessionService_ || paymentModule?.paymentSessionService
  if (paymentSessionService?.update) {
    try {
      await paymentSessionService.update({
        id: target.id,
        status: PaymentSessionStatus.CAPTURED,
        data: { ...(target.data || {}), status: "captured" },
      })
    } catch (err) {
      logger?.warn?.("[pending-pix] session update failed", { error: err?.message })
    }
  }

  let customer = null
  if (customerId) {
    const customerResult = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "customer",
        variables: { filters: { id: customerId }, limit: 1 },
        fields: ["id", "metadata"],
      })
    )
    customer = customerResult?.[0]
  } else {
    const customers = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "customer",
        variables: { limit: 500 },
        fields: ["id", "metadata"],
      })
    )
    customer =
      customers?.find((item) =>
        Array.isArray(item?.metadata?.pending_payments) &&
        item.metadata.pending_payments.some(
          (pending) => pending?.payment_collection_id === paymentCollectionId
        )
      ) || null
  }

  if (customer) {
    await removePendingPaymentFromCustomer(req.scope, customer, paymentCollectionId)
    try {
      const forwardedFor = req.headers["x-forwarded-for"]
      const ip = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(",")?.[0]?.trim() || req.ip
      await appendPixManualLog(req.scope, customer, {
        payment_collection_id: paymentCollectionId,
        session_id: target.id,
        actor_user_id: req.auth_context?.actor_id || null,
        actor_type: req.auth_context?.actor_type || null,
        ip,
        user_agent: req.headers["user-agent"] || null,
      })
    } catch (err) {
      logger?.warn?.("[pending-pix] log failed", { error: err?.message })
    }
  }

  return res.status(200).json({ ok: true, payment_collection_id: paymentCollectionId })
}

module.exports = { GET, POST }
