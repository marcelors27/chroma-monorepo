const { Modules, ContainerRegistrationKeys, remoteQueryObjectFromString } = require("@medusajs/framework/utils")
const { createCustomerAccountWorkflow } = require("@medusajs/core-flows")

/**
 * Express middleware to block store requests when customer is not approved.
 * Checks current customer using the store auth module.
 */
const jwt = require("jsonwebtoken")

const safeLog = (logger, payload) => {
  try {
    logger?.debug?.(JSON.stringify(payload))
  } catch {
    logger?.debug?.(payload)
  }
}

const getAuthServices = (scope) => {
  const services = {}
  try {
    services.authIdentityService = scope.resolve("authIdentityService")
  } catch {}
  try {
    services.providerIdentityService = scope.resolve("providerIdentityService")
  } catch {}
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
  } catch {}
  return services
}

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "metadata", "approved"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const findCustomerIdByEmail = async (scope, email, logger) => {
  if (!email) return null
  try {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const query = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { email } },
      fields: ["id"],
    })
    const customers = await remoteQuery(query)
    const id = customers?.[0]?.id || null
    if (id) {
      safeLog(logger, { msg: "findCustomerIdByEmail", email, id })
    }
    return id
  } catch (e) {
    safeLog(logger, { msg: "findCustomerIdByEmail error", email, error: e?.message })
    return null
  }
}

const ensureCustomerForIdentity = async (scope, authIdentityId, email, logger) => {
  const existing = await findCustomerIdByEmail(scope, email, logger)
  if (existing) return existing

  if (!authIdentityId || !email) return null

  try {
    const { result } = await createCustomerAccountWorkflow(scope).run({
      input: {
        authIdentityId,
        customerData: { email, approved: false, metadata: { approved: false } },
      },
    })
    safeLog(logger, { msg: "ensureCustomerForIdentity:created", authIdentityId, email, id: result?.id })
    return result?.id || null
  } catch (e) {
    safeLog(logger, { msg: "ensureCustomerForIdentity:error", error: e?.message, authIdentityId, email })
    return null
  }
}

