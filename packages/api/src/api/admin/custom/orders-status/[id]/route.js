const {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
  MedusaError,
} = require("@medusajs/framework/utils")
const { updateOrderWorkflow, updateCustomersWorkflow } = require("@medusajs/core-flows")
const { publishNotificationEvent } = require("../../../../../services/realtime-ws")

const updateOrderStatus = async (scope, id, payload, metadata, actorId) => {
  const cleanPayload = {}
  if (payload?.status && payload.status !== "processing") cleanPayload.status = payload.status
  if (metadata) cleanPayload.metadata = metadata

  if (!Object.keys(cleanPayload).length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Nenhum campo para atualizar.")
  }

  try {
    await updateOrderWorkflow(scope).run({
      input: {
        id,
        user_id: actorId,
        ...cleanPayload,
      },
    })
    return
  } catch (err) {
    throw err
  }
}

const fetchOrder = async (scope, id) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "orders",
    variables: { filters: { id }, limit: 1 },
    fields: [
      "id",
      "status",
      "fulfillment_status",
      "payment_status",
      "display_id",
      "customer_id",
      "shipping_address.metadata",
      "metadata",
    ],
  })
  const result = await remoteQuery(query)
  const order = Array.isArray(result)
    ? result[0]
    : Array.isArray(result?.data)
      ? result.data[0]
      : result

  if (!order) return order

  const manualFulfillmentStatus = order?.metadata?.manual_fulfillment_status
  if (manualFulfillmentStatus) {
    return { ...order, fulfillment_status: manualFulfillmentStatus }
  }
  return order
}

const normalizeStatus = (value) => String(value || "").toLowerCase().trim()

const ORDER_STATUS_LABELS = {
  pending: "Pendente",
  confirmed: "Confirmado",
  processing: "Em processamento",
  completed: "Concluído",
  canceled: "Cancelado",
  requires_action: "Requer ação",
}

const FULFILLMENT_STATUS_LABELS = {
  not_fulfilled: "Não separado",
  partially_fulfilled: "Parcialmente separado",
  fulfilled: "Separado",
  shipped: "Saiu para entrega",
  delivered: "Entregue",
  canceled: "Entrega cancelada",
  requires_action: "Entrega com ação pendente",
}

const getStatusLabel = (status, type = "order") => {
  const normalized = normalizeStatus(status)
  if (type === "fulfillment") {
    return FULFILLMENT_STATUS_LABELS[normalized] || status || "Atualizado"
  }
  return ORDER_STATUS_LABELS[normalized] || status || "Atualizado"
}

const buildOrderUpdateNotification = ({ order, previous, next }) => {
  const orderCode = order?.display_id ? `#${order.display_id}` : `#${String(order?.id || "").slice(0, 8)}`
  const previousOrderStatus = normalizeStatus(previous?.status)
  const nextOrderStatus = normalizeStatus(next?.status)
  const previousFulfillmentStatus = normalizeStatus(previous?.fulfillment_status)
  const nextFulfillmentStatus = normalizeStatus(next?.fulfillment_status)
  const companyName = order?.shipping_address?.metadata?.company_name

  const orderStatusChanged = previousOrderStatus !== nextOrderStatus
  const fulfillmentStatusChanged = previousFulfillmentStatus !== nextFulfillmentStatus

  if (!orderStatusChanged && !fulfillmentStatusChanged) return null

  if (fulfillmentStatusChanged) {
    return {
      status: "delivery_updated",
      title: `Entrega atualizada (${orderCode})`,
      message: `${companyName ? `${companyName}: ` : ""}${getStatusLabel(next.fulfillment_status, "fulfillment")}`,
      order_id: order.id,
      company_id: order?.shipping_address?.metadata?.company_id || null,
      metadata: {
        previous_fulfillment_status: previous.fulfillment_status || null,
        next_fulfillment_status: next.fulfillment_status || null,
        order_status: next.status || null,
      },
    }
  }

  return {
    status: "order_updated",
    title: `Pedido atualizado (${orderCode})`,
    message: `${companyName ? `${companyName}: ` : ""}${getStatusLabel(next.status, "order")}`,
    order_id: order.id,
    company_id: order?.shipping_address?.metadata?.company_id || null,
    metadata: {
      previous_order_status: previous.status || null,
      next_order_status: next.status || null,
      fulfillment_status: next.fulfillment_status || null,
    },
  }
}

