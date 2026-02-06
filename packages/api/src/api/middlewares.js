const { authenticate, defineMiddlewares } = require("@medusajs/framework/http")
const {
  remoteQueryObjectFromString,
  ContainerRegistrationKeys,
  Modules,
} = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow } = require("@medusajs/core-flows")
const approvedGuard = require("../strategies/store/approved-guard")
const { decryptLoginPayload } = require("../services/auth-encryption")

const ALLOW_HEADERS =
  "Content-Type, Authorization, X-Publishable-Api-Key, X-Medusa-Sales-Channel-Id, X-Company-Id, X-Company, Accept"

const applyCors = (req, res) => {
  const origin = req.headers.origin || "*"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Headers", ALLOW_HEADERS)
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
}

const storeCompaniesCors = (req, res, next) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  safeLog(logger, {
    msg: "storeCompaniesCors:called",
    method: req.method,
    path: req.path,
    origin: req.headers?.origin,
  })
  if (req.method === "OPTIONS") {
    return res.sendStatus(204)
  }
  applyCors(req, res)
  next()
}

const adminCors = (req, res, next) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  safeLog(logger, {
    msg: "adminCors:called",
    method: req.method,
    path: req.path,
    origin: req.headers?.origin,
  })
  if (req.method === "OPTIONS") {
    applyCors(req, res)
    return res.sendStatus(204)
  }
  applyCors(req, res)
  next()
}

const adminPreflightOnly = (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  safeLog(logger, {
    msg: "adminPreflightOnly:called",
    method: req.method,
    path: req.path,
    origin: req.headers?.origin,
  })
  applyCors(req, res)
  return res.sendStatus(204)
}

const paymentHookLogger = (req, res, next) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  safeLog(logger, {
    msg: "paymentHook:called",
    method: req.method,
    path: req.path,
    provider: req.params?.provider,
  })
  next()
}

const normalizePaymentHookProvider = (req, _res, next) => {
  const provider = req.params?.provider
  if (!provider) return next()

  const withoutPrefix = provider.replace(/^(pp_)+/, "")
  if (withoutPrefix === "stripe") {
    req.params.provider = "stripe_stripe"
    return next()
  }
  req.params.provider = withoutPrefix

  next()
}

const safeLog = (logger, payload) => {
  try {
    logger?.info?.(JSON.stringify(payload))
  } catch {
    logger?.info?.(payload)
  }
}

const logRequestPayload = () => {
  return (req, _res, next) => {
    if (process.env.OTEL_LOG_REQUESTS_ENABLED !== "true") return next()
    const contentType = String(req.headers?.["content-type"] || "")
    if (contentType.includes("multipart/form-data")) return next()

    const logger = console
    const payload = sanitizePayload(req.body)
    safeLog(logger, {
      msg: "request:received",
      method: req.method,
      path: req.path,
      query: req.query,
      body: payload,
    })
    next()
  }
}

const REDACT_KEYS = [
  "password",
  "pass",
  "secret",
  "token",
  "authorization",
  "cookie",
  "key",
  "client_secret",
  "api_key",
  "apikey",
]

const shouldRedactKey = (key) => {
  const normalized = String(key).toLowerCase()
  return REDACT_KEYS.some((needle) => normalized.includes(needle))
}

const sanitizePayload = (value, depth = 0) => {
  if (depth > 4) return "[max-depth]"
  if (value === null || value === undefined) return value
  if (Buffer.isBuffer(value)) return "[buffer]"
  if (typeof value === "string") {
    if (value.length > 1000) return `${value.slice(0, 1000)}…`
    return value
  }
  if (typeof value !== "object") return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizePayload(item, depth + 1))
  }
  const output = {}
  for (const [key, val] of Object.entries(value).slice(0, 50)) {
    output[key] = shouldRedactKey(key) ? "[redacted]" : sanitizePayload(val, depth + 1)
  }
  return output
}

