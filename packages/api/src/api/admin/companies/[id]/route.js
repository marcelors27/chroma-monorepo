const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

const fetchCustomer = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email", "metadata"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0]
}

const normalizeEmails = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((email) => String(email).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(/[;,]+/)
      .map((email) => email.trim())
      .filter(Boolean)
  }
  return []
}

const PATCH = async (req, res) => {
  const companyId = req.params.id
  const { customer_id: customerId } = req.body || {}

  if (!customerId) {
    return res.status(400).json({ message: "customer_id obrigatorio" })
  }

  const customer = await fetchCustomer(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const idx = companies.findIndex((c) => c.id === companyId)
  if (idx === -1) {
    return res.status(404).json({ message: "Company not found" })
  }

  const billingEmails =
    normalizeEmails(req.body?.billing_emails) || normalizeEmails(req.body?.billingEmails)

  const current = companies[idx]
  const updated = {
    ...current,
    metadata: {
      ...(current.metadata || {}),
      billing_emails: billingEmails,
    },
  }

  const nextCompanies = [...companies]
  nextCompanies[idx] = updated

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: { ...(customer.metadata || {}), companies: nextCompanies } },
    },
  })

  return res.json({ company: updated })
}

module.exports = { PATCH }
