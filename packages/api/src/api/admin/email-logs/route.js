const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const parseLimit = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 100
  return Math.min(Math.max(num, 1), 500)
}

const GET = async (req, res) => {
  const logger = req.scope?.resolve ? req.scope.resolve("logger") : console
  const userId = req.query?.user_id || req.query?.userId || null
  const companyId = req.query?.company_id || req.query?.companyId || null
  const type = req.query?.type || null
  const status = req.query?.status || null
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
    const logs = []

    for (const customer of customers || []) {
      const entries = Array.isArray(customer?.metadata?.email_logs)
        ? customer.metadata.email_logs
        : []
      for (const entry of entries) {
        if (!entry) continue
        if (companyId && String(entry.company_id || "") !== String(companyId)) continue
        if (type && String(entry.type || "") !== String(type)) continue
        if (status && String(entry.status || "") !== String(status)) continue
        logs.push({
          ...entry,
          user_id: customer.id,
          user_email: customer.email,
          user_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
        })
      }
    }

    logs.sort((a, b) => {
      const aTime = a?.sent_at ? Date.parse(a.sent_at) : 0
      const bTime = b?.sent_at ? Date.parse(b.sent_at) : 0
      return bTime - aTime
    })

    const paginated = logs.slice(offset, offset + limit)
    res.json({ logs: paginated, total: logs.length, limit, offset })
  } catch (err) {
    logger?.warn?.("[email-logs] falha", { error: err?.message })
    res.status(500).json({ message: "Erro ao listar logs" })
  }
}

module.exports = { GET }
