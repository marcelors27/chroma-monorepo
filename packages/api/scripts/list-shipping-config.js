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

async function listShippingOptions(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/shipping-options?limit=200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(
      `Erro ao listar shipping options (${res.status}): ${text || "sem corpo"}`
    )
  }
  return json?.shipping_options || []
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

function byId(items) {
  return new Map(items.map((item) => [item.id, item]))
}

async function run() {
  const token = await authenticate()
  const [profiles, options, products] = await Promise.all([
    listShippingProfiles(token),
    listShippingOptions(token),
    listProducts(token),
  ])

  const profileMap = byId(profiles)
  const optionsByProfile = options.reduce((acc, option) => {
    const profileId = option?.shipping_profile_id
    if (!profileId) return acc
    if (!acc.has(profileId)) acc.set(profileId, [])
    acc.get(profileId).push(option)
    return acc
  }, new Map())

  console.log("Shipping profiles:")
  if (!profiles.length) {
    console.log("  (nenhum)")
  } else {
    profiles.forEach((profile) => {
      const count = optionsByProfile.get(profile.id)?.length || 0
      console.log(`- ${profile.id} ${profile.name} (options: ${count})`)
    })
  }

  console.log("\nProdutos por shipping profile:")
  if (!products.length) {
    console.log("  (nenhum)")
  } else {
    const productsByProfile = products.reduce((acc, product) => {
      const profileId = product?.shipping_profile_id || "none"
      if (!acc.has(profileId)) acc.set(profileId, [])
      acc.get(profileId).push(product)
      return acc
    }, new Map())
    for (const [profileId, items] of productsByProfile.entries()) {
      const name = profileMap.get(profileId)?.name || "sem profile"
      console.log(`- ${profileId} ${name} (${items.length})`)
      items.slice(0, 5).forEach((product) => {
        console.log(`  • ${product.id} ${product.title}`)
      })
      if (items.length > 5) {
        console.log(`  • ... +${items.length - 5}`)
      }
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
