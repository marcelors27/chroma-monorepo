const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const fetchCustomers = async (scope) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: {},
      order: { created_at: "DESC" },
      limit: 500,
    },
    fields: ["id", "email", "metadata", "created_at"],
  })
  return await remoteQuery(query)
}

const GET = async (req, res) => {
  const customers = await fetchCustomers(req.scope)
  const companies = []

  for (const cust of customers) {
    const items = Array.isArray(cust.metadata?.companies) ? cust.metadata.companies : []
    items.forEach((company) =>
      companies.push({
        customer_id: cust.id,
        customer_email: cust.email,
        ...company,
      })
    )
  }

  res.json({ companies })
}

module.exports = { GET }
