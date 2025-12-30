const jwt = require("jsonwebtoken")
const {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

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
    fields: ["id", "email", "metadata", "approved", "first_name", "last_name", "created_at"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const resolveCustomerIdFromIdentity = async (scope, authIdentityId, logger) => {
  if (!authIdentityId) return null
  try {
    const { authIdentityService, providerIdentityService } = getAuthServices(scope)
    if (!authIdentityService && !providerIdentityService) return null

    if (authIdentityService.list) {
      const identities = await authIdentityService.list({ id: authIdentityId })
      const identity = identities?.[0]
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
      const candidate =
        identity?.entity_id ||
        identity?.app_metadata?.customer_id ||
        identity?.user_metadata?.customer_id ||
        null
      if (candidate) {
        return candidate
      }
    }

    if (providerIdentityService?.list) {
      const providerIdentities = await providerIdentityService.list({ auth_identity_id: authIdentityId })
      const providerIdentity = providerIdentities?.[0]
      if (providerIdentity?.entity_id) {
        return providerIdentity.entity_id
      }
    }
  } catch (e) {
    safeLog(logger, { msg: "resolveCustomerIdFromIdentity:error", error: e?.message })
    return null
  }
  return null
}

const getCustomerId = async (req) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  if (req.auth_context?.actor_type === "store" && req.auth_context.auth_identity_id) {
    const resolved = await resolveCustomerIdFromIdentity(
      req.scope,
      req.auth_context.auth_identity_id,
      logger
    )
    if (resolved) return resolved
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const [, token] = authHeader.split(" ")
  if (!token) return null

  try {
    const config = req.scope.resolve("configModule")
    const http = config.projectConfig?.http || {}
    const verified = jwt.verify(
      token,
      http.jwtPublicKey || http.jwtSecret || config.projectConfig.jwtSecret,
      http.jwtVerifyOptions || http.jwtOptions || {}
    )
    return (
      verified.actor_id ||
      verified.customer_id ||
      verified.app_metadata?.customer_id ||
      (await resolveCustomerIdFromIdentity(req.scope, verified.auth_identity_id, logger)) ||
      null
    )
  } catch (e) {
    safeLog(logger, { msg: "getCustomerId:jwt error", error: e?.message })
    return null
  }
}

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
    let candidate = new Date(year, month, safeDay, now.getHours(), now.getMinutes(), 0, 0)
    if (candidate < start) {
      year = start.getFullYear()
      month = start.getMonth()
      const alignedDay = clampDayOfMonth(dayOfMonth, year, month)
      candidate = new Date(year, month, alignedDay, now.getHours(), now.getMinutes(), 0, 0)
    }
    while (candidate <= now || (last && candidate <= last)) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
      const alignedDay = clampDayOfMonth(dayOfMonth, year, month)
      candidate = new Date(year, month, alignedDay, now.getHours(), now.getMinutes(), 0, 0)
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

const PATCH = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const recurrences = normalizeRecurrences(customer?.metadata?.recurrences)
  const idx = recurrences.findIndex((rec) => rec.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ message: "Recurrence not found" })
  }

  const current = recurrences[idx]
  const body = req.body || {}
  const nextStatus = body.status || (body.paused ? "paused" : "active")

  const updated = {
    ...current,
    name: body.name ?? current.name,
    frequency: body.frequency ?? current.frequency,
    day_of_week: body.day_of_week ?? body.dayOfWeek ?? current.day_of_week,
    day_of_month: body.day_of_month ?? body.dayOfMonth ?? current.day_of_month,
    payment_method: body.payment_method ?? body.paymentMethod ?? current.payment_method,
    items: body.items ?? current.items,
    company_id: body.company_id ?? body.companyId ?? current.company_id,
    start_date: body.start_date ?? body.startDate ?? current.start_date,
    status: nextStatus,
    last_run_at: body.last_run_at ?? body.lastRunAt ?? current.last_run_at,
    updated_at: new Date().toISOString(),
  }

  if (updated.status === "paused") {
    updated.next_run_at = null
  } else {
    updated.next_run_at = computeNextRun({
      frequency: updated.frequency,
      dayOfWeek: updated.day_of_week,
      dayOfMonth: updated.day_of_month,
      startDate: updated.start_date,
      lastRunAt: updated.last_run_at,
    })
  }

  const nextRecurrences = [...recurrences]
  nextRecurrences[idx] = updated

  const nextMetadata = {
    ...(customer.metadata || {}),
    recurrences: nextRecurrences,
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: nextMetadata },
    },
  })

  return res.json({ recurrence: updated })
}

const DELETE = async (req, res) => {
  const customerId = await getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const recurrences = normalizeRecurrences(customer?.metadata?.recurrences)
  const nextRecurrences = recurrences.filter((rec) => rec.id !== req.params.id)
  if (nextRecurrences.length === recurrences.length) {
    return res.status(404).json({ message: "Recurrence not found" })
  }

  const nextMetadata = {
    ...(customer.metadata || {}),
    recurrences: nextRecurrences,
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: nextMetadata },
    },
  })

  return res.status(204).send()
}

module.exports = { PATCH, DELETE }
