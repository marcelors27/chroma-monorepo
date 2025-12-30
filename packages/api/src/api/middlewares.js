const { authenticate, defineMiddlewares } = require("@medusajs/framework/http")
const {
  remoteQueryObjectFromString,
  ContainerRegistrationKeys,
  Modules,
} = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow } = require("@medusajs/core-flows")
const approvedGuard = require("../strategies/store/approved-guard")

const ALLOW_HEADERS =
  "Content-Type, Authorization, X-Publishable-Api-Key, X-Medusa-Sales-Channel-Id, X-Company-Id, X-Company, Accept"

const applyCors = (req, res) => {
  const origin = req.headers.origin || "*"
  res.header("Access-Control-Allow-Origin", origin)
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Headers", ALLOW_HEADERS)
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
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
    email = providers?.[0]?.entity_id || null
  }
  if (!email && authModule?.listProviderIdentities) {
    try {
      const providers = await authModule.listProviderIdentities(
        { auth_identity_id },
        { select: ["entity_id"] }
      )
      email = providers?.[0]?.entity_id || null
    } catch { }
  }

  if (!email) return null
  try {
    const { result } = await createCustomerAccountWorkflow(scope).run({
      input: {
        authIdentityId: auth_identity_id,
        customerData: { email, approved: false, metadata: { approved: false } },
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
      fields: ["id", "metadata", "approved"],
    })
    const customers = await remoteQuery(query)
    return customers?.[0] || null
  } catch (e) {
    safeLog(logger, { msg: "fetchCustomerByEmail error", email, error: e?.message })
    return null
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

const middlewares = defineMiddlewares([
  {
    method: ["POST"],
    matcher: ["/auth/store/emailpass"],
    middlewares: [storeLoginCompanyGuard()],
  },
  {
    method: ["ALL"],
    matcher: ["/store/customers/me"],
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
    method: ["OPTIONS"],
    matcher: "/store/*",
    middlewares: [storeCompaniesCors],
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
    matcher: ["/hooks/payment", "/hooks/payment/*"],
    middlewares: [normalizePaymentHookProvider, paymentHookLogger],
  },
])

exports.default = middlewares
module.exports = exports
