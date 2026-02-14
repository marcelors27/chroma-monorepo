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

const findCompanyIndex = (companies, companyId) =>
  companies.findIndex((company) => String(company?.id) === String(companyId))

const PATCH = async (req, res) => {
  const customerId = req.params.id
  const companyId = req.params.company_id
  const body = req.body || {}

  const customer = await fetchCustomerById(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const index = findCompanyIndex(companies, companyId)
  if (index < 0) {
    return res.status(404).json({ message: "Estabelecimento não encontrado" })
  }

  const trade_name = body.trade_name || body.tradeName || body.company_name || body.companyName
  const fantasy_name = body.fantasy_name || body.fantasyName || body.fantasy
  const cnpj = body.cnpj || body.cnpj_digits || body.cnpjDigits
  const approved = body.approved
  const business_type = body.business_type || body.businessType

  if (!trade_name || !fantasy_name || !cnpj) {
    return res.status(400).json({
      message: "Campos obrigatórios: trade_name, fantasy_name, cnpj",
    })
  }

  const normalized = String(cnpj).replace(/\D/g, "")
  const conflict = companies.find(
    (company, idx) =>
      idx !== index &&
      company?.cnpj?.replace(/\D/g, "") === normalized
  )
  if (conflict) {
    return res.status(409).json({ message: "CNPJ já cadastrado para este usuário" })
  }

  const nextCompany = {
    ...companies[index],
    trade_name,
    fantasy_name,
    cnpj,
    approved: typeof approved === "boolean" ? approved : companies[index]?.approved || false,
    ...(business_type ? { business_type } : {}),
  }

  const nextCompanies = [...companies]
  nextCompanies[index] = nextCompany

  const { updateCustomersWorkflow } = require("@medusajs/core-flows")
  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: { ...(customer.metadata || {}), companies: nextCompanies } },
    },
  })

  return res.status(200).json({ company: nextCompany })
}

const DELETE = async (req, res) => {
  const customerId = req.params.id
  const companyId = req.params.company_id

  const customer = await fetchCustomerById(req.scope, customerId)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const companies = Array.isArray(customer?.metadata?.companies) ? customer.metadata.companies : []
  const index = findCompanyIndex(companies, companyId)
  if (index < 0) {
    return res.status(404).json({ message: "Estabelecimento não encontrado" })
  }

  const nextCompanies = companies.filter((company) => String(company?.id) !== String(companyId))

  const { updateCustomersWorkflow } = require("@medusajs/core-flows")
  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: { metadata: { ...(customer.metadata || {}), companies: nextCompanies } },
    },
  })

  return res.status(200).json({ ok: true })
}

module.exports = { PATCH, DELETE }