const logPaymentSessionRequest = () => {
  return async (req, _res, next) => {
    if (process.env.LOG_PAYMENT_SESSIONS !== "true") return next()
    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    try {
      const path = String(req.path || "")
      const match = path.match(/\/payment-collections\/([^/]+)\/payment-sessions/)
      const paymentCollectionId = match?.[1]
      let payment_collection = null
      if (paymentCollectionId) {
        try {
          const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
          const query = remoteQueryObjectFromString({
            entryPoint: "payment_collection",
            variables: { id: paymentCollectionId },
            fields: ["id", "amount", "currency_code"],
          })
          const result = await remoteQuery(query)
          payment_collection = Array.isArray(result)
            ? result?.[0]
            : Array.isArray(result?.data)
              ? result?.data?.[0]
              : result
        } catch (err) {
          safeLog(logger, {
            msg: "paymentSession:collectionLookupFailed",
            payment_collection_id: paymentCollectionId,
            error: err?.message,
          })
        }
      }

      safeLog(logger, {
        msg: "paymentSession:init",
        method: req.method,
        path,
        payment_collection,
        body: sanitizePayload(req.body),
      })
    } catch (err) {
      safeLog(logger, { msg: "paymentSession:logFailed", error: err?.message })
    }
    next()
  }
}

const getAuthServices = (scope) => {
  const services = {}
  try {
    services.authIdentityService = scope.resolve("authIdentityService")
  } catch { }
  try {
    services.providerIdentityService = scope.resolve("providerIdentityService")
  } catch { }
  try {
    const authModule = scope.resolve(Modules.AUTH)
    services.authIdentityService =
      services.authIdentityService ||
      authModule?.authIdentityService_ ||
      authModule?.authIdentityService
    services.providerIdentityService =
      services.providerIdentityService ||
      authModule?.providerIdentityService_ ||
      authModule?.providerIdentityService
    services.authModule = authModule
  } catch { }
  return services
}

const findCustomerIdByEmail = async (scope, email, logger) => {
  if (!email) return null
  try {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const query = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { email }, limit: 1 },
      fields: ["id"],
    })
    const customers = await remoteQuery(query)
    const id = customers?.[0]?.id || null
    if (id) safeLog(logger, { msg: "findCustomerIdByEmail", email, id })
    return id
  } catch (e) {
    safeLog(logger, { msg: "findCustomerIdByEmail error", email, error: e?.message })
    return null
  }
}

const resolveCustomerFromIdentity = async (scope, auth_identity_id, logger) => {
  const { authIdentityService, providerIdentityService } = getAuthServices(scope)
  if (!authIdentityService && !providerIdentityService) return null

  const tryEmailToId = async (candidate) => {
    if (candidate && String(candidate).includes("@")) {
      return await findCustomerIdByEmail(scope, candidate, logger)
    }
    return candidate
  }

  if (authIdentityService?.list) {
    const ids = await authIdentityService.list({ id: auth_identity_id })
    const identity = ids?.[0]
    const candidate =
      identity?.entity_id ||
      identity?.app_metadata?.customer_id ||
      identity?.user_metadata?.customer_id ||
      null
    const found = await tryEmailToId(candidate)
    if (found) return found
  }

  if (authIdentityService?.retrieve) {
    const identity = await authIdentityService.retrieve(auth_identity_id)
    const candidate =
      identity?.entity_id ||
      identity?.app_metadata?.customer_id ||
      identity?.user_metadata?.customer_id ||
      null
    const found = await tryEmailToId(candidate)
    if (found) return found
  }

  if (providerIdentityService?.list) {
    const providers = await providerIdentityService.list({ auth_identity_id })
    const candidate = providers?.[0]?.entity_id
    const found = await tryEmailToId(candidate)
    if (found) return found
  }

  return null
}

const ensureCustomerForIdentity = async (scope, auth_identity_id, logger) => {
  const customerId = await resolveCustomerFromIdentity(scope, auth_identity_id, logger)
  if (customerId) return customerId

  // If still missing, try to create a customer using provider email
  const { providerIdentityService, authModule } = getAuthServices(scope)
  let email = null
  if (providerIdentityService?.list) {
    const providers = await providerIdentityService.list({ auth_identity_id })
    const provider = providers?.[0]
    email = provider?.entity_id || null
    if (!email || !String(email).includes("@")) {
      email = provider?.user_metadata?.email || null
    }
  }
  if (!email && authModule?.listProviderIdentities) {
    try {
      const providers = await authModule.listProviderIdentities(
        { auth_identity_id },
        { select: ["entity_id", "user_metadata"] }
      )
      const provider = providers?.[0]
      email = provider?.entity_id || null
      if (!email || !String(email).includes("@")) {
        email = provider?.user_metadata?.email || null
      }
    } catch { }
  }

  if (!email) return null
  try {
    const { result } = await createCustomerAccountWorkflow(scope).run({
      input: {
        authIdentityId: auth_identity_id,
        customerData: { email },
      },
    })
    safeLog(logger, { msg: "ensureCustomerForIdentity:created", auth_identity_id, email, id: result?.id })
    return result?.id || null
  } catch (e) {
    safeLog(logger, { msg: "ensureCustomerForIdentity:error", auth_identity_id, email, error: e?.message })
    return null
  }
}

