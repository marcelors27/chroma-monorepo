const crypto = require("crypto")
const { ContainerRegistrationKeys, remoteQueryObjectFromString } = require("@medusajs/framework/utils")

const fetchCustomerById = async (scope, customerId) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = remoteQueryObjectFromString({
    entryPoint: "customer",
    variables: { filters: { id: customerId } },
    fields: ["id", "email", "metadata"],
  })
  const customers = await remoteQuery(query)
  return customers?.[0] || null
}

const POST = async (req, res) => {
  const customerId = req.params.id
  const body = req.body || {}
  const trade_name = body.trade_name || body.tradeName || body.company_name || body.companyName
  const fantasy_name = body.fantasy_name || body.fantasyName || body.fantasy || trade_name
  const cnpj = body.cnpj || body.cnpj_digits || body.cnpjDigits
  const approved = Boolean(body.approved)
  const business_type = body.business_type || body.businessType || null
  const metadata = typeof body.metadata === "object" && body.metadata ? body.metadata : {}

  if (!trade_name || !fantasy_name || !cnpj) {
    return res.status(400).json({
      message: "Campos obrigatórios: trade_name, fantasy_name, cnpj",
    })
  }

  const customer = await fetchCustomerById(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const exists = companies.find((c) => c.cnpj?.replace(/\D/g, "") === String(cnpj).replace(/\D/g, ""))
  if (exists) {
    return res.status(409).json({ message: "CNPJ já cadastrado para este usuário" })
  }

  const company = {
    id: `cmp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    trade_name,
    fantasy_name,
    cnpj,
    approved,
    ...(business_type ? { business_type } : {}),
    created_at: new Date().toISOString(),
    metadata,
  }

  const nextMetadata = {
    ...(customer.metadata || {}),
    companies: [...companies, company],
  }

  const { updateCustomersWorkflow } = require("@medusajs/core-flows")
  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: nextMetadata },
    },
  })

  return res.status(200).json({ company })
}

module.exports = { POST }
