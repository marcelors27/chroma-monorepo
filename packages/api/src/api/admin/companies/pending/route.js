const { remoteQueryObjectFromString, ContainerRegistrationKeys } = require("@medusajs/framework/utils")

const fetchCustomers = async (scope) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: {
      filters: {},
      order: { created_at: "DESC" },
      limit: 200,
    },
    fields: ["id", "email", "metadata", "created_at"],
  })
  return await remoteQuery(query)
}

const GET = async (req, res) => {
  const customers = await fetchCustomers(req.scope)

  const pending = []
  for (const cust of customers) {
    const companies = Array.isArray(cust.metadata?.companies) ? cust.metadata.companies : []
    companies
      .filter((c) => c.approved === false)
      .forEach((c) =>
        pending.push({
          customer_id: cust.id,
          customer_email: cust.email,
          ...c,
        })
      )
  }

  res.json({ companies: pending })
}

module.exports = { GET }