const ensureCustomerActor = () => {
  return async (req, res, next) => {
    try {
      if (req.auth_context?.actor_type === "store" && !req.auth_context.actor_id && req.auth_context.auth_identity_id) {
        const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
        const customerId = await ensureCustomerForIdentity(req.scope, req.auth_context.auth_identity_id, logger)
        if (customerId) {
          req.auth_context.actor_id = customerId
          req.auth_context.actor_type = "customer"
          safeLog(logger, { msg: "ensureCustomerActor:set", auth_identity_id: req.auth_context.auth_identity_id, customerId })
        }
      }
    } catch (e) {
      // swallow and continue; downstream auth will handle
    }
    next()
  }
}

const fetchCustomerByEmail = async (scope, email, logger) => {
  if (!email) return null
  try {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const query = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { email }, limit: 1 },
      fields: ["id", "email", "first_name", "last_name", "metadata"],
    })
    const customers = await remoteQuery(query)
    return customers?.[0] || null
  } catch (e) {
    safeLog(logger, { msg: "fetchCustomerByEmail error", email, error: e?.message })
    return null
  }
}

const MAX_LOGIN_PAYLOAD_AGE_MS = 5 * 60 * 1000

const decryptLoginPayloadMiddleware = () => {
  return async (req, res, next) => {
    const body = req.body || {}
    if (!body?.encrypted || !body?.payload) {
      return next()
    }

    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    const result = decryptLoginPayload(body.payload)

    if (result?.error === "missing_private_key") {
      return res.status(500).json({ message: "Chave de autenticação não configurada" })
    }
    if (!result?.data) {
      return res.status(400).json({ message: "Payload de login inválido" })
    }

    const { email, password, ts } = result.data || {}
    if (!email || !password) {
      return res.status(400).json({ message: "Payload de login incompleto" })
    }

    if (ts) {
      const diff = Math.abs(Date.now() - Number(ts))
      if (!Number.isFinite(diff) || diff > MAX_LOGIN_PAYLOAD_AGE_MS) {
        return res.status(400).json({ message: "Payload de login expirado" })
      }
    }

    req.body = { ...body, email, password }
    safeLog(logger, { msg: "decryptLoginPayload:ok", email })
    next()
  }
}

const welcomeEmailOnRegister = () => {
  return async (req, res, next) => {
    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    const originalJson = res.json.bind(res)

    res.json = async (payload) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const email = req.body?.email || req.body?.username
          if (email) {
            const customer = await fetchCustomerByEmail(req.scope, email, logger)
            const companies = Array.isArray(customer?.metadata?.companies)
              ? customer.metadata.companies
              : []
            const name =
              [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
              email
            const { sendWelcomeEmail } = require("../services/email-template-sender")
            sendWelcomeEmail({ to: email, name, companies, logger }).catch((err) => {
              logger?.warn?.("[email] welcome register falhou", { error: err?.message })
            })
            try {
              const current = Array.isArray(customer?.metadata?.email_logs)
                ? customer.metadata.email_logs
                : []
              const entry = {
                type: "welcome",
                company_id: null,
                email,
                status: "sent",
                sent_at: new Date().toISOString(),
                has_attachment: false,
              }
              const next = [entry, ...current].slice(0, 50)
              const { updateCustomersWorkflow } = require("@medusajs/core-flows")
              await updateCustomersWorkflow(req.scope).run({
                input: {
                  selector: { id: customer.id },
                  update: { metadata: { ...(customer.metadata || {}), email_logs: next } },
                },
              })
            } catch (err) {
              logger?.warn?.("[email] log welcome falhou", { error: err?.message })
            }
          }
        }
      } catch (err) {
        logger?.warn?.("[email] welcome register falhou", { error: err?.message })
      }
      return originalJson(payload)
    }

    next()
  }
}

