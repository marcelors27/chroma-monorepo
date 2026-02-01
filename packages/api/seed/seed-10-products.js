const products = require("./products-cleaning-construction.json")

const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(name)
  if (idx === -1) return null
  return args[idx + 1] || null
}

const MEDUSA_URL =
  getArg("--backend") ||
  process.env.MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_URL ||
  null
const ADMIN_EMAIL =
  getArg("--email") ||
  process.env.SEED_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "admin@chroma.local"
const ADMIN_PASSWORD =
  getArg("--password") ||
  process.env.SEED_ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  "supersecret"

const dbUrl = getArg("--db") || process.env.DATABASE_URL || null

async function authenticate() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Falha ao autenticar admin (${res.status}): ${body || "sem corpo"}`
    )
  }

  const json = await res.json()
  return json?.token
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = null
  }
  return { res, text, json }
}

async function listProductTypes(token) {
  const { res, text, json } = await apiFetch(`${MEDUSA_URL}/admin/product-types?limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Erro ao listar product types (${res.status}): ${text || "sem corpo"}`)
  }
  const types = json?.product_types || json?.types || []
  const map = new Map()
  types.forEach((type) => {
    if (type?.value && type?.id) {
      map.set(type.value, type.id)
    }
  })
  return map
}

async function ensureProductType(token, value, cache) {
  if (!value) return null
  const existing = cache.get(value)
  if (existing) return existing
  const { res, text, json } = await apiFetch(`${MEDUSA_URL}/admin/product-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) {
    throw new Error(`Erro ao criar product type "${value}" (${res.status}): ${text || "sem corpo"}`)
  }
  const id = json?.product_type?.id || json?.type?.id
  if (!id) {
    throw new Error(`Product type criado sem id: ${value}`)
  }
  cache.set(value, id)
  return id
}

async function seedProduct(token, product) {
  const res = await fetch(`${MEDUSA_URL}/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  })

  if (res.status === 409) {
    console.log(`Produto já existe: ${product.title}`)
    return null
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro ao criar ${product.title} (${res.status}): ${body || "sem corpo"}`)
  }

  const created = await res.json()
  console.log(`Criado produto ${created.product.title}`)
  return created.product
}

async function run() {
  if (!MEDUSA_URL) {
    throw new Error(
      "Informe o backend via --backend ou MEDUSA_BACKEND_URL. Ex: --backend https://api.seu-dominio.com"
    )
  }

  if (dbUrl) {
    console.log("DATABASE_URL informado (não usado para seed via API).")
  }

  console.log("Iniciando seed de 10 produtos (limpeza + material de obra)...")
  const token = await authenticate()
  const typeCache = await listProductTypes(token)
  const salesChannelId = await resolveSalesChannelId(token)
  await deleteExistingProducts(token, products)

  const stockLocationId = await resolveStockLocationId(token)

  for (const product of products) {
    const payload = { ...product }
    if (!payload.handle && payload.title) {
      payload.handle = slugify(payload.title)
    }
    if (payload.type && !payload.type_id) {
      const typeValue = typeof payload.type === "string" ? payload.type : payload.type?.value
      if (typeValue) {
        payload.type_id = await ensureProductType(token, typeValue, typeCache)
      }
      delete payload.type
    }
    normalizePrices(payload)
    if (salesChannelId) {
      payload.sales_channels = [{ id: salesChannelId }]
    }
    if (!payload.status) {
      payload.status = "published"
    }
    const desiredInventory = extractInventory(payload)
    stripInventory(payload)
    markManageInventory(payload, desiredInventory)
    const createdProduct = await seedProduct(token, payload)
    const productToAdjust =
      createdProduct ||
      (desiredInventory.size ? await fetchExistingProduct(token, payload) : null)
    if (productToAdjust && stockLocationId && desiredInventory.size) {
      const productId = productToAdjust.id || productToAdjust?.product?.id
      const hydrated = await fetchProductWithInventory(token, productId)
      await applyInventoryLevels(
        token,
        hydrated || productToAdjust,
        stockLocationId,
        desiredInventory
      )
    }
  }
  console.log("Seed finalizado.")
}

function normalizePrices(payload) {
  for (const variant of payload.variants || []) {
    for (const price of variant.prices || []) {
      if (typeof price.amount === "number") {
        if (price.amount < 1000) {
          price.amount = Math.round(price.amount * 100)
        } else {
          price.amount = Math.round(price.amount)
        }
      }
    }
  }
}

async function deleteExistingProducts(token, productList) {
  console.log("Removendo produtos existentes do seed...")
  for (const product of productList) {
    const handle = slugify(product.title)
    const { res, json } = await apiFetch(
      `${MEDUSA_URL}/admin/products?handle=${encodeURIComponent(handle)}&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) continue
    const items = json?.products || []
    for (const item of items) {
      if (!item?.id) continue
      const del = await apiFetch(`${MEDUSA_URL}/admin/products/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!del.res.ok) {
        console.warn(`Aviso: falha ao excluir ${item.title} (${del.res.status})`)
      } else {
        console.log(`Removido ${item.title}`)
      }
    }
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80)
}

