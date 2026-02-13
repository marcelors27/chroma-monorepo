// Default to local Medusa dev port; override with VITE_MEDUSA_URL. If you prefer relative "/api",
// set a dev proxy in vite.config.ts (already added below) or adjust this env.
const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY
const SALES_CHANNEL_ID = import.meta.env.VITE_MEDUSA_SALES_CHANNEL_ID
const REGION_ID = import.meta.env.VITE_MEDUSA_REGION_ID
const CURRENCY_CODE = import.meta.env.VITE_MEDUSA_CURRENCY_CODE
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_URL || MEDUSA_URL
const MEDUSA_ORIGIN = (() => {
  if (!MEDUSA_URL || !/^https?:\/\//i.test(MEDUSA_URL)) return null
  try {
    return new URL(MEDUSA_URL).origin
  } catch {
    return null
  }
})()
const DEBUG = import.meta.env.VITE_DEBUG_FRONT === "true"

const AUTH_TOKEN_KEY = "chroma_front_store_token"
const CART_ID_KEY = "chroma_front_store_cart_id"
const PENDING_PAYMENT_KEY = "chroma_front_store_pending_payment"
const ACTIVE_CONDO_KEY = "chroma_front_store_active_condo"

type FetchInit = RequestInit & { auth?: boolean }

export type MedusaPrice = {
  amount: number
  currency_code: string
  price_list_id?: string
  price_list_type?: string
}

export type MedusaCalculatedPrice = {
  calculated_amount?: number
  original_amount?: number
  calculated_price?: number
  original_price?: number
  amount?: number
  currency_code?: string
  price_list_type?: string
}

export type MedusaVariant = {
  id: string
  title: string
  prices: MedusaPrice[]
  inventory_quantity?: number
  metadata?: Record<string, unknown>
  options?: {
    id?: string
    option_id?: string
    value?: string
    option?: { id?: string; title?: string }
  }[]
  calculated_price?: MedusaCalculatedPrice | number
}

export type MedusaProduct = {
  id: string
  title: string
  description?: string
  thumbnail?: string
  handle?: string
  collection_id?: string
  type?: { id: string; value: string }
  tags?: { id: string; value: string }[]
  variants?: MedusaVariant[]
  images?: { id?: string; url?: string; thumbnail?: string }[]
  metadata?: Record<string, unknown>
  options?: { id?: string; title?: string }[]
}

export type MedusaCart = {
  id: string
  items: MedusaLineItem[]
  shipping_address?: Record<string, any>
  region_id?: string
  shipping_methods?: any[]
  payment_session?: any
  payment_sessions?: any[]
  total?: number
  subtotal?: number
  shipping_total?: number
  tax_total?: number
  discount_total?: number
  created_at?: string
}

export type MedusaLineItem = {
  id: string
  title: string
  quantity: number
  variant_id?: string
  thumbnail?: string
  unit_price: number
  product_id?: string
  metadata?: Record<string, any>
}

export type MedusaPaymentSession = {
  id?: string
  provider_id?: string
  data?: Record<string, any>
}

export type MedusaPaymentCollection = {
  id: string
  payment_sessions?: MedusaPaymentSession[]
}

export type PendingPaymentDetails = {
  method?: string
  boleto_line?: string
  boleto_url?: string
  boleto_expires_at?: number
  boleto_expires_after_days?: number
  pix_code?: string
  pix_qr?: string
  pix_txid?: string
  pix_expires_at?: number
  pix_expires_after_days?: number
  company_id?: string
  company_name?: string
  amount?: number
  currency_code?: string
}

export type SavedPaymentMethod = {
  id: string
  type: "credit" | "pix" | "boleto"
  label: string
  details?: {
    email?: string
    boleto_expires_after_days?: number
  }
  is_default?: boolean
  created_at?: string
  last_used_at?: string
}

export type ActiveCondo = {
  id: string
  name: string
  cnpj?: string
  points_balance?: number
  billing_emails?: string[]
}

export type PendingPayment = {
  cart_id: string
  payment_collection_id: string
  method?: string
  created_at?: string
  details?: PendingPaymentDetails
}

export type MedusaOrder = {
  id: string
  display_id?: string
  created_at?: string
  status?: string
  fulfillment_status?: string
  payment_status?: string
  total?: number
  items?: MedusaLineItem[]
  shipping_address?: Record<string, any>
}

export type MedusaCustomer = {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, any>
  created_at?: string
}

export type MedusaNews = {
  id: string
  title: string
  summary: string
  content: string
  category?: string | null
  image_url?: string | null
  author?: string | null
  source?: string | null
  read_time?: number | null
  published_at?: string | null
  is_published?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type MedusaMarketingBanner = {
  id: string
  title: string
  subtitle?: string | null
  image_url?: string | null
  image_mobile_url?: string | null
  animation_url?: string | null
  animation_mobile_url?: string | null
  fallback_image_url?: string | null
  fallback_image_mobile_url?: string | null
  link_type?: string | null
  link_value?: string | null
  sort_order?: number | null
  active_from?: string | null
  active_until?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type RecurrenceItem = {
  variant_id: string
  quantity: number
  title?: string
  product_id?: string
  price?: number
  category?: string
}

export type Recurrence = {
  id: string
  name: string
  frequency: "weekly" | "biweekly" | "monthly"
  day_of_week?: number | null
  day_of_month?: number | null
  payment_method: "credit" | "pix" | "boleto"
  items: RecurrenceItem[]
  company_id?: string | null
  start_date?: string | null
  status: "active" | "paused"
  next_run_at?: string | null
  last_run_at?: string | null
  created_at?: string
  updated_at?: string
}

const getToken = () => {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

const setToken = (token: string | null) => {
  if (typeof localStorage === "undefined") return
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    return
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const setAuthToken = (token: string | null) => {
  setToken(token)
}

const getCartId = () => {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(CART_ID_KEY)
}

const setCartId = (cartId: string | null) => {
  if (typeof localStorage === "undefined") return
  if (!cartId) {
    localStorage.removeItem(CART_ID_KEY)
    return
  }
  localStorage.setItem(CART_ID_KEY, cartId)
}

export const getActiveCondo = (): ActiveCondo | null => {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(ACTIVE_CONDO_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const setActiveCondo = (condo: ActiveCondo | null) => {
  if (typeof localStorage === "undefined") return
  if (!condo) {
    localStorage.removeItem(ACTIVE_CONDO_KEY)
    return
  }
  localStorage.setItem(ACTIVE_CONDO_KEY, JSON.stringify(condo))
}

const readPendingPayments = (): PendingPayment[] => {
  if (typeof localStorage === "undefined") return []
  const raw = localStorage.getItem(PENDING_PAYMENT_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return parsed ? [parsed] : []
  } catch {
    return []
  }
}

const writePendingPayments = (pending: PendingPayment[]) => {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pending))
}

const normalizePendingPayments = (value: unknown): PendingPayment[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && item.payment_collection_id)
}

export const getPendingPayments = (): PendingPayment[] => {
  return readPendingPayments()
}

export const getPendingPayment = (): PendingPayment | null => {
  const pending = getPendingPayments()
  if (!pending.length) return null
  const sorted = [...pending].sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0
    const bTime = b.created_at ? Date.parse(b.created_at) : 0
    return bTime - aTime
  })
  return sorted[0] || null
}

export const setPendingPayment = (pending: PendingPayment | null) => {
  if (!pending) return
  const current = getPendingPayments()
  const next = current.filter(
    (item) => item.payment_collection_id !== pending.payment_collection_id
  )
  next.push(pending)
  writePendingPayments(next)
}

export const removePendingPayment = (criteria: {
  cart_id?: string
  payment_collection_id?: string
}) => {
  const current = getPendingPayments()
  if (!current.length) return
  const next = current.filter((item) => {
    if (criteria.payment_collection_id) {
      return item.payment_collection_id !== criteria.payment_collection_id
    }
    if (criteria.cart_id) {
      return item.cart_id !== criteria.cart_id
    }
    return true
  })
  writePendingPayments(next)
}

export const clearPendingPayments = () => {
  if (typeof localStorage === "undefined") return
  localStorage.removeItem(PENDING_PAYMENT_KEY)
}

export const mergePendingPayments = (
  local: PendingPayment[],
  remote: PendingPayment[]
) => {
  const map = new Map<string, PendingPayment>()
  for (const item of local) {
    if (!item?.payment_collection_id) continue
    map.set(item.payment_collection_id, item)
  }
  for (const item of remote) {
    if (!item?.payment_collection_id) continue
    const existing = map.get(item.payment_collection_id)
    map.set(item.payment_collection_id, {
      ...existing,
      ...item,
      details: { ...existing?.details, ...item?.details },
    })
  }
  return Array.from(map.values())
}

export const fetchPendingPaymentsFromBackend = async (): Promise<PendingPayment[]> => {
  try {
    const customer = await getCustomerMe()
    return normalizePendingPayments(customer?.metadata?.pending_payments)
  } catch {
    return []
  }
}

const normalizeSavedPaymentMethods = (value: unknown): SavedPaymentMethod[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item) => item && item.type) as SavedPaymentMethod[]
}