const storeLoginCompanyGuard = () => {
  return async (req, res, next) => {
    try {
      const email = req.body?.email || req.body?.username
      if (!email) return next()

      const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
      const customer = await fetchCustomerByEmail(req.scope, email, logger)
      const companies = Array.isArray(customer?.metadata?.companies)
        ? customer.metadata.companies
        : []
      const hasApprovedCompany = companies.some((company) => company?.approved)

      if (!hasApprovedCompany) {
        return res.status(403).json({ message: "Seu acesso está em avaliação" })
      }
    } catch {
      return res.status(403).json({ message: "Seu acesso está em avaliação" })
    }
    next()
  }
}

const storeLoginDisabledGuard = () => {
  return async (req, res, next) => {
    const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
    try {
      const email = req.body?.email || req.body?.username
      if (!email) return next()

      const customer = await fetchCustomerByEmail(req.scope, email, logger)
      if (customer?.metadata?.disabled) {
        return res.status(403).json({ message: "Usuario desativado" })
      }

      const { authIdentityService } = getAuthServices(req.scope)
      if (authIdentityService?.list) {
        try {
          const identities = await authIdentityService.list({ entity_id: email })
          const identity = identities?.[0]
          if (identity?.app_metadata?.disabled || identity?.user_metadata?.disabled) {
            return res.status(403).json({ message: "Usuario desativado" })
          }
        } catch {
          // Ignore identity lookup failure to avoid blocking login.
        }
      }
    } catch {
      return res.status(403).json({ message: "Usuario desativado" })
    }
    next()
  }
}

const middlewares = defineMiddlewares([
  {
    method: ["POST", "PUT", "PATCH"],
    matcher: ["/store/*", "/admin/*", "/auth/*"],
    middlewares: [logRequestPayload()],
  },
  {
    method: ["POST"],
    matcher: ["/store/payment-collections/*/payment-sessions"],
    middlewares: [logPaymentSessionRequest()],
  },
  {
    method: ["ALL"],
    matcher: ["/admin", "/admin/*"],
    middlewares: [adminCors],
  },
  {
    method: ["OPTIONS"],
    matcher: [
      "/admin/service-zones",
      "/admin/service-zones/*",
      "/admin/fulfillment-sets",
      "/admin/fulfillment-sets/*",
    ],
    middlewares: [adminPreflightOnly],
  },
  {
    method: ["ALL"],
    matcher: "/store/*",
    middlewares: [storeCompaniesCors],
  },
  {
    method: ["POST"],
    matcher: ["/auth/store/emailpass"],
    middlewares: [decryptLoginPayloadMiddleware(), storeLoginDisabledGuard(), storeLoginCompanyGuard()],
  },
  {
    method: ["POST"],
    matcher: ["/auth/customer/emailpass"],
    middlewares: [decryptLoginPayloadMiddleware(), storeLoginDisabledGuard()],
  },
  {
    method: ["POST"],
    matcher: ["/auth/customer/emailpass/register"],
    middlewares: [welcomeEmailOnRegister()],
  },
  {
    method: ["ALL"],
    matcher: ["/store/customers/me"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/customers/password"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
      ensureCustomerActor(),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/orders", "/store/orders/*"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
      ensureCustomerActor(),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/products", "/store/products/*"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/companies", "/store/companies/*"],
    middlewares: [
      storeCompaniesCors,
      // Accept store tokens (actor_type=store) and allow auth_identity-only contexts; handler resolves customer id
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/notifications", "/store/notifications/*"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/recurrences", "/store/recurrences/*"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: ["/store/push-tokens", "/store/push-tokens/*"],
    middlewares: [
      authenticate(["customer", "store"], ["session", "bearer"], {
        allowUnauthenticated: false,
        allowUnregistered: true,
      }),
    ],
  },
  {
    method: ["ALL"],
    matcher: "/store/*",
    middlewares: [approvedGuard()],
  },
  {
    method: ["ALL"],
    matcher: ["/admin/companies", "/admin/companies/*"],
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["ALL"],
    matcher: ["/admin/store-users", "/admin/store-users/*"],
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["ALL"],
    matcher: ["/admin/notifications", "/admin/notifications/*"],
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["ALL"],
    matcher: ["/admin/email-logs", "/admin/email-logs/*"],
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["ALL"],
    matcher: ["/admin/email-templates", "/admin/email-templates/*"],
    middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
  },
  {
    method: ["ALL"],
    matcher: ["/hooks/payment", "/hooks/payment/*"],
    middlewares: [normalizePaymentHookProvider, paymentHookLogger],
  },
])

exports.default = middlewares
module.exports = exports