const appendCustomerNotification = async (scope, customerId, notification) => {
  if (!customerId || !notification) return
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "metadata"],
  })
  const customers = await remoteQuery(query)
  const customer = customers?.[0]
  if (!customer) return

  const current = Array.isArray(customer?.metadata?.notifications_history)
    ? customer.metadata.notifications_history
    : []
  const dedupeKey = `${notification.status}|${notification.order_id}|${notification.message}`
  const deduped = current.filter((item) => item?.dedupe_key !== dedupeKey)
  const next = [
    {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      status: notification.status,
      order_id: notification.order_id || null,
      company_id: notification.company_id || null,
      metadata: notification.metadata || {},
      created_at: notification.created_at,
      read: false,
      dedupe_key: dedupeKey,
    },
    ...deduped,
  ].slice(0, 200)

  await updateCustomersWorkflow(scope).run({
    input: {
      selector: { id: customerId },
      update: {
        metadata: {
          ...(customer.metadata || {}),
          notifications_history: next,
        },
      },
    },
  })
}

const POST = async (req, res) => {
  const orderId = req.params?.id
  if (!orderId) {
    return res.status(400).json({ message: "order id é obrigatório" })
  }

  try {
    const previous = await fetchOrder(req.scope, orderId)
    const previousFulfillmentStatus =
      previous?.metadata?.manual_fulfillment_status || previous?.fulfillment_status || null
    const actor =
      req?.user?.email ||
      req?.user?.id ||
      req?.auth_context?.actor_id ||
      "admin"
    const now = new Date().toISOString()
    const statusHistory = Array.isArray(previous?.metadata?.status_history)
      ? previous.metadata.status_history
      : []
    const nextEntry = {
      at: now,
      actor,
      from_status: previous?.status || null,
      from_fulfillment_status: previousFulfillmentStatus,
      to_status: req.body?.status || previous?.status || null,
      to_fulfillment_status:
        req.body?.fulfillment_status || previousFulfillmentStatus,
      status: req.body?.status || previous?.status || null,
      fulfillment_status:
        req.body?.fulfillment_status || previousFulfillmentStatus,
      payment_status: previous?.payment_status || null,
    }
    const nextHistory = [...statusHistory, nextEntry].slice(-50)
    const nextMetadata = {
      ...(previous?.metadata || {}),
      status_history: nextHistory,
      manual_fulfillment_status:
        req.body?.fulfillment_status ??
        previous?.metadata?.manual_fulfillment_status ??
        null,
    }

    await updateOrderStatus(
      req.scope,
      orderId,
      req.body || {},
      nextMetadata,
      req.auth_context?.actor_id || "admin"
    )
    const order = await fetchOrder(req.scope, orderId)

    const notification = buildOrderUpdateNotification({
      order,
      previous: {
        status: previous?.status || null,
        fulfillment_status: previousFulfillmentStatus || null,
      },
      next: {
        status: req.body?.status || order?.status || null,
        fulfillment_status:
          req.body?.fulfillment_status ||
          order?.metadata?.manual_fulfillment_status ||
          order?.fulfillment_status ||
          null,
      },
    })

    if (notification && order?.customer_id) {
      const eventPayload = {
        ...notification,
        id: `${order.id}:${Date.now()}`,
        created_at: new Date().toISOString(),
      }
      await appendCustomerNotification(req.scope, order.customer_id, eventPayload)
      publishNotificationEvent({
        customerId: order.customer_id,
        companyId: notification.company_id || null,
        type: "notification.order_status",
        notification: eventPayload,
        data: {
          order_id: order.id,
          status: notification.status,
        },
      })
    }

    return res.status(200).json({ order })
  } catch (err) {
    const status = err?.type === MedusaError.Types.INVALID_DATA ? 400 : 500
    return res.status(status).json({ message: err?.message || "Erro ao atualizar pedido." })
  }
}

const DELETE = async (req, res) => {
  const orderId = req.params?.id
  if (!orderId) {
    return res.status(400).json({ message: "order id é obrigatório" })
  }

  try {
    const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const now = new Date()
    const updated = await db("order")
      .where({ id: orderId })
      .whereNull("deleted_at")
      .update({ deleted_at: now, updated_at: now })

    if (!updated) {
      return res.status(404).json({ message: "Pedido não encontrado." })
    }

    return res.status(200).json({ id: orderId, object: "order", deleted: true })
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Erro ao excluir pedido." })
  }
}

module.exports = { POST, DELETE }
