const { loadEnv } = require("./load-env")

loadEnv()

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

async function authenticate() {
  const { res, text, json } = await apiFetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  if (!res.ok) {
    throw new Error(
      `Falha ao autenticar admin (${res.status}): ${text || "sem corpo"}`
    )
  }

  return json?.token
}

async function listProducts(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/products?limit=200&fields=id,title,variants.id,variants.prices.id,variants.prices.amount,variants.prices.currency_code`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(`Erro ao listar produtos (${res.status}): ${text || "sem corpo"}`)
  }
  return json?.products || []
}

async function updateProduct(token, productId, payload) {
  const { res, text } = await apiFetch(`${MEDUSA_URL}/admin/products/${productId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(
      `Erro ao atualizar produto ${productId} (${res.status}): ${text || "sem corpo"}`
    )
  }
}

function scaleAmount(amount) {
  return Number((amount / 100).toFixed(2))
}

async function run() {
  const token = await authenticate()
  const products = await listProducts(token)
  if (!products.length) {
    console.log("Nenhum produto encontrado.")
    return
  }

  for (const product of products) {
    const variants = product?.variants || []
    const updates = []

    for (const variant of variants) {
      const prices = variant?.prices || []
      const priceUpdates = []

      for (const price of prices) {
        if (!price?.currency_code) continue
        if (price.currency_code.toLowerCase() !== "brl") continue
        if (typeof price.amount !== "number") continue
        const nextAmount = scaleAmount(price.amount)
        priceUpdates.push({ id: price.id, amount: nextAmount })
      }

      if (priceUpdates.length) {
        updates.push({ id: variant.id, prices: priceUpdates })
      }
    }

    if (updates.length) {
      await updateProduct(token, product.id, { variants: updates })
      console.log(`Atualizado: ${product.id} ${product.title}`)
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
