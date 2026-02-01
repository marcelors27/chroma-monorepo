const { deleteServiceZonesWorkflow } = require("@medusajs/core-flows")

const DELETE = async (req, res) => {
  const zoneId = req.params.id
  if (!zoneId) {
    return res.status(400).json({ message: "id é obrigatório" })
  }

  await deleteServiceZonesWorkflow(req.scope).run({
    input: { ids: [zoneId] },
  })

  res.status(200).json({ id: zoneId, object: "service_zone", deleted: true })
}

module.exports = { DELETE }
