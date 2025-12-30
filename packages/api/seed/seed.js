const path = require("path")
const products = require("./products.json")

// Allow overriding the API URL via env; fallback to local dev default.
const MEDUSA_URL =
  process.env.MEDUSA_BACKEND_URL || process.env.MEDUSA_URL || "http://localhost:9000"
const ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "admin@chroma.local"
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  "supersecret"

async function authenticate() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Falha ao autenticar admin (${res.status}): ${body}. Crie o usuário com "medusa user -e ${ADMIN_EMAIL} -p ${ADMIN_PASSWORD}".`
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
    return
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Erro ao criar ${product.title} (${res.status}): ${body || "sem corpo"}`
    )
  }

  const created = await res.json()
  console.log(`Criado produto ${created.product.title}`)
}

async function run() {
  console.log("Iniciando seed de produtos Chroma...")
  const token = await authenticate()
  const typeCache = await listProductTypes(token)
  for (const product of products) {
    // Cria sequencialmente para evitar falhas por validação/ordem de opções
    const payload = { ...product }
    if (payload.type && !payload.type_id) {
      const typeValue = typeof payload.type === "string" ? payload.type : payload.type?.value
      if (typeValue) {
        payload.type_id = await ensureProductType(token, typeValue, typeCache)
      }
      delete payload.type
    }
    await seedProduct(token, payload)
  }
  console.log("Seed finalizado.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
