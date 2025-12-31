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

async function listRegions(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/regions?fields=id,payment_providers&limit=200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(`Erro ao listar regiões (${res.status}): ${text || "sem corpo"}`)
  }
  return json?.regions || []
}

async function listProviders(token) {
  const { res, text, json } = await apiFetch(
    `${MEDUSA_URL}/admin/payments/payment-providers?limit=200`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    throw new Error(
      `Erro ao listar payment providers (${res.status}): ${text || "sem corpo"}`
    )
  }
  return json?.payment_providers || []
}

function resolveStripeProviderId(providers) {
  if (!Array.isArray(providers) || !providers.length) return null
  const exact = providers.find((p) => p?.id === "pp_stripe_stripe")
  if (exact) return exact.id
  const fallback = providers.find(
    (p) => typeof p?.id === "string" && p.id.includes("stripe")
  )
  return fallback?.id || null
}

async function updateRegion(token, id, paymentProviders) {
  const { res, text } = await apiFetch(`${MEDUSA_URL}/admin/regions/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ payment_providers: paymentProviders }),
  })
  if (!res.ok) {
    throw new Error(
      `Erro ao atualizar região ${id} (${res.status}): ${text || "sem corpo"}`
    )
  }
}

async function run() {
  console.log("Configurando payment providers nas regiões...")
  const token = await authenticate()
  const providers = await listProviders(token)
  const stripeProviderId = resolveStripeProviderId(providers)
  if (!stripeProviderId) {
    throw new Error(
      `Provider do Stripe nao encontrado. Providers disponiveis: ${providers
        .map((p) => p?.id)
        .filter(Boolean)
        .join(", ")}`
    )
  }
  const regions = await listRegions(token)
  if (!regions.length) {
    console.log("Nenhuma região encontrada.")
    return
  }

  for (const region of regions) {
    const current = Array.isArray(region.payment_providers)
      ? region.payment_providers
      : []
    if (current.includes(stripeProviderId)) {
      console.log(`Região ${region.id}: stripe já configurado.`)
      continue
    }
    const next = [...current, stripeProviderId]
    await updateRegion(token, region.id, next)
    console.log(`Região ${region.id}: stripe adicionado.`)
  }

  console.log("Concluído.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