const buildPaymentMethodId = (
  type: SavedPaymentMethod["type"],
  details?: SavedPaymentMethod["details"]
) => {
  const suffix = (details?.email || "default").toLowerCase()
  return `${type}:${suffix}`
}

const buildSavedPaymentMethodsMetadata = (
  metadata: Record<string, any>,
  paymentMethods: SavedPaymentMethod[]
) => {
  return { ...metadata, payment_methods: paymentMethods }
}

export const fetchSavedPaymentMethodsFromBackend = async (): Promise<SavedPaymentMethod[]> => {
  try {
    const customer = await getCustomerMe()
    return normalizeSavedPaymentMethods(customer?.metadata?.payment_methods)
  } catch {
    return []
  }
}

export const upsertSavedPaymentMethod = async (payload: {
  type: SavedPaymentMethod["type"]
  label: string
  details?: SavedPaymentMethod["details"]
  setDefault?: boolean
}) => {
  const customer = await getCustomerMe()
  const metadata = customer?.metadata || {}
  const current = normalizeSavedPaymentMethods(metadata.payment_methods)
  const id = buildPaymentMethodId(payload.type, payload.details)
  const now = new Date().toISOString()
  const index = current.findIndex((item) => item.id === id)

  let next = [...current]
  if (index >= 0) {
    next[index] = {
      ...next[index],
      label: payload.label,
      details: payload.details,
      last_used_at: now,
    }
  } else {
    next.push({
      id,
      type: payload.type,
      label: payload.label,
      details: payload.details,
      created_at: now,
      last_used_at: now,
    })
  }

  const shouldSetDefault = payload.setDefault || !next.some((item) => item.is_default)
  if (shouldSetDefault) {
    next = next.map((item) => ({
      ...item,
      is_default: item.id === id,
    }))
  }

  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) })
  return next
}

