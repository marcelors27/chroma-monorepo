// Default to local Medusa dev port; override with VITE_MEDUSA_URL. If you prefer relative "/api",
// set a dev proxy in vite.config.ts (already added below) or adjust this env.
const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY
const SALES_CHANNEL_ID = import.meta.env.VITE_MEDUSA_SALES_CHANNEL_ID
const REGION_ID = import.meta.env.VITE_MEDUSA_REGION_ID
const CURRENCY_CODE = import.meta.env.VITE_MEDUSA_CURRENCY_CODE
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
  pix_code?: string
  pix_qr?: string
}

export type ActiveCondo = {
  id: string
  name: string
  cnpj?: string
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

const withStoreQuery = (path: string) => {
  const params = new URLSearchParams()
  if (REGION_ID) params.set("region_id", REGION_ID)
  const query = params.toString()
  if (!query) return path
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`
}

const withProductQuery = (path: string) => {
  const params = new URLSearchParams()
  params.set("fields", "+variants.prices,+variants.calculated_price")
  if (REGION_ID) params.set("region_id", REGION_ID)
  const query = params.toString()
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`
}

export const clearSession = () => {
  setToken(null)
  setCartId(null)
}

export const login = async (email: string, password: string) => {
  const data = await apiFetch<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
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
  params: { code: string; state?: string }
) => {
  const search = new URLSearchParams({
    code: params.code,
    ...(params.state ? { state: params.state } : {}),
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
  return apiFetch<{ company: any }>(`/store/companies/${companyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
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

export const listProducts = async () => {
  return apiFetch<{ products: MedusaProduct[] }>(withProductQuery("/store/products"))
}

export const retrieveProduct = async (id: string) => {
  return apiFetch<{ product: MedusaProduct }>(withProductQuery(`/store/products/${id}`))
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

export const listOrders = async () => {
  return apiFetch<{ orders: MedusaOrder[] }>("/store/orders", { method: "GET" })
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
  const options = await apiFetch<{ shipping_options: { id: string }[] }>(
    `/store/shipping-options?cart_id=${cartId}`,
    { auth: false }
  )
  const option = options.shipping_options?.[0]
  if (!option) {
    throw new Error("Nenhuma opção de frete disponível para este carrinho.")
  }

  const data = await apiFetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/shipping-methods`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ option_id: option.id }),
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
    image: item.thumbnail || "",
    category: "",
    quantity: item.quantity,
  }))
}

export const formatPrice = (prices?: MedusaPrice[], currency = "brl") => {
  if (!prices?.length) return 0
  const price = prices.find((p) => p.currency_code === currency) || prices[0]
  return price.amount || 0
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
    return trimmed
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

export const getProductCategory = (product?: MedusaProduct) => {
  if (product?.type?.value) return product.type.value
  if (product?.collection_id) return product.collection_id
  return "Geral"
}

export const getTokenValue = () => getToken()
export const getCartIdValue = () => getCartId()
