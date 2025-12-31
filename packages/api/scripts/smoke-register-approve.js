#!/usr/bin/env node
/**
 * Smoke test: register a company customer, verify it appears in pending list,
 * approve it, and confirm store login + /store/customers/me work.
 *
 * Requirements:
 * - API running locally (uses MEDUSA_URL or http://localhost:9000)
 * - Admin credentials in ADMIN_EMAIL / ADMIN_PASSWORD (fallback to supersecret defaults)
 */
const crypto = require("crypto")
const { loadEnv } = require("./load-env")

loadEnv()

const MEDUSA_URL = process.env.MEDUSA_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@chroma.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret"
const PUBLISHABLE_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const SALES_CHANNEL_ID = process.env.MEDUSA_SALES_CHANNEL_ID
let resolvedSalesChannelId = SALES_CHANNEL_ID
const DEBUG = 1

const logDebug = (...args) => {
  if (DEBUG) console.log("[debug]", ...args)
}

function calcCnpjDigit(numbers, weights) {
  const sum = numbers.reduce((acc, num, idx) => acc + num * weights[idx], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function generateValidCnpj() {
  // 8 random digits for company root + 4 for branch (0001)
  const base = Array.from({ length: 12 }, (_, i) =>
    i >= 8 ? (i === 8 ? 0 : i === 9 ? 0 : i === 10 ? 0 : 1) : Math.floor(Math.random() * 10)
  )
  const digit1 = calcCnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const digit2 = calcCnpjDigit([...base, digit1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return [...base, digit1, digit2].join("")
}

async function jsonOrText(res) {
  const text = await res.text()
  try {
    return JSON.parse(text || "{}")
  } catch {
    return text
  }
}

async function doFetch(url, options, label) {
  logDebug("Request:", label || url, options)
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    throw new Error(`Fetch failed for ${url}: ${err?.message || err}`)
  }

  try {
    const body = await res.clone().text()
    logDebug("Response:", label || url, res.status, body)
  } catch (err) {
    logDebug("Response read error:", err?.message || err)
  }

  return res
}

async function adminLogin() {
  const res = await doFetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  }, "admin auth")
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Admin login failed (${res.status}): ${body}`)
  }
  const json = await res.json()
  return json.token
}

async function resolveSalesChannel(adminToken) {
  if (resolvedSalesChannelId) return resolvedSalesChannelId
  try {
    const res = await doFetch(`${MEDUSA_URL}/admin/sales-channels?limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }, "admin sales-channels")
    if (res.ok) {
      const json = await res.json()
      resolvedSalesChannelId = json.sales_channels?.[0]?.id
      logDebug("Resolved sales channel id:", resolvedSalesChannelId)
    }
  } catch (err) {
    logDebug("Could not resolve sales channel id:", err?.message || err)
  }
  return resolvedSalesChannelId
}

function buildStoreHeaders(extra = {}) {
  const storeHeaders = { "Content-Type": "application/json", ...extra }
  if (PUBLISHABLE_KEY) storeHeaders["x-publishable-api-key"] = PUBLISHABLE_KEY
  if (resolvedSalesChannelId) storeHeaders["x-medusa-sales-channel-id"] = resolvedSalesChannelId
  return storeHeaders
}

async function registerStoreUser({ email, password, tradeName, fantasyName, cnpj }) {
  const storeHeaders = buildStoreHeaders()
  logDebug(`${PUBLISHABLE_KEY} pub key`)

  const primaryRegister = `${MEDUSA_URL}/auth/store/emailpass/register`
  const fallbackRegister = `${MEDUSA_URL}/store/auth/emailpass/register`

  let registerRes = await doFetch(primaryRegister, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ email, password }),
  }, "store register")

  if (registerRes.status === 404 && !process.env.SMOKE_REGISTER_PATH) {
    logDebug("Primary register path 404, trying fallback:", fallbackRegister)
    registerRes = await doFetch(fallbackRegister, {
      method: "POST",
      headers: storeHeaders,
      body: JSON.stringify({ email, password }),
    }, "store register fallback")
  }
  if (!registerRes.ok) {
    const body = await registerRes.text()
    throw new Error(`Register failed (${registerRes.status}): ${body}`)
  }
  const registerJson = await registerRes.json()
  const token = registerJson?.token
  if (!token) throw new Error("Register did not return token")

  const companyRes = await doFetch(`${MEDUSA_URL}/store/companies`, {
    method: "POST",
    headers: {
      ...storeHeaders,
      Authorization: `Bearer ${token}`,
      Cookie: `store_token=${token}`,
    },
    body: JSON.stringify({
      trade_name: tradeName,
      fantasy_name: fantasyName,
      cnpj,
    }),
  }, "store create company")
  if (!companyRes.ok) {
    const body = await companyRes.text()
    throw new Error(`Create company failed (${companyRes.status}): ${body}`)
  }
  const json = await companyRes.json()
  return { customerId: registerJson?.customer_id || null, companyId: json.company?.id, token }
}