export const setDefaultSavedPaymentMethod = async (id: string) => {
  const customer = await getCustomerMe()
  const metadata = customer?.metadata || {}
  const current = normalizeSavedPaymentMethods(metadata.payment_methods)
  const next = current.map((item) => ({ ...item, is_default: item.id === id }))
  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) })
  return next
}

export const removeSavedPaymentMethod = async (id: string) => {
  const customer = await getCustomerMe()
  const metadata = customer?.metadata || {}
  const current = normalizeSavedPaymentMethods(metadata.payment_methods)
  const next = current.filter((item) => item.id !== id)
  if (next.length > 0 && !next.some((item) => item.is_default)) {
    next[0].is_default = true
  }
  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) })
  return next
}

const buildPendingPaymentsMetadata = (
  metadata: Record<string, any>,
  pending: PendingPayment[]
) => {
  return { ...metadata, pending_payments: pending }
}

export const syncPendingPaymentToBackend = async (pending: PendingPayment) => {
  try {
    const customer = await getCustomerMe()
    const metadata = customer?.metadata || {}
    const current = normalizePendingPayments(metadata.pending_payments)
    const next = mergePendingPayments(current, [pending])
    await updateCustomerMe({ metadata: buildPendingPaymentsMetadata(metadata, next) })
    return true
  } catch {
    return false
  }
}

export const removePendingPaymentFromBackend = async (criteria: {
  cart_id?: string
  payment_collection_id?: string
}) => {
  try {
    const customer = await getCustomerMe()
    const metadata = customer?.metadata || {}
    const current = normalizePendingPayments(metadata.pending_payments)
    const next = current.filter((item) => {
      if (criteria.payment_collection_id) {
        return item.payment_collection_id !== criteria.payment_collection_id
      }
      if (criteria.cart_id) {
        return item.cart_id !== criteria.cart_id
      }
      return true
    })
    await updateCustomerMe({ metadata: buildPendingPaymentsMetadata(metadata, next) })
    return true
  } catch {
    return false
  }
}

