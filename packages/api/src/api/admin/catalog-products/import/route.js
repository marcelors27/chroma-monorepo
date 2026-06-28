const crypto = require("crypto")
const zlib = require("zlib")
const {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
  remoteQueryObjectFromString,
} = require("@medusajs/framework/utils")
const {
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} = require("@medusajs/core-flows")

const REQUIRED_HEADERS = ["sku", "produto"]
const DEFAULT_CURRENCY = "brl"
const DEFAULT_PRODUCT_IMAGE_URL = "/placeholder.svg"
const CREATE_BATCH_SIZE = 50

const normalizeKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const parseBoolean = (value) => {
  const normalized = normalizeKey(value)
  if (!normalized) return false
  return ["sim", "s", "yes", "true", "1"].includes(normalized)
}

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  const normalized = String(value)
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

const toAmount = (value, fallback) => {
  const parsed = parseNumber(value)
  const number = parsed === null ? parseNumber(fallback) : parsed
  return number === null ? 0 : Math.round(number * 100)
}

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80)

const normalizeManufacturerName = (value) => String(value || "").trim().replace(/\s+/g, " ")

const normalizeManufacturerKey = (value) => normalizeManufacturerName(value).toLowerCase()

const decodeXml = (value) =>
  String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")

const getAttr = (source, name) => {
  const match = source.match(new RegExp(`${name}="([^"]*)"`, "i"))
  return match ? decodeXml(match[1]) : ""
}

const unzipXlsx = (buffer) => {
  const files = new Map()
  let eocdOffset = -1
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Arquivo XLSX inválido.")
  }

  const entries = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirectoryOffset

  for (let i = 0; i < entries; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break
    const compression = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8")

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)
    let data
    if (compression === 0) {
      data = compressed
    } else if (compression === 8) {
      data = zlib.inflateRawSync(compressed)
    } else {
      data = Buffer.alloc(0)
    }
    files.set(fileName, data.toString("utf8"))
    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return files
}

const parseSharedStrings = (xml) => {
  if (!xml) return []
  const values = []
  const siRegex = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g
  let match
  while ((match = siRegex.exec(xml))) {
    const texts = []
    const textRegex = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g
    let textMatch
    while ((textMatch = textRegex.exec(match[1]))) {
      texts.push(decodeXml(textMatch[1]))
    }
    values.push(texts.join(""))
  }
  return values
}

const columnIndex = (cellRef) => {
  const letters = String(cellRef || "").match(/^[A-Z]+/i)?.[0] || ""
  return letters.split("").reduce((acc, letter) => acc * 26 + letter.toUpperCase().charCodeAt(0) - 64, 0) - 1
}

const cellValue = (attrs, body, sharedStrings) => {
  const type = getAttr(attrs, "t")
  if (type === "inlineStr") {
    const texts = []
    const textRegex = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g
    let textMatch
    while ((textMatch = textRegex.exec(body))) texts.push(decodeXml(textMatch[1]))
    return texts.join("")
  }
  const value = body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] || ""
  if (type === "s") return sharedStrings[Number(value)] || ""
  return decodeXml(value)
}

const parseWorksheet = (xml, sharedStrings) => {
  const rows = []
  const rowRegex = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g
  let rowMatch
  while ((rowMatch = rowRegex.exec(xml))) {
    const row = []
    const cellRegex = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const ref = getAttr(cellMatch[1], "r")
      row[columnIndex(ref)] = cellValue(cellMatch[1], cellMatch[2], sharedStrings)
    }
    rows.push(row)
  }
  return rows
}