async function fetchProductWithInventory(token, productId) {
  if (!productId) return null
  const { res, json } = await apiFetch(
    `${MEDUSA_URL}/admin/products/${productId}?expand=variants,variants.inventory_items`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  return json?.product || json
}

async function fetchExistingProduct(token, payload) {
  const queries = []
  if (payload.handle) {
    queries.push(`${MEDUSA_URL}/admin/products?handle=${encodeURIComponent(payload.handle)}`)
  }
  if (payload.title) {
    queries.push(`${MEDUSA_URL}/admin/products?title=${encodeURIComponent(payload.title)}`)
    queries.push(`${MEDUSA_URL}/admin/products?limit=1&q=${encodeURIComponent(payload.title)}`)
  }
  for (const url of queries) {
    const { res, json } = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) continue
    const items = json?.products || json?.data || []
    if (items.length) return items[0]
  }
  return null
}

function extractInventory(payload) {
  const map = new Map()
  for (const variant of payload.variants || []) {
    const qty = variant.inventory_quantity
    if (qty === undefined || qty === null) continue
    const key = variant.sku || variant.title
    if (key) map.set(key, qty)
  }
  return map
}

function stripInventory(payload) {
  for (const variant of payload.variants || []) {
    if ("inventory_quantity" in variant) {
      delete variant.inventory_quantity
    }
  }
}

function markManageInventory(payload, desiredInventory) {
  for (const variant of payload.variants || []) {
    const key = variant.sku || variant.title
    if (!key || !desiredInventory.has(key)) continue
    variant.manage_inventory = true
    variant.allow_backorder = false
  }
}

async function resolveStockLocationId(token) {
  const { res, text, json } = await apiFetch(`${MEDUSA_URL}/admin/stock-locations?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.warn(`Aviso: não foi possível obter stock location (${res.status}): ${text || "sem corpo"}`)
    return null
  }
  const location = (json?.stock_locations || json?.locations || [])[0]
  return location?.id || null
}

async function resolveSalesChannelId(token) {
  const { res, text, json } = await apiFetch(`${MEDUSA_URL}/admin/sales-channels?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.warn(`Aviso: não foi possível obter sales channel (${res.status}): ${text || "sem corpo"}`)
    return null
  }
  const channel = (json?.sales_channels || json?.data || [])[0]
  return channel?.id || null
}

async function findInventoryItemIdBySku(token, sku) {
  const { res, json } = await apiFetch(
    `${MEDUSA_URL}/admin/inventory-items?limit=1&sku=${encodeURIComponent(sku)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const items = json?.inventory_items || []
  return items[0]?.id || null
}

async function ensureInventoryItem(token, sku, title, locationId, quantity) {
  let inventoryItemId = await findInventoryItemIdBySku(token, sku)
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
  if (!inventoryItemId) {
    const inventoryRes = await apiFetch(`${MEDUSA_URL}/admin/inventory-items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku,
        title: title || sku,
        location_levels: [
          {
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      }),
    })
    if (!inventoryRes.res.ok) {
      const body = inventoryRes.text
      throw new Error(body || "Falha ao criar inventory item.")
    }
    inventoryItemId = inventoryRes.json?.inventory_item?.id
    return inventoryItemId || null
  }

  const levelRes = await apiFetch(
    `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        location_id: locationId,
        stocked_quantity: quantity,
      }),
    }
  )
  if (!levelRes.res.ok) {
    const body = levelRes.text || ""
    if (!body.includes("already exists")) {
      throw new Error(body || "Falha ao atualizar estoque.")
    }
    const updateRes = await apiFetch(
      `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ stocked_quantity: quantity }),
      }
    )
    if (!updateRes.res.ok) {
      throw new Error(updateRes.text || "Falha ao atualizar estoque.")
    }
  }
  return inventoryItemId
}

async function linkInventoryToVariant(token, productId, variantId, inventoryItemId) {
  const linkRes = await apiFetch(
    `${MEDUSA_URL}/admin/products/${productId}/variants/${variantId}/inventory-items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        required_quantity: 1,
      }),
    }
  )
  if (!linkRes.res.ok) {
    throw new Error(linkRes.text || "Falha ao vincular o estoque.")
  }
}

async function applyInventoryLevels(token, product, locationId, desiredInventory) {
  const variants = product?.variants || []
  const productId = product?.id || product?.product?.id
  for (const variant of variants) {
    const sku = variant?.sku
    if (!sku || !desiredInventory.has(sku)) continue
    const qty = desiredInventory.get(sku)
    const inventoryItemId = await ensureInventoryItem(token, sku, product?.title, locationId, qty)
    if (!inventoryItemId) {
      console.warn(`Aviso: inventory item não encontrado para variante ${sku}`)
      continue
    }
    if (productId && variant?.id) {
      await linkInventoryToVariant(token, productId, variant.id, inventoryItemId)
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
