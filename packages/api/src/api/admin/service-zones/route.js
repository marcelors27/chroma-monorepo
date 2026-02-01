const { createServiceZonesWorkflow } = require("@medusajs/core-flows")
const { ContainerRegistrationKeys, Modules, remoteQueryObjectFromString } = require("@medusajs/framework/utils")

const parseLimit = (value, fallback = 200) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(Math.max(num, 1), 500)
}

const parseOffset = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(num, 0)
}

const parseFields = (value) => {
  if (!value) return null
  const raw = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^\+/, ""))

  if (!raw.length) return null

  const normalized = new Set(["id"])
  let needsFulfillmentSet = false
  let needsFulfillmentSetType = false
  let needsGeoZones = false

  for (const field of raw) {
    if (!field || field === "id") continue

    if (field === "geo_zones" || field.startsWith("geo_zones.")) {
      needsGeoZones = true
      continue
    }

    if (field === "fulfillment_set" || field.startsWith("fulfillment_set.")) {
      needsFulfillmentSet = true
      if (field === "fulfillment_set.type" || field.startsWith("fulfillment_set.type.")) {
        needsFulfillmentSetType = true
      }
      continue
    }

    normalized.add(field)
  }

  if (needsGeoZones) normalized.add("geo_zones")
  if (needsFulfillmentSet) normalized.add("fulfillment_set")
  if (needsFulfillmentSetType) normalized.add("fulfillment_set.type")

  return {
    fields: Array.from(normalized),
    needsGeoZones,
    needsFulfillmentSet,
    needsFulfillmentSetType,
  }
}

const defaultFieldConfig = {
  fields: ["id", "name", "geo_zones", "fulfillment_set", "fulfillment_set.type"],
  needsGeoZones: true,
  needsFulfillmentSet: true,
  needsFulfillmentSetType: true,
}

const GET = async (req, res) => {
  const limit = parseLimit(req.query?.limit)
  const offset = parseOffset(req.query?.offset)
  const fieldConfig = parseFields(req.query?.fields) || defaultFieldConfig

  const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT)
  const serviceZoneService = fulfillmentModuleService?.serviceZoneService_

  let service_zones = []

  if (serviceZoneService?.listAndCount) {
    const relations = []
    if (fieldConfig.needsGeoZones) relations.push("geo_zones")
    if (fieldConfig.needsFulfillmentSet) relations.push("fulfillment_set")

    const [items] = await serviceZoneService.listAndCount(
      {},
      {
        relations,
        take: limit,
        skip: offset,
      }
    )
    service_zones = items || []
  } else {
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const result = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "service_zones",
        variables: { limit, offset },
        fields: fieldConfig.fields,
      })
    )
    service_zones = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : []
  }

  res.json({ service_zones })
}

const POST = async (req, res) => {
  const payload = req.body || {}
  const name = String(payload.name || "").trim()
  const fulfillmentSetId = payload.fulfillment_set_id
  const geoZones = Array.isArray(payload.geo_zones) ? payload.geo_zones : []

  if (!name) {
    return res.status(400).json({ message: "name é obrigatório" })
  }
  if (!fulfillmentSetId) {
    return res.status(400).json({ message: "fulfillment_set_id é obrigatório" })
  }
  if (!geoZones.length) {
    return res.status(400).json({ message: "geo_zones é obrigatório" })
  }

  await createServiceZonesWorkflow(req.scope).run({
    input: {
      data: [
        {
          name,
          fulfillment_set_id: fulfillmentSetId,
          geo_zones: geoZones,
        },
      ],
    },
  })

  res.status(200).json({ created: true })
}

module.exports = { GET, POST }
