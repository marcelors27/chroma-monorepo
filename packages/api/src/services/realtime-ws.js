const http = require("http")
const jwt = require("jsonwebtoken")
const { randomUUID } = require("crypto")
const { WebSocketServer, WebSocket } = require("ws")

let createRedisClient = null
try {
  ;({ createClient: createRedisClient } = require("redis"))
} catch {
  // optional dependency for realtime fanout across processes
}

const WS_PORT = Number(process.env.REALTIME_WS_PORT || process.env.WS_PORT || process.env.PORT || 9001)
const WS_HOST = process.env.REALTIME_WS_HOST || "0.0.0.0"
const REDIS_URL = process.env.REDIS_URL || ""
const REALTIME_EVENTS_CHANNEL = process.env.REALTIME_EVENTS_CHANNEL || "chroma:realtime:events"
const EMBEDDED_WS_ENABLED =
  process.env.REALTIME_EMBEDDED_WS === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.REALTIME_EMBEDDED_WS !== "false")

const CHANNEL_PATHS = {
  carts: "/store/custom/carts/ws",
  orders: "/store/custom/orders/ws",
  notifications: "/store/custom/notifications/ws",
}

const EVENT_CHANNELS = new Set(["carts", "orders", "notifications"])

const state = {
  started: false,
  server: null,
  wss: null,
  sockets: new Set(),
  cartSockets: new Map(),
  orderSockets: new Set(),
  notificationSockets: new Set(),
  socketMeta: new Map(),
  logger: console,
  instanceId: process.env.REALTIME_INSTANCE_ID || randomUUID(),
  redisPublisher: null,
  redisSubscriber: null,
  redisPublisherPromise: null,
  redisSubscriberPromise: null,
  redisSubscribed: false,
  warnedNoFanout: false,
  warnedRedisDependency: false,
  warnedEmbeddedDisabled: false,
}

const safeLog = (logger, level, payload) => {
  const fn = logger?.[level] || logger?.info || console.log
  try {
    fn.call(logger, typeof payload === "string" ? payload : JSON.stringify(payload))
  } catch {
    fn.call(logger, payload)
  }
}

const canUseRedisFanout = () => {
  if (!REDIS_URL) return false
  if (createRedisClient) return true
  if (!state.warnedRedisDependency) {
    safeLog(state.logger, "warn", {
      msg: "realtime-ws:redis_client_missing",
      hint: "Install dependency 'redis' in @chroma/api to enable cross-process websocket fanout.",
    })
    state.warnedRedisDependency = true
  }
  return false
}

const normalizeTokenPayload = (token) => {
  if (!token) return null
  const secrets = Array.from(new Set([process.env.JWT_SECRET, "supersecret"].filter(Boolean)))
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret)
    } catch {
      // try next secret
    }
  }
  try {
    return jwt.decode(token)
  } catch {
    return null
  }
}

const resolveCustomerId = (payload) => {
  if (!payload || typeof payload !== "object") return null
  return (
    payload.customer_id ||
    payload.actor_id ||
    payload.app_metadata?.customer_id ||
    payload.user_metadata?.customer_id ||
    null
  )
}

const getRequestContext = (requestUrl) => {
  const parsed = new URL(requestUrl, `http://${WS_HOST}:${WS_PORT}`)
  const pathname = parsed.pathname
  const token = parsed.searchParams.get("token") || ""
  const cartId = parsed.searchParams.get("cart_id") || null
  const payload = normalizeTokenPayload(token)
  const customerId = resolveCustomerId(payload)
  return { pathname, cartId, payload, customerId }
}

