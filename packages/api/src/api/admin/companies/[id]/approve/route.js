const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")
const { updateCustomersWorkflow } = require("@medusajs/core-flows")

const fetchCustomerByCompanyId = async (scope, companyId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: {},
      limit: 500,
    },
    fields: ["id", "email", "metadata"],
  })
  const res = await remoteQuery(query)
  return (res || []).find((c) => (c.metadata?.companies || []).some((cmp) => cmp.id === companyId)) || null
}

const POST = async (req, res) => {
  const { id } = req.params
  const customer = await fetchCustomerByCompanyId(req.scope, id)
  if (!customer) {
    return res.status(404).json({ message: "Company not found" })
  }

  const companies = customer.metadata?.companies || []
  const updatedCompanies = companies.map((cmp) => (cmp.id === id ? { ...cmp, approved: true } : cmp))
  const metadata = { ...(customer.metadata || {}), companies: updatedCompanies }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata },
    },
  })

  res.json({ customer_id: customer.id })
}

module.exports = { POST }