async function getPendingCustomers(adminToken) {
  const res = await doFetch(`${MEDUSA_URL}/admin/companies/pending`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }, "admin pending")
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pending fetch failed (${res.status}): ${body}`)
  }
  const json = await res.json()
  return json.companies || []
}

async function setApproval(adminToken, id, approved) {
  const action = approved ? "approve" : "reject"
  const res = await doFetch(`${MEDUSA_URL}/admin/companies/${id}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  }, `admin set approved=${approved}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Approve/reject failed (${res.status}): ${body}`)
  }
}

async function storeLogin(email, password) {
  const storeHeaders = buildStoreHeaders()

  const primaryLogin = `${MEDUSA_URL}/auth/store/emailpass`
  const fallbackLogin = `${MEDUSA_URL}/store/auth/emailpass`

  let res = await doFetch(primaryLogin, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ email, password }),
  }, "store login")

  if (res.status === 404) {
    logDebug("Primary store login 404, trying fallback:", fallbackLogin)
    res = await doFetch(fallbackLogin, {
      method: "POST",
      headers: storeHeaders,
      body: JSON.stringify({ email, password }),
    }, "store login fallback")
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Store login failed (${res.status}): ${body}`)
  }
  const json = await res.json()
  return json.token
}

async function getMe(storeToken) {
  const headers = {
    Authorization: `Bearer ${storeToken}`,
    Cookie: `store_token=${storeToken}`,
  }
  if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  if (resolvedSalesChannelId) headers["x-medusa-sales-channel-id"] = resolvedSalesChannelId

  const res = await doFetch(`${MEDUSA_URL}/store/customers/me`, {
    headers,
  }, "store me")
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Me fetch failed (${res.status}): ${body}`)
  }
  return jsonOrText(res)
}

async function run() {
  const suffix = crypto.randomBytes(4).toString("hex")
  const email = `smoke${suffix}@company.test`
  const password = `Pass!${suffix}`
  const tradeName = `Smoke Company ${suffix}`
  const fantasyName = `Smoke ${suffix}`
  const cnpj = generateValidCnpj()


  try {
    await doFetch(`${MEDUSA_URL}/health`, { method: "GET" }, "health check")
  } catch (err) {
    console.error("API health check failed. Is the backend running on MEDUSA_URL?")
    throw err
  }

  console.log("1) Logging in as admin (to resolve sales channel)")
  const adminToken = await adminLogin()
  await resolveSalesChannel(adminToken)

  if (DEBUG) {
    console.log("[debug] ENV ->", {
      MEDUSA_URL,
      ADMIN_EMAIL,
      ADMIN_PASSWORD: ADMIN_PASSWORD ? "***" : "",
      PUBLISHABLE_KEY: PUBLISHABLE_KEY ? "***" : "",
      SALES_CHANNEL_ID: resolvedSalesChannelId,
    })
  }

  console.log("2) Registering store user:", email)
  const { customerId, companyId } = await registerStoreUser({
    email,
    password,
    tradeName,
    fantasyName,
    cnpj,
  })
  if (!companyId) throw new Error("Company ID missing after registration")
  console.log("   Created company", companyId)

  console.log("3) Checking pending list for new company")
  const pending = await getPendingCustomers(adminToken)
  if (!pending.find((c) => c.id === companyId)) {
    throw new Error("Company not found in pending list")
  }
  console.log("   Found in pending")

  console.log("4) Approving company")
  await setApproval(adminToken, companyId, true)

  console.log("5) Logging in as store customer")
  const storeToken = await storeLogin(email, password)

  console.log("6) Fetching /store/customers/me")
  const me = await getMe(storeToken)
  console.log("   Success:", me?.customer?.id || me?.id || "(see output)")

  console.log("Smoke test passed.")
}

run().catch((err) => {
  console.error("Smoke test failed:", err?.message || err)
  process.exit(1)
})
