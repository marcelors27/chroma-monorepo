const {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
  MedusaError,
} = require("@medusajs/framework/utils")
const { updateOrderWorkflow } = require("@medusajs/core-flows")

const updateOrderStatus = async (scope, id, payload, metadata, actorId) => {
  const cleanPayload = {}
  if (payload?.status) cleanPayload.status = payload.status
  if (payload?.fulfillment_status) cleanPayload.fulfillment_status = payload.fulfillment_status
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
    fields: ["id", "status", "fulfillment_status", "payment_status", "display_id", "metadata"],
  })
  const result = await remoteQuery(query)
  if (Array.isArray(result)) return result[0]
  if (Array.isArray(result?.data)) return result.data[0]
  return result
}

const POST = async (req, res) => {
  const orderId = req.params?.id
  if (!orderId) {
    return res.status(400).json({ message: "order id é obrigatório" })
  }

  try {
    const previous = await fetchOrder(req.scope, orderId)
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
      from_fulfillment_status: previous?.fulfillment_status || null,
      to_status: req.body?.status || previous?.status || null,
      to_fulfillment_status:
        req.body?.fulfillment_status || previous?.fulfillment_status || null,
      status: req.body?.status || previous?.status || null,
      fulfillment_status:
        req.body?.fulfillment_status || previous?.fulfillment_status || null,
      payment_status: previous?.payment_status || null,
    }
    const nextHistory = [...statusHistory, nextEntry].slice(-50)
    const nextMetadata = {
      ...(previous?.metadata || {}),
      status_history: nextHistory,
    }

    await updateOrderStatus(
      req.scope,
      orderId,
      req.body || {},
      nextMetadata,
      req.auth_context?.actor_id || "admin"
    )
    const order = await fetchOrder(req.scope, orderId)
    return res.status(200).json({ order })
  } catch (err) {
    const status = err?.type === MedusaError.Types.INVALID_DATA ? 400 : 500
    return res.status(status).json({ message: err?.message || "Erro ao atualizar pedido." })
  }
}

module.exports = { POST }