const resolveCustomerIdFromIdentity = async (scope, authIdentityId, logger) => {
  if (!authIdentityId) return null
  try {
    const { authIdentityService, providerIdentityService } = getAuthServices(scope)
    if (!authIdentityService && !providerIdentityService) return null

    if (authIdentityService.list) {
      const identities = await authIdentityService.list({ id: authIdentityId })
      const identity = identities?.[0]
      safeLog(logger, {
        msg: "approved-guard resolve:list",
        authIdentityId,
        identityEntity: identity?.entity_id,
        user_metadata: identity?.user_metadata,
        app_metadata: identity?.app_metadata,
      })
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (authIdentityService.retrieve) {
      const identity = await authIdentityService.retrieve(authIdentityId)
      safeLog(logger, {
        msg: "approved-guard resolve:retrieve",
        authIdentityId,
        identityEntity: identity?.entity_id,
        user_metadata: identity?.user_metadata,
        app_metadata: identity?.app_metadata,
      })
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    // Fallback: provider identities bound to this auth_identity_id
    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      safeLog(logger, {
        msg: "approved-guard resolve:providerIdentity",
        authIdentityId,
        providerEntity: providerIdentity?.entity_id,
      })
      if (providerIdentity?.entity_id) {
        const candidate = providerIdentity.entity_id
        if (candidate.includes("@")) {
          const emailId = await ensureCustomerForIdentity(scope, authIdentityId, candidate, logger)
          if (emailId) return emailId
        }
        return candidate
      }
    }
  } catch {
    return null
  }
  return null
}

module.exports = () => {
  return async (req, res, next) => {
    try {
      // Skip guard for auth, customer, and company endpoints so new accounts can be created.
      const path = req.path || ""
      const isAuthRoute = path.startsWith("/auth")
      const isCustomerRoute = path.startsWith("/customers")
      const isCompanyRoute = path.startsWith("/companies")
      const isCartRoute = path.startsWith("/carts") || path.startsWith("/store/carts")
      const isShippingRoute = path.startsWith("/shipping-options") || path.startsWith("/store/shipping-options")
      const isPaymentCollectionRoute =
        path.startsWith("/payment-collections") || path.startsWith("/store/payment-collections")
      if (
        isAuthRoute ||
        isCustomerRoute ||
        isCompanyRoute ||
        isCartRoute ||
        isShippingRoute ||
        isPaymentCollectionRoute ||
        req.method === "OPTIONS"
      ) {
        return next()
      }

      const logger = req.scope?.resolve ? req.scope.resolve("logger") : console

      let customerId =
        req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null

      if (!customerId && req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
        customerId = await resolveCustomerIdFromIdentity(
          req.scope,
          req.auth_context.auth_identity_id,
          logger
        )
        safeLog(logger, {
          msg: "approved-guard:store actor",
          auth_identity_id: req.auth_context.auth_identity_id,
          resolved: customerId,
        })
        if (customerId && String(customerId).includes("@")) {
          const id = await ensureCustomerForIdentity(
            req.scope,
            req.auth_context.auth_identity_id,
            customerId,
            logger
          )
          if (id) customerId = id
        }
      }

      if (!customerId) {
        // Fallback: decode bearer token if auth middleware didn't set auth_context
        const authHeader = req.headers.authorization
        if (authHeader) {
          const [, token] = authHeader.split(" ")
          if (token) {
            try {
              const config = req.scope.resolve("configModule")
              const http = config.projectConfig?.http || {}
              const verified = jwt.verify(
                token,
                http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
                http.jwtVerifyOptions || http.jwtOptions || {}
              )
              customerId =
                verified.actor_id ||
                verified.customer_id ||
                verified.app_metadata?.customer_id ||
                (await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)) ||
                null
              if (customerId && String(customerId).includes("@")) {
                const id = await ensureCustomerForIdentity(
                  req.scope,
                  verified.auth_identity_id,
                  customerId,
                  logger
                )
                if (id) customerId = id
              }
              safeLog(logger, {
                msg: "approved-guard:jwt decode",
                actor_type: verified.actor_type,
                customerId,
                auth_identity_id: verified.auth_identity_id,
              })
            } catch (e) {
              customerId = null
            }
          }
        }
      }
      if (!customerId) {
        return res.status(403).json({ message: "Seu acesso está em avaliação" })
      }

      const customer = await fetchCustomer(req.scope, customerId)
      const companies = Array.isArray(customer?.metadata?.companies)
        ? customer.metadata.companies
        : []

      const isTransferActive = (company) => {
        const transfer = company?.transfer || company?.metadata?.transfer
        if (!transfer) return true
        const now = Date.now()
        const start = transfer.start_date ? Date.parse(transfer.start_date) : null
        const end = transfer.end_date ? Date.parse(transfer.end_date) : null
        if (start && Number.isFinite(start) && now < start) return false
        if (end && Number.isFinite(end) && now > end) return false
        return true
      }

      const activeCompanies = companies.filter(
        (company) => company?.approved && isTransferActive(company)
      )

      if (!activeCompanies.length) {
        return res.status(403).json({ message: "Seu acesso está em avaliação" })
      }

      const requestedCompanyId =
        req.headers["x-company-id"] ||
        req.headers["x-company"] ||
        req.headers["x-company-id".toLowerCase()]
      let activeCompany = null
      if (requestedCompanyId) {
        activeCompany = activeCompanies.find((c) => c.id === requestedCompanyId)
      }
      if (!activeCompany) {
        activeCompany = activeCompanies[0] || null
      }

      if (!activeCompany) {
        return res.status(403).json({ message: "Seu acesso está em avaliação" })
      }

      next()
    } catch (err) {
      // Log context for debugging unauthorized store requests
      if (req.method === "POST") {
        const logger = req.scope.resolve("logger")
        const mask = (val) => (typeof val === "string" ? `${val.slice(0, 8)}...` : val)
        logger.info({
          msg: "Approved guard denied store/customers",
          error: err?.message,
          actor_type: req.auth_context?.actor_type,
          auth_identity_id: req.auth_context?.auth_identity_id,
          headers: {
            "x-publishable-api-key": mask(
              req.headers["x-publishable-api-key"] || req.headers["X-Publishable-Api-Key"]
            ),
            "x-medusa-sales-channel-id":
              req.headers["x-medusa-sales-channel-id"] || req.headers["X-Medusa-Sales-Channel-Id"],
            authorization: mask(req.headers.authorization || ""),
            cookie: req.headers.cookie ? "...present..." : undefined,
          },
        })
      }
      // If anything goes wrong, deny access
      return res.status(403).json({ message: "Seu acesso está em avaliação" })
    }
  }
}