export const notifyPendingPayment = async (payload: {
  payment_method: string
  payment_collection_id: string
  company_id?: string | null
  details?: PendingPaymentDetails
}) => {
  return apiFetch("/store/notifications/pending-payment", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const syncStripePayments = async () => {
  try {
    await apiFetch("/store/custom/payments/sync-stripe", { method: "POST" })
  } catch {
    // ignore sync failures
  }
}

export const testBoletoPayment = async (payload: {
  payment_collection_id: string
}) => {
  return apiFetch("/store/custom/payments/test-boleto", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const listRecurrences = async () => {
  return apiFetch<{ recurrences: Recurrence[] }>("/store/recurrences", {
    method: "GET",
  })
}

export const createRecurrence = async (payload: {
  name: string
  frequency: Recurrence["frequency"]
  day_of_week?: number
  day_of_month?: number
  payment_method: Recurrence["payment_method"]
  items: RecurrenceItem[]
  company_id?: string | null
  start_date?: string | null
}) => {
  return apiFetch<{ recurrence: Recurrence }>("/store/recurrences", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const updateRecurrence = async (
  id: string,
  payload: Partial<Omit<Recurrence, "id">>
) => {
  return apiFetch<{ recurrence: Recurrence }>(`/store/recurrences/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export const deleteRecurrence = async (id: string) => {
  return apiFetch(`/store/recurrences/${id}`, {
    method: "DELETE",
  })
}

const buildHeaders = (init?: FetchInit) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  }
  if (SALES_CHANNEL_ID) {
    headers["x-medusa-sales-channel-id"] = SALES_CHANNEL_ID
  }
  if (init?.auth !== false) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return { ...headers, ...(init?.headers as Record<string, string>) }
}

const parseError = async (res: Response) => {
  try {
    const json = await res.json()
    return json?.message || json?.error || JSON.stringify(json)
  } catch {
    try {
      const text = await res.text()
      return text || `Request failed (${res.status})`
    } catch {
      return `Request failed (${res.status})`
    }
  }
}

const handleAccessPending = () => {
  if (typeof window === "undefined") return
  if (window.location.pathname === "/access-pending") return
  window.location.assign("/access-pending")
}

const apiFetch = async <T>(path: string, init?: FetchInit): Promise<T> => {
  if (DEBUG) {
    console.debug("[medusa] request", { path, method: init?.method || "GET", body: init?.body })
  }
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
  })

  if (!res.ok) {
    if (DEBUG) {
      console.debug("[medusa] response error", { path, status: res.status, statusText: res.statusText })
    }
    if (res.status === 403) {
      handleAccessPending()
    }
    const message = await parseError(res)
    throw new Error(message)
  }

  if (DEBUG) {
    console.debug("[medusa] response ok", { path, status: res.status })
  }

  try {
    return (await res.json()) as T
  } catch {
    // Some endpoints (complete cart) may return empty body
    return undefined as T
  }
}

let cachedAuthPublicKey: CryptoKey | null = null

const pemToArrayBuffer = (pem: string) => {
  const normalized = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "")
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const importAuthPublicKey = async (pem: string) => {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null
  const keyData = pemToArrayBuffer(pem)
  return window.crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  )
}

const getAuthPublicKey = async () => {
  if (cachedAuthPublicKey) return cachedAuthPublicKey
  if (typeof window === "undefined" || !window.crypto?.subtle) return null
  try {
    const data = await apiFetch<{ public_key?: string | null }>("/auth/public-key", {
      auth: false,
    })
    if (!data?.public_key) return null
    cachedAuthPublicKey = await importAuthPublicKey(data.public_key)
    return cachedAuthPublicKey
  } catch {
    return null
  }
}

const encryptLoginPayload = async (payload: { email: string; password: string }) => {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null
  const publicKey = await getAuthPublicKey()
  if (!publicKey) return null
  const body = JSON.stringify({ ...payload, ts: Date.now() })
  const encoded = new TextEncoder().encode(body)
  const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded)
  const bytes = new Uint8Array(encrypted)
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const withStoreQuery = (path: string) => {
  const params = new URLSearchParams()
  if (REGION_ID) params.set("region_id", REGION_ID)
  const query = params.toString()
  if (!query) return path
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`
}

const withProductQuery = (path: string) => {
  const params = new URLSearchParams()
  params.set(
    "fields",
    "+variants.prices,+variants.calculated_price,+variants.metadata,+metadata"
  )
  if (REGION_ID) params.set("region_id", REGION_ID)
  const query = params.toString()
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`
}

export const clearSession = () => {
  setToken(null)
  setCartId(null)
}

export const login = async (email: string, password: string) => {
  const encrypted = await encryptLoginPayload({ email, password })
  const payload = encrypted ? { encrypted: true, payload: encrypted } : { email, password }
  const data = await apiFetch<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  })
  if (!data?.token) {
    throw new Error("Token não retornado pelo backend")
  }
  setToken(data.token)
  return data.token
}

export const startSocialAuth = async (provider: string, callbackUrl: string) => {
  const data = await apiFetch<{ location?: string; token?: string }>(
    `/auth/customer/${provider}`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ callback_url: callbackUrl }),
    }
  )
  if (data?.token) {
    setToken(data.token)
  }
  return data
}

export const completeSocialAuth = async (
  provider: string,
  params: { code: string; state?: string; linkExisting?: boolean }
) => {
  const search = new URLSearchParams({
    code: params.code,
    ...(params.state ? { state: params.state } : {}),
    ...(params.linkExisting ? { link_existing: "true" } : {}),
  })
  const data = await apiFetch<{ token: string }>(
    `/auth/customer/${provider}/callback?${search.toString()}`,
    { auth: false }
  )
  if (data?.token) {
    setToken(data.token)
  }
  return data?.token || null
}

export const registerStore = async (email: string, password: string) => {
  const register = await apiFetch<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  })
  if (!register?.token) {
    throw new Error("Token de registro não retornado")
  }
  setToken(register.token)
  return register.token
}

export const requestPasswordReset = async (email: string) => {
  await apiFetch("/store/customers/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  })
  return true
}

export const registerAndCreateCompany = async (params: {
  email: string
  password: string
  tradeName: string
  fantasyName: string
  cnpj: string
}) => {
  const register = await apiFetch<{ token: string }>("/auth/store/emailpass/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email: params.email, password: params.password }),
  })
  if (!register?.token) {
    throw new Error("Token de registro não retornado")
  }

  const headers = buildHeaders()
  headers.Authorization = `Bearer ${register.token}`

  await apiFetch("/store/companies", {
    method: "POST",
    headers,
    body: JSON.stringify({
      trade_name: params.tradeName,
      fantasy_name: params.fantasyName,
      cnpj: params.cnpj,
    }),
  })

  setToken(register.token)
  return register.token
}

export const listCompanies = async () => {
  return apiFetch<{ companies: any[] }>("/store/companies", {
    method: "GET",
  })
}

export const createCompany = async (payload: {
  trade_name: string
  fantasy_name: string
  cnpj: string
  metadata?: Record<string, any>
}) => {
  return apiFetch<{ company: any; customer?: any }>("/store/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const updateCompany = async (
  companyId: string,
  payload: {
    trade_name?: string
    fantasy_name?: string
    cnpj?: string
    metadata?: Record<string, any>
  }
) => {
  const doRequest = async (method: "PATCH" | "PUT") => {
    if (DEBUG) {
      console.debug("[medusa] request", {
        path: `/store/companies/${companyId}`,
        method,
        body: JSON.stringify(payload),
      })
    }
    const res = await fetch(`${MEDUSA_URL}/store/companies/${companyId}`, {
      method,
      headers: buildHeaders({}),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      if (DEBUG) {
        console.debug("[medusa] response error", {
          path: `/store/companies/${companyId}`,
          status: res.status,
          statusText: res.statusText,
        })
      }
      if (res.status === 403) {
        handleAccessPending()
      }
      const message = await parseError(res)
      const error: any = new Error(message)
      error.status = res.status
      throw error
    }
    if (DEBUG) {
      console.debug("[medusa] response ok", {
        path: `/store/companies/${companyId}`,
        status: res.status,
      })
    }
    return (await res.json()) as { company: any }
  }

  try {
    return await doRequest("PATCH")
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 405) {
      return await doRequest("PUT")
    }
    throw err
  }
}

export const earnCompanyPoints = async (companyId: string, orderId: string) => {
  return apiFetch<{ points_earned: number; points_balance: number; points_total: number }>(
    `/store/companies/${companyId}/points`,
    {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }
  )
}

export const transferCompany = async (
  companyId: string,
  payload: {
    email: string
    start_date?: string
    end_date?: string
    permanent?: boolean
  }
) => {
  return apiFetch<{ company: any; transfer: any }>(`/store/companies/${companyId}/transfer`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const getCustomerMe = async () => {
  return apiFetch<{ customer: MedusaCustomer }>("/store/customers/me", {
    method: "GET",
  })
}

export const updateCustomerMe = async (payload: {
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, any>
}) => {
  return apiFetch<{ customer: MedusaCustomer }>("/store/customers/me", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const updatePassword = async (payload: { old_password: string; password: string }) => {
  return apiFetch("/store/customers/password", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  })
}

export const registerPushToken = async (payload: {
  provider: "webpush"
  platform: "web"
  subscription: Record<string, any>
  device_id?: string
  company_id?: string | null
}) => {
  return apiFetch("/store/push-tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const listProducts = async () => {
  return apiFetch<{ products: MedusaProduct[] }>(withProductQuery("/store/products"))
}

export const retrieveProduct = async (id: string) => {
  return apiFetch<{ product: MedusaProduct }>(withProductQuery(`/store/products/${id}`))
}

export const listNews = async (params?: { limit?: number; offset?: number }) => {
  const query = new URLSearchParams()
  if (params?.limit) query.set("limit", params.limit.toString())
  if (params?.offset) query.set("offset", params.offset.toString())
  const suffix = query.toString()
  return apiFetch<{ news: MedusaNews[] }>(`/store/news${suffix ? `?${suffix}` : ""}`)
}

export const getNews = async (id: string) => {
  return apiFetch<{ news: MedusaNews }>(`/store/news/${id}`)
}

export const listMarketingBanners = async (params?: { limit?: number; offset?: number }) => {
  const query = new URLSearchParams()
  if (params?.limit) query.set("limit", params.limit.toString())
  if (params?.offset) query.set("offset", params.offset.toString())
  const suffix = query.toString()
  return apiFetch<{ banners: MedusaMarketingBanner[] }>(
    `/store/marketing-banners${suffix ? `?${suffix}` : ""}`
  )
}

export const createCart = async () => {
  const body: Record<string, any> = {}
  if (SALES_CHANNEL_ID) body.sales_channel_id = SALES_CHANNEL_ID
  if (REGION_ID) body.region_id = REGION_ID

  const data = await apiFetch<{ cart: MedusaCart }>("/store/carts", {
    method: "POST",
    auth: false,
    body: JSON.stringify(body),
  })
  if (data?.cart?.id) {
    setCartId(data.cart.id)
  }
  return data.cart
}

export const retrieveCart = async (id: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(`/store/carts/${id}`, {
    auth: false,
  })
  return data.cart
}

export const ensureCart = async () => {
  const saved = getCartId()
  if (saved) {
    try {
      const cart = await retrieveCart(saved)
      return cart
    } catch {
      setCartId(null)
    }
  }
  return createCart()
}

export const addLineItem = async (cartId: string, variantId: string, quantity: number) => {
  const data = await apiFetch<{ cart: MedusaCart }>(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
  return data.cart
}

export const updateLineItem = async (cartId: string, lineId: string, quantity: number) => {
  const data = await apiFetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-items/${lineId}`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ quantity }),
    }
  )
  return data.cart
}

export const deleteLineItem = async (cartId: string, lineId: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-items/${lineId}`,
    {
      method: "DELETE",
      auth: false,
    }
  )
  if (!data?.cart?.items) {
    return retrieveCart(cartId)
  }
  return data.cart
}

const retrieveOrder = async (orderId: string) => {
  const params = new URLSearchParams()
  params.set(
    "fields",
    "+items,+items.id,+items.quantity,+items.title,+items.product_id,+items.variant_id,+items.thumbnail,+items.unit_price"
  )
  return apiFetch<{ order: MedusaOrder }>(`/store/orders/${orderId}?${params.toString()}`, {
    method: "GET",
  })
}

export const listOrders = async () => {
  const params = new URLSearchParams()
  params.set(
    "fields",
    "+items,+items.id,+items.quantity,+items.title,+items.product_id,+items.variant_id,+items.thumbnail,+items.unit_price"
  )
  const suffix = params.toString()
  const data = await apiFetch<{ orders: MedusaOrder[] }>(`/store/orders?${suffix}`, {
    method: "GET",
  })
  const orders = data?.orders || []
  if (!orders.length) {
    return { orders }
  }
  const hydrated = await Promise.all(
    orders.map(async (order) => {
      if (!order?.id || (order.items && order.items.length > 0)) {
        return order
      }
      try {
        const detail = await retrieveOrder(order.id)
        return detail?.order || order
      } catch {
        return order
      }
    })
  )
  return { orders: hydrated }
}

export const setCartShippingAddress = async (
  cartId: string,
  address: Record<string, any>
) => {
  const data = await apiFetch<{ cart: MedusaCart }>(`/store/carts/${cartId}`, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ shipping_address: address }),
  })
  return data.cart
}

export const addDefaultShippingMethod = async (cartId: string) => {
  const options = await listShippingOptions(cartId)
  const option = options?.[0]
  if (!option) {
    throw new Error("Nenhuma opção de frete disponível para este carrinho.")
  }

  return addShippingMethod(cartId, option.id)
}

export const listShippingOptions = async (cartId: string) => {
  const options = await apiFetch<{ shipping_options: { id: string; name?: string }[] }>(
    `/store/shipping-options?cart_id=${cartId}`,
    { auth: false }
  )
  return options.shipping_options || []
}

export const addShippingMethod = async (cartId: string, optionId: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ option_id: optionId }),
    }
  )
  return data.cart
}

const ensurePaymentCollection = async (cartId: string) => {
  const data = await apiFetch<{ payment_collection: MedusaPaymentCollection }>(
    "/store/payment-collections",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ cart_id: cartId }),
    }
  )
  return data.payment_collection
}

export const createPaymentSessions = async (cartId: string) => {
  return ensurePaymentCollection(cartId)
}

export const setPaymentSession = async (
  cartId: string,
  providerId: string,
  data?: Record<string, any>
) => {
  const paymentCollection = await ensurePaymentCollection(cartId)
  const payload: Record<string, any> = { provider_id: providerId }
  if (data && Object.keys(data).length) {
    payload.data = data
  }
  const response = await apiFetch<{ payment_collection: MedusaPaymentCollection }>(
    `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    }
  )
  return response.payment_collection
}

export const completeCart = async (cartId: string) => {
  const data = await apiFetch<{ type?: string; data?: { id: string } }>(
    `/store/carts/${cartId}/complete`,
    {
      method: "POST",
      auth: false,
    }
  )
  return data?.data?.id || null
}

export const mapCartToItems = (cart?: MedusaCart) => {
  if (!cart?.items) return []
  return cart.items.map((item) => ({
    id: item.id,
    productId: item.product_id || "",
    variantId: item.variant_id || "",
    name: item.title,
    price: item.unit_price,
    image: resolveMediaUrl(item.thumbnail) || "",
    category: "",
    quantity: item.quantity,
  }))
}

export const formatPrice = (prices?: MedusaPrice[], currency = "brl") => {
  if (!prices?.length) return 0
  const price = prices.find((p) => p.currency_code === currency) || prices[0]
  return price.amount || 0
}

export const formatMoney = (amount?: number, currency = CURRENCY_CODE || "brl") => {
  const safeAmount = typeof amount === "number" ? amount : 0
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(safeAmount / 100)
}

export const getVariantPricing = (
  variant?: MedusaVariant,
  currency = "brl"
): {
  basePrice: number | null
  salePrice: number | null
  finalPrice: number
  discountPercent: number | null
  onSale: boolean
} => {
  const calculated = variant?.calculated_price
  if (calculated !== undefined && calculated !== null) {
    const calcObj = typeof calculated === "object" ? calculated : null
    const calculatedAmount =
      typeof calculated === "number"
        ? calculated
        : calcObj?.calculated_amount ?? calcObj?.calculated_price ?? calcObj?.amount ?? null
    const originalAmount =
      typeof calculated === "object"
        ? calcObj?.original_amount ?? calcObj?.original_price ?? null
        : null

    if (calculatedAmount !== null) {
      const onSale = originalAmount !== null && calculatedAmount < originalAmount
      const discountPercent =
        onSale && originalAmount
          ? Math.round(((originalAmount - calculatedAmount) / originalAmount) * 100)
          : null
      return {
        basePrice: originalAmount !== null ? originalAmount : null,
        salePrice: onSale ? calculatedAmount : null,
        finalPrice: calculatedAmount,
        discountPercent,
        onSale,
      }
    }
  }

  const prices = variant?.prices || []
  if (!prices.length) {
    return { basePrice: null, salePrice: null, finalPrice: 0, discountPercent: null, onSale: false }
  }

  const currencyPrices = prices.filter((price) => price.currency_code === currency)
  const pool = currencyPrices.length ? currencyPrices : prices

  const base = pool.find((price) => !price.price_list_id && !price.price_list_type)
  const sale = pool.find((price) => price.price_list_type === "sale")

  const baseAmount = base?.amount ?? null
  const saleAmount = sale?.amount ?? null

  let finalAmount = baseAmount ?? saleAmount ?? pool[0]?.amount ?? 0
  if (saleAmount !== null && (baseAmount === null || saleAmount < baseAmount)) {
    finalAmount = saleAmount
  }

  const onSale = baseAmount !== null && saleAmount !== null && saleAmount < baseAmount
  const discountPercent =
    onSale && baseAmount
      ? Math.round(((baseAmount - saleAmount!) / baseAmount) * 100)
      : null

  return {
    basePrice: baseAmount !== null ? baseAmount : null,
    salePrice: saleAmount !== null ? saleAmount : null,
    finalPrice: finalAmount,
    discountPercent,
    onSale,
  }
}

export const getVariant = (product?: MedusaProduct) => {
  return product?.variants?.[0]
}

export const getProductImage = (product?: MedusaProduct) => {
  const normalizeImageUrl = (value: unknown) => {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    if (!trimmed || trimmed === "0" || trimmed === "null" || trimmed === "undefined") {
      return null
    }
    return resolveMediaUrl(trimmed)
  }

  const thumbnail = normalizeImageUrl(product?.thumbnail)
  if (thumbnail) return thumbnail

  const images = product?.images
  if (Array.isArray(images)) {
    for (const image of images) {
      const url = normalizeImageUrl((image as any)?.url || (image as any)?.thumbnail || image)
      if (url) return url
    }
  }

  return "/placeholder.svg"
}

export const resolveMediaUrl = (value?: string | null) => {
  if (!value || typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === "0" || trimmed === "null" || trimmed === "undefined") {
    return null
  }
  if (/^https?:\/\//i.test(trimmed)) {
    if (MEDUSA_ORIGIN && MEDUSA_ORIGIN.startsWith("http://")) {
      try {
        const url = new URL(trimmed)
        if (url.origin === MEDUSA_ORIGIN.replace("http://", "https://")) {
          return `${MEDUSA_ORIGIN}${url.pathname}${url.search}${url.hash}`
        }
      } catch {
        // fall through
      }
    }
    try {
      const url = new URL(trimmed)
      const isSigned = /(^|&)(X-Amz-|X-Amz-Algorithm|X-Amz-Credential|X-Amz-Signature)=/i.test(
        url.search
      )
      if (!isSigned && url.pathname.includes("%2F")) {
        const decodedPath = decodeURIComponent(url.pathname)
        return `${url.origin}${decodedPath}${url.search}${url.hash}`
      }
    } catch {
      // fall through
    }
    return trimmed
  }
  if (/^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`
  }
  if (trimmed.startsWith("/")) {
    return `${MEDIA_BASE_URL}${trimmed}`
  }
  return `${MEDIA_BASE_URL}/${trimmed}`
}

export const getProductCategory = (product?: MedusaProduct) => {
  if (product?.type?.value) return product.type.value
  if (product?.collection_id) return product.collection_id
  return "Geral"
}

export const getTokenValue = () => getToken()
export const getCartIdValue = () => getCartId()
