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

async function listShippingProfiles(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/shipping-profiles?limit=200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(
      `Erro ao listar shipping profiles (${res.status}): ${text || "sem corpo"}`
    )
  }
  return json?.shipping_profiles || []
}

async function listProducts(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/products?limit=200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(`Erro ao listar produtos (${res.status}): ${text || "sem corpo"}`)
  }
  return json?.products || []
}

async function updateProductProfile(token, productId, profileId) {
  const { res, text } = await apiFetch(`${MEDUSA_URL}/admin/products/${productId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipping_profile_id: profileId }),
  })
  if (!res.ok) {
    throw new Error(
      `Erro ao atualizar produto ${productId} (${res.status}): ${text || "sem corpo"}`
    )
  }
}

async function run() {
  const token = await authenticate()
  const [profiles, products] = await Promise.all([
    listShippingProfiles(token),
    listProducts(token),
  ])

  const targetProfile =
    profiles.find((profile) => profile?.name === "Entrega Condominio") ||
    profiles[0]

  if (!targetProfile) {
    throw new Error("Nenhum shipping profile encontrado.")
  }

  const pending = products.filter((product) => !product?.shipping_profile_id)
  if (!pending.length) {
    console.log("Nenhum produto sem shipping profile.")
    return
  }

  console.log(
    `Atualizando ${pending.length} produtos para o shipping profile ${targetProfile.id} (${targetProfile.name})`
  )
  for (const product of pending) {
    await updateProductProfile(token, product.id, targetProfile.id)
    console.log(`- ${product.id} ${product.title}`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