const rejectUpgrade = (socket, statusCode, message) => {
  try {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\n${message}`
    )
  } finally {
    try {
      socket.destroy()
    } catch {
      // ignore
    }
  }
}

const addCartSocket = (cartId, socket) => {
  if (!cartId) return
  let bucket = state.cartSockets.get(cartId)
  if (!bucket) {
    bucket = new Set()
    state.cartSockets.set(cartId, bucket)
  }
  bucket.add(socket)
}

const removeCartSocket = (cartId, socket) => {
  if (!cartId) return
  const bucket = state.cartSockets.get(cartId)
  if (!bucket) return
  bucket.delete(socket)
  if (bucket.size === 0) {
    state.cartSockets.delete(cartId)
  }
}

const cleanupSocket = (socket) => {
  const meta = state.socketMeta.get(socket)
  if (!meta) return
  if (meta.channel === "carts") removeCartSocket(meta.cartId, socket)
  if (meta.channel === "orders") state.orderSockets.delete(socket)
  if (meta.channel === "notifications") state.notificationSockets.delete(socket)
  state.sockets.delete(socket)
  state.socketMeta.delete(socket)
}

const sendToSocket = (socket, payload) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false
  try {
    socket.send(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

const isSocketEligible = (meta, filters) => {
  const filterCustomerId = filters?.customer_id || filters?.customerId || null
  if (!filterCustomerId) return true
  if (!meta?.customerId) return false
  return meta.customerId === filterCustomerId
}

const publishToSockets = (sockets, payload, filters = null) => {
  let sent = 0
  for (const socket of sockets) {
    const meta = state.socketMeta.get(socket)
    if (!isSocketEligible(meta, filters)) continue
    if (sendToSocket(socket, payload)) sent += 1
  }
  return sent
}

const publishCartEventLocal = ({ cartId, type = "cart.updated", data = null, ts = null }) => {
  if (!state.started || !cartId) return 0
  const sockets = state.cartSockets.get(cartId)
  if (!sockets?.size) return 0
  const payload = {
    type,
    cart_id: cartId,
    data: data || undefined,
    ts: ts || new Date().toISOString(),
  }
  return publishToSockets(sockets, payload)
}

const publishOrderEventLocal = ({
  customerId = null,
  companyId = null,
  orderId = null,
  cartId = null,
  type = "order.updated",
  data = null,
  ts = null,
}) => {
  if (!state.started || !state.orderSockets.size) return 0
  const payload = {
    type,
    order_id: orderId || undefined,
    cart_id: cartId || undefined,
    company_id: companyId || undefined,
    customer_id: customerId || undefined,
    data: data || undefined,
    ts: ts || new Date().toISOString(),
  }
  return publishToSockets(state.orderSockets, payload, { customerId })
}

const publishNotificationEventLocal = ({
  customerId = null,
  companyId = null,
  type = "notification.created",
  notification = null,
  data = null,
  ts = null,
}) => {
  if (!state.started || !state.notificationSockets.size) return 0
  const payload = {
    type,
    company_id: companyId || undefined,
    customer_id: customerId || undefined,
    notification: notification || undefined,
    data: data || undefined,
    ts: ts || new Date().toISOString(),
  }
  return publishToSockets(state.notificationSockets, payload, { customerId })
}

const ensureRedisPublisher = async () => {
  if (!canUseRedisFanout()) return null
  if (state.redisPublisher) return state.redisPublisher
  if (state.redisPublisherPromise) return state.redisPublisherPromise

  state.redisPublisherPromise = (async () => {
    const client = createRedisClient({ url: REDIS_URL })
    client.on("error", (error) => {
      safeLog(state.logger, "warn", {
        msg: "realtime-ws:redis_publisher_error",
        error: error?.message || "unknown_error",
      })
    })
    await client.connect()
    state.redisPublisher = client
    safeLog(state.logger, "info", {
      msg: "realtime-ws:redis_publisher_connected",
      channel: REALTIME_EVENTS_CHANNEL,
    })
    return client
  })()

  return state.redisPublisherPromise
}

const dispatchRedisEnvelope = (envelope) => {
  if (!envelope || typeof envelope !== "object") return
  if (envelope.source && envelope.source === state.instanceId) return
  const channel = String(envelope.channel || "")
  if (!EVENT_CHANNELS.has(channel)) return
  const payload = envelope.payload && typeof envelope.payload === "object" ? envelope.payload : {}

  if (channel === "carts") {
    publishCartEventLocal(payload)
    return
  }
  if (channel === "orders") {
    publishOrderEventLocal(payload)
    return
  }
  if (channel === "notifications") {
    publishNotificationEventLocal(payload)
  }
}

const ensureRedisSubscriber = async () => {
  if (!canUseRedisFanout()) return null
  if (state.redisSubscriber) return state.redisSubscriber
  if (state.redisSubscriberPromise) return state.redisSubscriberPromise

  state.redisSubscriberPromise = (async () => {
    const client = createRedisClient({ url: REDIS_URL })
    client.on("error", (error) => {
      safeLog(state.logger, "warn", {
        msg: "realtime-ws:redis_subscriber_error",
        error: error?.message || "unknown_error",
      })
    })
    await client.connect()
    await client.subscribe(REALTIME_EVENTS_CHANNEL, (message) => {
      try {
        const envelope = JSON.parse(String(message || "{}"))
        dispatchRedisEnvelope(envelope)
      } catch (error) {
        safeLog(state.logger, "warn", {
          msg: "realtime-ws:redis_message_parse_failed",
          error: error?.message || "invalid_json",
        })
      }
    })
    state.redisSubscriber = client
    state.redisSubscribed = true
    safeLog(state.logger, "info", {
      msg: "realtime-ws:redis_subscriber_ready",
      channel: REALTIME_EVENTS_CHANNEL,
    })
    return client
  })()

  return state.redisSubscriberPromise
}

const publishRedisEnvelope = async (channel, payload) => {
  if (!EVENT_CHANNELS.has(channel)) return false
  const client = await ensureRedisPublisher()
  if (!client) return false

  const envelope = {
    source: state.instanceId,
    channel,
    payload,
    ts: new Date().toISOString(),
  }
  await client.publish(REALTIME_EVENTS_CHANNEL, JSON.stringify(envelope))
  return true
}

const fanoutEvent = (channel, payload, localPublisher) => {
  const localSent = localPublisher(payload)
  publishRedisEnvelope(channel, payload).catch((error) => {
    safeLog(state.logger, "warn", {
      msg: "realtime-ws:publish_failed",
      channel,
      error: error?.message || "unknown_error",
    })
  })

  if (!localSent && !REDIS_URL && !state.warnedNoFanout) {
    safeLog(state.logger, "warn", {
      msg: "realtime-ws:no_fanout_backend",
      hint: "Configure REDIS_URL for cross-process realtime events.",
    })
    state.warnedNoFanout = true
  }

  return localSent
}

const startRealtimeWsServer = (logger = console) => {
  state.logger = logger || console
  if (!EMBEDDED_WS_ENABLED) {
    if (!state.warnedEmbeddedDisabled) {
      safeLog(state.logger, "info", {
        msg: "realtime-ws:embedded_disabled",
        hint: "Set REALTIME_EMBEDDED_WS=true when running a dedicated realtime service.",
      })
      state.warnedEmbeddedDisabled = true
    }
    return false
  }
  if (state.started) return true

  const server = http.createServer((_req, res) => {
    res.statusCode = 426
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ message: "Use WebSocket upgrade" }))
  })
  const wss = new WebSocketServer({ noServer: true })

  server.on("upgrade", (request, socket, head) => {
    const { pathname, cartId, customerId } = getRequestContext(request.url || "")

    const isCart = pathname === CHANNEL_PATHS.carts
    const isOrder = pathname === CHANNEL_PATHS.orders
    const isNotification = pathname === CHANNEL_PATHS.notifications
    if (!isCart && !isOrder && !isNotification) {
      return rejectUpgrade(socket, 404, "Not Found")
    }
    if ((isOrder || isNotification) && !customerId) {
      return rejectUpgrade(socket, 401, "Unauthorized")
    }
    if (isCart && !cartId) {
      return rejectUpgrade(socket, 400, "cart_id is required")
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, {
        channel: isCart ? "carts" : isOrder ? "orders" : "notifications",
        cartId,
        customerId,
      })
    })
  })

  wss.on("connection", (socket, _request, context) => {
    const channel = context?.channel || "unknown"
    const cartId = context?.cartId || null
    const customerId = context?.customerId || null

    state.sockets.add(socket)
    state.socketMeta.set(socket, { channel, cartId, customerId })
    if (channel === "carts") addCartSocket(cartId, socket)
    if (channel === "orders") state.orderSockets.add(socket)
    if (channel === "notifications") state.notificationSockets.add(socket)

    sendToSocket(socket, {
      type: "ws.connected",
      channel,
      cart_id: cartId || undefined,
      customer_id: customerId || undefined,
      ts: new Date().toISOString(),
    })

    socket.on("message", (raw) => {
      const text = String(raw || "").trim().toLowerCase()
      if (text === "ping") {
        sendToSocket(socket, { type: "pong", ts: new Date().toISOString() })
      }
    })

    socket.on("close", () => cleanupSocket(socket))
    socket.on("error", () => cleanupSocket(socket))
  })

  server.listen(WS_PORT, WS_HOST, () => {
    safeLog(state.logger, "info", {
      msg: "realtime-ws:started",
      host: WS_HOST,
      port: WS_PORT,
      channels: CHANNEL_PATHS,
    })
  })

  state.server = server
  state.wss = wss
  state.started = true

  ensureRedisSubscriber().catch((error) => {
    safeLog(state.logger, "warn", {
      msg: "realtime-ws:redis_subscriber_start_failed",
      error: error?.message || "unknown_error",
    })
  })

  return true
}

const publishCartEvent = ({ cartId, type = "cart.updated", data = null }) => {
  const payload = {
    cartId,
    type,
    data: data || undefined,
    ts: new Date().toISOString(),
  }
  return fanoutEvent("carts", payload, publishCartEventLocal)
}

const publishOrderEvent = ({
  customerId = null,
  companyId = null,
  orderId = null,
  cartId = null,
  type = "order.updated",
  data = null,
}) => {
  const payload = {
    customerId: customerId || undefined,
    companyId: companyId || undefined,
    orderId: orderId || undefined,
    cartId: cartId || undefined,
    type,
    data: data || undefined,
    ts: new Date().toISOString(),
  }
  return fanoutEvent("orders", payload, publishOrderEventLocal)
}

const publishNotificationEvent = ({
  customerId = null,
  companyId = null,
  type = "notification.created",
  notification = null,
  data = null,
}) => {
  const payload = {
    customerId: customerId || undefined,
    companyId: companyId || undefined,
    type,
    notification: notification || undefined,
    data: data || undefined,
    ts: new Date().toISOString(),
  }
  return fanoutEvent("notifications", payload, publishNotificationEventLocal)
}

module.exports = {
  CHANNEL_PATHS,
  startRealtimeWsServer,
  publishCartEvent,
  publishOrderEvent,
  publishNotificationEvent,
}
