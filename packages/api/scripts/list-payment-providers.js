const path = require("path")
const dotenv = require("dotenv")

dotenv.config({ path: path.join(__dirname, "..", ".env") })

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

async function run() {
  const token = await authenticate()
  const providers = await listProviders(token)
  if (!providers.length) {
    console.log("Nenhum payment provider encontrado.")
    return
  }

  console.log(
    providers.map((provider) => provider.id).filter(Boolean).sort().join("\n")
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