const parseCatalogWorkbook = (buffer) => {
  const files = unzipXlsx(buffer)
  const sheet = files.get("xl/worksheets/sheet1.xml")
  if (!sheet) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A primeira aba do XLSX não foi encontrada.")
  }
  const sharedStrings = parseSharedStrings(files.get("xl/sharedStrings.xml"))
  const rows = parseWorksheet(sheet, sharedStrings).filter((row) =>
    row.some((value) => String(value || "").trim())
  )
  if (rows.length < 2) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A planilha não possui produtos para importar.")
  }
  const headers = rows[0].map(normalizeKey)
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Cabeçalhos obrigatórios ausentes: ${missing.join(", ")}`
    )
  }
  return rows.slice(1).map((row, index) => {
    const item = { row_number: index + 2 }
    headers.forEach((header, col) => {
      if (header) item[header] = String(row[col] || "").trim()
    })
    return item
  })
}

const getImportMetadata = (row) => ({
  source: "catalogo_condominios_xlsx",
  sku: row.sku,
  categoria: row.categoria || null,
  subcategoria: row.subcategoria || null,
  produto: row.produto || null,
  nome_comercial: row.nome_comercial || null,
  descricao_tecnica: row.descricao_tecnica || null,
  unidade_de_venda: row.unidade_de_venda || null,
  aplicacao: row.aplicacao || null,
  marca_sugerida: row.marca_sugerida || null,
  produto_recorrente: parseBoolean(row.produto_recorrente),
  produto_em_promocao: parseBoolean(row.produto_em_promocao),
  mais_vendido: parseBoolean(row.mais_vendido),
  produto_sob_encomenda: parseBoolean(row.produto_sob_encomenda),
  custo: parseNumber(row.custo),
  preco_venda: parseNumber(row.preco_venda),
  estoque: parseNumber(row.estoque),
  observacoes_programador: row.observacoes_programador || null,
})

const ensureManufacturers = async (scope, rows) => {
  const db = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const byKey = new Map()

  for (const row of rows) {
    const name = normalizeManufacturerName(row.marca_sugerida)
    const slug = slugify(name)
    if (!name || !slug || byKey.has(normalizeManufacturerKey(name))) continue
    byKey.set(normalizeManufacturerKey(name), { name, slug })
  }

  if (!byKey.size) return new Map()

  const slugs = Array.from(byKey.values()).map((item) => item.slug)
  const existingRows = await db("manufacturers")
    .select("id", "name", "slug", "image_url")
    .whereIn("slug", slugs)
  const existingBySlug = new Map(existingRows.map((item) => [item.slug, item]))

  const now = new Date()
  for (const item of byKey.values()) {
    if (existingBySlug.has(item.slug)) continue
    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : `manufacturer-${Date.now()}-${item.slug}`,
      name: item.name,
      slug: item.slug,
      image_url: null,
      is_active: true,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    }
    try {
      await db("manufacturers").insert(payload)
      existingBySlug.set(payload.slug, payload)
    } catch (err) {
      const existing = await db("manufacturers")
        .select("id", "name", "slug", "image_url")
        .where({ slug: item.slug })
        .first()
      if (existing) {
        existingBySlug.set(existing.slug, existing)
      } else {
        throw err
      }
    }
  }

  const manufacturersByName = new Map()
  for (const item of byKey.values()) {
    const manufacturer = existingBySlug.get(item.slug)
    if (manufacturer) {
      manufacturersByName.set(normalizeManufacturerKey(item.name), manufacturer)
    }
  }
  return manufacturersByName
}

const buildProductPayload = (row, options) => {
  const title = row.nome_comercial || row.produto
  const description = row.descricao_tecnica || row.aplicacao || null
  const unit = row.unidade_de_venda || "Única"
  const amount = toAmount(row.preco_venda, options.default_price)
  const metadata = getImportMetadata(row)
  const manufacturer = options.manufacturers_by_name?.get(
    normalizeManufacturerKey(row.marca_sugerida)
  )

  return {
    title,
    description,
    handle: slugify(`${title}-${row.sku}`),
    status: ProductStatus.PUBLISHED,
    thumbnail: DEFAULT_PRODUCT_IMAGE_URL,
    images: [{ url: DEFAULT_PRODUCT_IMAGE_URL }],
    shipping_profile_id: options.shipping_profile_id || undefined,
    sales_channels: options.sales_channel_id ? [{ id: options.sales_channel_id }] : undefined,
    options: [{ title: "Unidade", values: [unit] }],
    metadata: {
      catalog_import: metadata,
      featured: metadata.mais_vendido || metadata.produto_em_promocao || undefined,
      manufacturer_id: manufacturer?.id || undefined,
      manufacturer_slug: manufacturer?.slug || undefined,
      manufacturer_name: manufacturer?.name || row.marca_sugerida || undefined,
      manufacturer_image_url: manufacturer?.image_url || undefined,
    },
    variants: [
      {
        title: unit,
        sku: row.sku,
        allow_backorder: metadata.produto_sob_encomenda,
        manage_inventory: false,
        options: { Unidade: unit },
        prices: [{ currency_code: options.currency_code || DEFAULT_CURRENCY, amount }],
      },
    ],
  }
}

const chunk = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const findVariantsBySku = async (scope, skus) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const bySku = new Map()
  for (const skuChunk of chunk(skus, 100)) {
    const query = remoteQueryObjectFromString({
      entryPoint: "product_variant",
      variables: { filters: { sku: skuChunk } },
      fields: [
        "id",
        "sku",
        "title",
        "product_id",
        "product.id",
        "product.title",
        "product.thumbnail",
        "product.images.id",
        "product.images.url",
        "product.metadata",
        "product.sales_channels.id",
        "price_set.prices.id",
        "price_set.prices.currency_code",
      ],
    })
    const variants = await remoteQuery(query)
    for (const variant of variants || []) {
      if (variant?.sku && !bySku.has(String(variant.sku).toUpperCase())) {
        bySku.set(String(variant.sku).toUpperCase(), variant)
      }
    }
  }
  return bySku
}

const resolveSalesChannelId = async (scope, requestedId) => {
  if (requestedId) return requestedId
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const channels = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "sales_channel",
      variables: { limit: 1 },
      fields: ["id"],
    })
  )
  return channels?.[0]?.id || null
}

const createRows = async (scope, rows, options, summary, results) => {
  for (const rowChunk of chunk(rows, CREATE_BATCH_SIZE)) {
    const products = rowChunk.map((row) => buildProductPayload(row, options))
    try {
      const { result } = await createProductsWorkflow(scope).run({
        input: { products },
      })
      rowChunk.forEach((row, index) => {
        summary.created += 1
        results.push({
          row: row.row_number,
          action: "created",
          product_id: result?.[index]?.id || null,
          sku: row.sku,
        })
      })
    } catch (err) {
      for (const row of rowChunk) {
        try {
          const { result } = await createProductsWorkflow(scope).run({
            input: { products: [buildProductPayload(row, options)] },
          })
          summary.created += 1
          results.push({
            row: row.row_number,
            action: "created",
            product_id: result?.[0]?.id || null,
            sku: row.sku,
          })
        } catch (rowErr) {
          summary.failed += 1
          results.push({
            row: row.row_number,
            sku: row.sku,
            action: "failed",
            reason:
              rowErr?.message ||
              err?.message ||
              "Falha ao criar produto",
          })
        }
      }
    }
  }
}

const updateExistingRow = async (scope, row, existing, options) => {
  const payload = buildProductPayload(row, options)
  const variantPayload = payload.variants[0]

  const existingMetadata = existing.product?.metadata || {}
  const existingImages = Array.isArray(existing.product?.images) ? existing.product.images : []
  const hasExistingImage = Boolean(existing.product?.thumbnail) || existingImages.length > 0
  await updateProductsWorkflow(scope).run({
    input: {
      selector: { id: existing.product_id },
      update: {
        title: payload.title,
        description: payload.description,
        shipping_profile_id: payload.shipping_profile_id,
        ...(hasExistingImage
          ? {}
          : {
              thumbnail: DEFAULT_PRODUCT_IMAGE_URL,
              images: [{ url: DEFAULT_PRODUCT_IMAGE_URL }],
            }),
        metadata: {
          ...existingMetadata,
          ...payload.metadata,
          catalog_import: payload.metadata.catalog_import,
        },
      },
    },
  })

  const existingPrice = existing.price_set?.prices?.find(
    (price) => price.currency_code === (options.currency_code || DEFAULT_CURRENCY)
  )
  await updateProductVariantsWorkflow(scope).run({
    input: {
      selector: { id: existing.id, product_id: existing.product_id },
      update: {
        title: variantPayload.title,
        sku: row.sku,
        allow_backorder: variantPayload.allow_backorder,
        manage_inventory: false,
        prices: [
          {
            id: existingPrice?.id,
            currency_code: options.currency_code || DEFAULT_CURRENCY,
            amount: variantPayload.prices[0].amount,
          },
        ],
      },
    },
  })

  const existingSalesChannelIds = Array.isArray(existing.product?.sales_channels)
    ? existing.product.sales_channels.map((channel) => channel.id)
    : []
  if (options.sales_channel_id && !existingSalesChannelIds.includes(options.sales_channel_id)) {
    await linkProductsToSalesChannelWorkflow(scope).run({
      input: {
        id: options.sales_channel_id,
        add: [existing.product_id],
      },
    })
  }

  return { action: "updated", product_id: existing.product_id, variant_id: existing.id, sku: row.sku }
}

const POST = async (req, res) => {
  const body = req.body || {}
  const fileBase64 = String(body.file_base64 || "").replace(/^data:.*;base64,/, "")
  if (!fileBase64) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Envie o arquivo XLSX em file_base64.")
  }
  if (!body.shipping_profile_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "shipping_profile_id é obrigatório.")
  }

  const rows = parseCatalogWorkbook(Buffer.from(fileBase64, "base64"))
    .map((row) => ({ ...row, sku: String(row.sku || "").trim().toUpperCase() }))
    .filter((row) => row.sku && (row.produto || row.nome_comercial))

  const seen = new Set()
  const uniqueRows = []
  const skipped = []
  for (const row of rows) {
    if (seen.has(row.sku)) {
      skipped.push({ row: row.row_number, sku: row.sku, reason: "SKU duplicado na planilha" })
      continue
    }
    seen.add(row.sku)
    uniqueRows.push(row)
  }

  const summary = { created: 0, updated: 0, skipped: skipped.length, failed: 0 }
  const results = [...skipped.map((item) => ({ ...item, action: "skipped" }))]
  const manufacturersByName = await ensureManufacturers(req.scope, uniqueRows)
  const salesChannelId = await resolveSalesChannelId(req.scope, body.sales_channel_id || null)
  const options = {
    shipping_profile_id: body.shipping_profile_id,
    sales_channel_id: salesChannelId,
    default_price: body.default_price,
    currency_code: body.currency_code || DEFAULT_CURRENCY,
    manufacturers_by_name: manufacturersByName,
  }
  const existingBySku = await findVariantsBySku(
    req.scope,
    uniqueRows.map((row) => row.sku)
  )
  const rowsToCreate = []

  for (const row of uniqueRows) {
    const existing = existingBySku.get(row.sku)
    if (!existing?.id || !existing?.product_id) {
      rowsToCreate.push(row)
      continue
    }
    try {
      const result = await updateExistingRow(req.scope, row, existing, options)
      summary[result.action] += 1
      results.push({ row: row.row_number, ...result })
    } catch (err) {
      summary.failed += 1
      results.push({
        row: row.row_number,
        sku: row.sku,
        action: "failed",
        reason: err?.message || "Falha ao importar linha",
      })
    }
  }

  await createRows(req.scope, rowsToCreate, options, summary, results)

  res.json({ summary, results })
}

module.exports = { POST }
