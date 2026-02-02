import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import { TextEncoder } from "util";

const MEDUSA_URL = process.env.EXPO_PUBLIC_MEDUSA_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const SALES_CHANNEL_ID = process.env.EXPO_PUBLIC_MEDUSA_SALES_CHANNEL_ID;
const REGION_ID = process.env.EXPO_PUBLIC_MEDUSA_REGION_ID;
const CURRENCY_CODE = process.env.EXPO_PUBLIC_MEDUSA_CURRENCY_CODE || "brl";
const DEBUG = process.env.EXPO_PUBLIC_DEBUG_FRONT === "true";
const MEDIA_BASE_URL = process.env.EXPO_PUBLIC_MEDIA_URL || MEDUSA_URL;
const MEDUSA_ORIGIN = (() => {
  if (!MEDUSA_URL || !/^https?:\/\//i.test(MEDUSA_URL)) return null;
  try {
    return new URL(MEDUSA_URL).origin;
  } catch {
    return null;
  }
})();

const AUTH_TOKEN_KEY = "chroma_mobile_store_token";
const CART_ID_KEY = "chroma_mobile_store_cart_id";

let accessPendingHandler: (() => void) | null = null;

export const setAccessPendingHandler = (handler: (() => void) | null) => {
  accessPendingHandler = handler;
};

type FetchInit = RequestInit & { auth?: boolean };

export type MedusaPrice = {
  amount: number;
  currency_code: string;
  price_list_id?: string;
  price_list_type?: string;
};

export type MedusaCalculatedPrice = {
  calculated_amount?: number;
  original_amount?: number;
  calculated_price?: number;
  original_price?: number;
  amount?: number;
  currency_code?: string;
  price_list_type?: string;
};


export type MedusaVariant = {
  id: string;
  title: string;
  prices: MedusaPrice[];
  inventory_quantity?: number;
  metadata?: Record<string, unknown>;
  options?: {
    id?: string;
    option_id?: string;
    value?: string;
    option?: { id?: string; title?: string };
  }[];
  calculated_price?: MedusaCalculatedPrice | number;
};

export type MedusaProduct = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  handle?: string;
  collection_id?: string;
  type?: { id: string; value: string };
  tags?: { id: string; value: string }[];
  variants?: MedusaVariant[];
  images?: { id?: string; url?: string; thumbnail?: string }[];
  metadata?: Record<string, unknown>;
  options?: { id?: string; title?: string }[];
};

export type MedusaCart = {
  id: string;
  items: MedusaLineItem[];
  shipping_address?: Record<string, any>;
  region_id?: string;
  shipping_methods?: any[];
  payment_session?: any;
  payment_sessions?: any[];
  total?: number;
  subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  created_at?: string;
};

export type MedusaLineItem = {
  id: string;
  title: string;
  quantity: number;
  variant_id?: string;
  thumbnail?: string;
  unit_price: number;
  product_id?: string;
  metadata?: Record<string, any>;
};

export type MedusaPaymentSession = {
  id?: string;
  provider_id?: string;
  data?: Record<string, any>;
};

export type MedusaPaymentCollection = {
  id: string;
  payment_sessions?: MedusaPaymentSession[];
};

export type MedusaOrder = {
  id: string;
  display_id?: string;
  created_at?: string;
  status?: string;
  fulfillment_status?: string;
  payment_status?: string;
  total?: number;
  items?: MedusaLineItem[];
  shipping_address?: Record<string, any>;
};

export type MedusaCustomer = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
  created_at?: string;
};

export type SavedPaymentMethod = {
  id: string;
  type: "credit" | "pix" | "boleto";
  label: string;
  details?: {
    email?: string;
  };
  is_default?: boolean;
  created_at?: string;
  last_used_at?: string;
};

export type MedusaNews = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category?: string | null;
  image_url?: string | null;
  author?: string | null;
  source?: string | null;
  read_time?: number | null;
  published_at?: string | null;
  is_published?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MedusaMarketingBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  image_mobile_url?: string | null;
  animation_url?: string | null;
  animation_mobile_url?: string | null;
  link_type?: string | null;
  link_value?: string | null;
  sort_order?: number | null;
  active_from?: string | null;
  active_until?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RecurrenceItem = {
  variant_id: string;
  quantity: number;
  title?: string;
  product_id?: string;
  price?: number;
  category?: string;
};

export type Recurrence = {
  id: string;
  name: string;
  frequency: "weekly" | "biweekly" | "monthly";
  day_of_week?: number | null;
  day_of_month?: number | null;
  payment_method: "credit" | "pix" | "boleto";
  items: RecurrenceItem[];
  company_id?: string | null;
  start_date?: string | null;
  status: "active" | "paused";
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

const getToken = async () => {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

const setToken = async (token: string | null) => {
  if (!token) {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
};

const getCartId = async () => {
  return AsyncStorage.getItem(CART_ID_KEY);
};

const setCartId = async (cartId: string | null) => {
  if (!cartId) {
    await AsyncStorage.removeItem(CART_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(CART_ID_KEY, cartId);
};

const buildHeaders = async (init?: FetchInit) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
  }
  if (SALES_CHANNEL_ID) {
    headers["x-medusa-sales-channel-id"] = SALES_CHANNEL_ID;
  }
  if (init?.auth !== false) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return { ...headers, ...(init?.headers as Record<string, string>) };
};

const parseError = async (res: Response) => {
  try {
    const json = await res.json();
    return json?.message || json?.error || JSON.stringify(json);
  } catch {
    try {
      const text = await res.text();
      return text || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  }
};

const handleAccessPending = () => {
  if (accessPendingHandler) {
    accessPendingHandler();
  }
};

const apiFetch = async <T>(path: string, init?: FetchInit): Promise<T> => {
  if (DEBUG) {
    console.debug("[medusa] request", { path, method: init?.method || "GET", body: init?.body });
  }
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: await buildHeaders(init),
  });

  if (!res.ok) {
    if (DEBUG) {
      console.debug("[medusa] response error", { path, status: res.status, statusText: res.statusText });
    }
    if (res.status === 403) {
      handleAccessPending();
    }
    const message = await parseError(res);
    throw new Error(message);
  }

  if (DEBUG) {
    console.debug("[medusa] response ok", { path, status: res.status });
  }

  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
};

let cachedAuthPublicKey: any = null;

const pemToArrayBuffer = (pem: string) => {
  const normalized = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const buffer = Buffer.from(normalized, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const importAuthPublicKey = async (pem: string) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const keyData = pemToArrayBuffer(pem);
  return subtle.importKey("spki", keyData, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
};

const getAuthPublicKey = async () => {
  if (cachedAuthPublicKey) return cachedAuthPublicKey;
  if (!globalThis.crypto?.subtle) return null;
  try {
    const data = await apiFetch<{ public_key?: string | null }>("/auth/public-key", { auth: false });
    if (!data?.public_key) return null;
    cachedAuthPublicKey = await importAuthPublicKey(data.public_key);
    return cachedAuthPublicKey;
  } catch {
    return null;
  }
};

const encryptLoginPayload = async (payload: { email: string; password: string }) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const publicKey = await getAuthPublicKey();
  if (!publicKey) return null;
  const body = JSON.stringify({ ...payload, ts: Date.now() });
  const encoded = new TextEncoder().encode(body);
  const encrypted = await subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded);
  return Buffer.from(encrypted).toString("base64");
};

const withStoreQuery = (path: string) => {
  return path;
};

const withProductQuery = (path: string) => {
  const params = new URLSearchParams();
  params.set("fields", "+variants.prices,+variants.calculated_price,+variants.metadata,+metadata");
  if (REGION_ID) params.set("region_id", REGION_ID);
  const query = params.toString();
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
};

export const clearSession = async () => {
  await setToken(null);
  await setCartId(null);
};

export const login = async (email: string, password: string) => {
  const encrypted = await encryptLoginPayload({ email, password });
  const payload = encrypted ? { encrypted: true, payload: encrypted } : { email, password };
  const data = await apiFetch<{ token: string }>("/auth/customer/emailpass", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (!data?.token) {
    throw new Error("Token nao retornado pelo backend");
  }
  await setToken(data.token);
  return data.token;
};

export const startSocialAuth = async (provider: string, callbackUrl: string) => {
  const data = await apiFetch<{ location?: string; token?: string }>(
    `/auth/customer/${provider}`,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ callback_url: callbackUrl }),
    }
  );
  if (data?.token) {
    await setToken(data.token);
  }
  return data;
};

export const completeSocialAuth = async (
  provider: string,
  params: { code: string; state?: string }
) => {
  const search = new URLSearchParams({
    code: params.code,
    ...(params.state ? { state: params.state } : {}),
  });
  const data = await apiFetch<{ token: string }>(
    `/auth/customer/${provider}/callback?${search.toString()}`,
    { auth: false }
  );
  if (data?.token) {
    await setToken(data.token);
  }
  return data?.token || null;
};

export const completeSocialAuthNative = async (
  provider: string,
  params: {
    identityToken?: string;
    authorizationCode?: string;
    linkExisting?: boolean;
    accessToken?: string;
  }
) => {
  const payload = {
    ...(params.identityToken ? { identity_token: params.identityToken } : {}),
    ...(params.authorizationCode ? { authorization_code: params.authorizationCode } : {}),
    ...(params.linkExisting ? { link_existing: true } : {}),
    ...(params.accessToken ? { access_token: params.accessToken } : {}),
  };
  const data = await apiFetch<{ token: string }>(`/auth/customer/${provider}/callback`, {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  if (data?.token) {
    await setToken(data.token);
  }
  return data?.token || null;
};

export const registerStore = async (email: string, password: string) => {
  const register = await apiFetch<{ token: string }>("/auth/customer/emailpass/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  if (!register?.token) {
    throw new Error("Token nao retornado pelo backend");
  }
  await setToken(register.token);
  return register.token;
};

export const requestPasswordReset = async (email: string) => {
  await apiFetch("/store/customers/reset-password", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
  return true;
};

export const registerAndCreateCompany = async (params: {
  email: string;
  password: string;
  company: {
    name: string;
    cnpj: string;
    trade_name?: string;
    fantasy_name?: string;
    metadata?: Record<string, any>;
  };
}) => {
  await registerStore(params.email, params.password);
  return createCompany(params.company);
};

export const listCompanies = async () => {
  return apiFetch<{ companies: any[] }>("/store/companies", { method: "GET" });
};

export const createCompany = async (payload: {
  name: string;
  cnpj: string;
  trade_name?: string;
  fantasy_name?: string;
  metadata?: Record<string, any>;
}) => {
  return apiFetch<{ company: any }>("/store/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateCompany = async (
  companyId: string,
  payload: {
    name?: string;
    trade_name?: string;
    fantasy_name?: string;
    cnpj?: string;
    metadata?: Record<string, any>;
  }
) => {
  return apiFetch<{ company: any }>(`/store/companies/${companyId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getCustomerMe = async () => {
  return apiFetch<{ customer: MedusaCustomer }>("/store/customers/me", { method: "GET" });
};

export const updateCustomerMe = async (payload: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}) => {
  return apiFetch<{ customer: MedusaCustomer }>("/store/customers/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const normalizeSavedPaymentMethods = (value: unknown): SavedPaymentMethod[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && item.type) as SavedPaymentMethod[];
};

const buildPaymentMethodId = (
  type: SavedPaymentMethod["type"],
  details?: SavedPaymentMethod["details"]
) => {
  const suffix = (details?.email || "default").toLowerCase();
  return `${type}:${suffix}`;
};

const buildSavedPaymentMethodsMetadata = (
  metadata: Record<string, any>,
  paymentMethods: SavedPaymentMethod[]
) => {
  return { ...metadata, payment_methods: paymentMethods };
};

export const fetchSavedPaymentMethodsFromBackend = async (): Promise<SavedPaymentMethod[]> => {
  try {
    const customer = await getCustomerMe();
    return normalizeSavedPaymentMethods(customer?.customer?.metadata?.payment_methods);
  } catch {
    return [];
  }
};

export const upsertSavedPaymentMethod = async (payload: {
  type: SavedPaymentMethod["type"];
  label: string;
  details?: SavedPaymentMethod["details"];
  setDefault?: boolean;
}) => {
  const customer = await getCustomerMe();
  const metadata = customer?.customer?.metadata || {};
  const current = normalizeSavedPaymentMethods(metadata.payment_methods);
  const id = buildPaymentMethodId(payload.type, payload.details);
  const now = new Date().toISOString();
  const index = current.findIndex((item) => item.id === id);

  let next = [...current];
  if (index >= 0) {
    next[index] = {
      ...next[index],
      label: payload.label,
      details: payload.details,
      last_used_at: now,
    };
  } else {
    next.push({
      id,
      type: payload.type,
      label: payload.label,
      details: payload.details,
      created_at: now,
      last_used_at: now,
    });
  }

  const shouldSetDefault = payload.setDefault || !next.some((item) => item.is_default);
  if (shouldSetDefault) {
    next = next.map((item) => ({
      ...item,
      is_default: item.id === id,
    }));
  }

  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) });
  return next;
};

export const setDefaultSavedPaymentMethod = async (id: string) => {
  const customer = await getCustomerMe();
  const metadata = customer?.customer?.metadata || {};
  const current = normalizeSavedPaymentMethods(metadata.payment_methods);
  const next = current.map((item) => ({ ...item, is_default: item.id === id }));
  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) });
  return next;
};

export const removeSavedPaymentMethod = async (id: string) => {
  const customer = await getCustomerMe();
  const metadata = customer?.customer?.metadata || {};
  const current = normalizeSavedPaymentMethods(metadata.payment_methods);
  const next = current.filter((item) => item.id !== id);
  if (next.length > 0 && !next.some((item) => item.is_default)) {
    next[0].is_default = true;
  }
  await updateCustomerMe({ metadata: buildSavedPaymentMethodsMetadata(metadata, next) });
  return next;
};

export const updatePassword = async (payload: { old_password: string; password: string }) => {
  return apiFetch("/store/customers/me/password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const registerPushToken = async (payload: {
  provider: "fcm" | "apns";
  platform: "ios" | "android";
  token: string;
  device_id?: string;
  company_id?: string | null;
}) => {
  return apiFetch("/store/push-tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const listProducts = async () => {
  const data = await apiFetch<{ products: MedusaProduct[] }>(withProductQuery("/store/products"), {
    method: "GET",
  });
  if (DEBUG) {
    const sample = data?.products?.[0];
    console.debug("[medusa] products sample images", {
      id: sample?.id,
      thumbnail: sample?.thumbnail,
      images: sample?.images,
    });
  }
  return data;
};

export const retrieveProduct = async (id: string) => {
  const data = await apiFetch<{ product: MedusaProduct }>(withProductQuery(`/store/products/${id}`), {
    method: "GET",
  });
  if (DEBUG) {
    const sample = data?.product;
    console.debug("[medusa] product images", {
      id: sample?.id,
      thumbnail: sample?.thumbnail,
      images: sample?.images,
    });
  }
  return data;
};

export const listNews = async (params?: { limit?: number; offset?: number }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  const suffix = query.toString();
  return apiFetch<{ news: MedusaNews[] }>(`/store/news${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
  });
};

export const getNews = async (id: string) => {
  return apiFetch<{ news: MedusaNews }>(`/store/news/${id}`, {
    method: "GET",
  });
};

export const listMarketingBanners = async (params?: { limit?: number; offset?: number }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  const suffix = query.toString();
  return apiFetch<{ banners: MedusaMarketingBanner[] }>(
    `/store/marketing-banners${suffix ? `?${suffix}` : ""}`,
    { method: "GET" }
  );
};

export const earnCompanyPoints = async (companyId: string, orderId: string) => {
  return apiFetch<{ points_earned: number; points_balance: number; points_total: number }>(
    `/store/companies/${companyId}/points`,
    {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }
  );
};

export const createCart = async () => {
  const cart = await apiFetch<{ cart: MedusaCart }>(withStoreQuery("/store/carts"), {
    method: "POST",
    body: JSON.stringify({}),
  });
  const cartId = cart?.cart?.id;
  if (cartId) {
    await setCartId(cartId);
  }
  return cart?.cart;
};

export const retrieveCart = async (id: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${id}`), {
    method: "GET",
  });
  return data?.cart;
};

export const ensureCart = async () => {
  const cartId = await getCartId();
  if (cartId) {
    try {
      const cart = await retrieveCart(cartId);
      if (cart?.id) return cart;
    } catch {
      await setCartId(null);
    }
  }
  return createCart();
};

export const addLineItem = async (
  cartId: string,
  variantId: string,
  quantity: number,
  metadata?: Record<string, any>
) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}/line-items`), {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity, metadata }),
  });
  return data?.cart;
};

export const updateLineItem = async (cartId: string, lineId: string, quantity: number) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}/line-items/${lineId}`), {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
  return data?.cart;
};

export const deleteLineItem = async (cartId: string, lineId: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}/line-items/${lineId}`), {
    method: "DELETE",
  });
  return data?.cart;
};

export const listOrders = async () => {
  return apiFetch<{ orders: MedusaOrder[] }>("/store/orders", { method: "GET" });
};

export const setCartShippingAddress = async (
  cartId: string,
  address: Record<string, any>
) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}`), {
    method: "POST",
    body: JSON.stringify({ shipping_address: address }),
  });
  return data?.cart;
};

export const addDefaultShippingMethod = async (cartId: string) => {
  const options = await listShippingOptions(cartId);
  const defaultOption = options?.[0];
  if (!defaultOption?.id) {
    throw new Error("Nenhum metodo de entrega disponivel.");
  }

  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}/shipping-methods`), {
    method: "POST",
    body: JSON.stringify({ option_id: defaultOption.id }),
  });
  return data?.cart;
};

export const listShippingOptions = async (cartId: string) => {
  const options = await apiFetch<{ shipping_options: any[] }>(
    withStoreQuery(`/store/shipping-options?cart_id=${cartId}`),
    { method: "GET" }
  );
  return options?.shipping_options || [];
};

export const addShippingMethod = async (cartId: string, optionId: string) => {
  const data = await apiFetch<{ cart: MedusaCart }>(withStoreQuery(`/store/carts/${cartId}/shipping-methods`), {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  });
  return data?.cart;
};

export const createPaymentSessions = async (cartId: string) => {
  const data = await apiFetch<{ payment_collection: MedusaPaymentCollection }>(
    withStoreQuery("/store/payment-collections"),
    {
      method: "POST",
      body: JSON.stringify({ cart_id: cartId }),
    }
  );
  return data?.payment_collection;
};

export const setPaymentSession = async (
  cartId: string,
  providerId: string,
  data?: Record<string, any>
) => {
  const paymentCollection = await createPaymentSessions(cartId);
  if (!paymentCollection?.id) {
    throw new Error("Colecao de pagamento nao encontrada.");
  }
  const payload: Record<string, any> = { provider_id: providerId };
  if (data && Object.keys(data).length) {
    payload.data = data;
  }
  const res = await apiFetch<{ payment_collection: MedusaPaymentCollection }>(
    withStoreQuery(`/store/payment-collections/${paymentCollection.id}/payment-sessions`),
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res?.payment_collection;
};

export const completeCart = async (cartId: string) => {
  const data = await apiFetch<{ order: MedusaOrder }>(withStoreQuery(`/store/carts/${cartId}/complete`), {
    method: "POST",
  });
  return data?.order?.display_id || data?.order?.id || null;
};

export const mapCartToItems = (cart?: MedusaCart) => {
  if (!cart?.items) return [];
  return cart.items.map((item) => ({
    id: item.id,
    productId: item.product_id || "",
    variantId: item.variant_id || "",
    name: (item.metadata?.display_name as string) || item.title,
    price: item.unit_price,
    category: item.metadata?.category || "Geral",
    image: resolveMediaUrl(item.thumbnail) || "",
    quantity: item.quantity,
  }));
};

export const formatPrice = (prices?: MedusaPrice[], currency = CURRENCY_CODE) => {
  if (!prices?.length) return 0;
  const match = prices.find((price) => price.currency_code === currency);
  return (match?.amount || 0).toFixed(2);
};

export const formatMoney = (amount?: number, currency = CURRENCY_CODE) => {
  const safeAmount = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(safeAmount / 100);
};

export const getVariantPricing = (
  variant?: MedusaVariant
): { basePrice: number | null; salePrice: number | null; finalPrice: number; discountPercent: number; onSale: boolean } => {
  if (!variant) return { basePrice: null, salePrice: null, finalPrice: 0, discountPercent: 0, onSale: false };

  const calculated = variant.calculated_price;
  const resolved = typeof calculated === "number" ? { calculated_amount: calculated } : calculated || {};

  const baseAmount = resolved.original_amount ?? resolved.original_price ?? null;
  const saleAmount = resolved.calculated_amount ?? resolved.calculated_price ?? null;

  const basePrice = baseAmount !== null ? baseAmount : null;
  const salePrice = saleAmount !== null ? saleAmount : null;
  const finalPrice = salePrice ?? basePrice ?? 0;

  const onSale = basePrice !== null && salePrice !== null && salePrice < basePrice;
  const discountPercent = onSale && basePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

  return {
    basePrice,
    salePrice,
    finalPrice,
    discountPercent,
    onSale,
  };
};

export const getVariant = (product?: MedusaProduct) => {
  return product?.variants?.[0];
};

export const resolveMediaUrl = (value?: string | null) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    if (MEDUSA_ORIGIN && MEDUSA_ORIGIN.startsWith("http://")) {
      try {
        const url = new URL(trimmed);
        if (url.origin === MEDUSA_ORIGIN.replace("http://", "https://")) {
          return `${MEDUSA_ORIGIN}${url.pathname}${url.search}${url.hash}`;
        }
      } catch {
        // fall through
      }
    }
    try {
      const url = new URL(trimmed);
      const isSigned = /(^|&)(X-Amz-|X-Amz-Algorithm|X-Amz-Credential|X-Amz-Signature)=/i.test(
        url.search
      );
      if (!isSigned && url.pathname.includes("%2F")) {
        const decodedPath = decodeURIComponent(url.pathname);
        return `${url.origin}${decodedPath}${url.search}${url.hash}`;
      }
    } catch {
      // fall through
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(trimmed)) {
      return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i, MEDUSA_URL);
    }
    if (trimmed.startsWith("http://images.unsplash.com")) {
      return trimmed.replace("http://", "https://");
    }
    return trimmed;
  }
  const normalizedPath = trimmed.includes("%2F") ? decodeURIComponent(trimmed) : trimmed;
  if (normalizedPath.startsWith("/")) {
    return `${MEDIA_BASE_URL}${normalizedPath}`;
  }
  return `${MEDIA_BASE_URL}/${normalizedPath}`;
};

export const getProductImage = (product?: MedusaProduct) => {
  const thumbnail = resolveMediaUrl(product?.thumbnail);
  if (thumbnail) return thumbnail;

  const images = product?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const url = resolveMediaUrl((image as any)?.url || (image as any)?.thumbnail || image);
      if (url) return url;
    }
  }

  return null;
};

export const getProductCategory = (product?: MedusaProduct) => {
  if (product?.type?.value) return product.type.value;
  if (product?.collection_id) return product.collection_id;
  return "Geral";
};

export const getTokenValue = () => getToken();
export const getCartIdValue = () => getCartId();

export const listRecurrences = async () => {
  return apiFetch<{ recurrences: Recurrence[] }>("/store/recurrences", { method: "GET" });
};

export const createRecurrence = async (payload: {
  name: string;
  frequency: Recurrence["frequency"];
  day_of_week?: number;
  day_of_month?: number;
  payment_method: Recurrence["payment_method"];
  items: RecurrenceItem[];
  company_id?: string | null;
  start_date?: string | null;
}) => {
  return apiFetch<{ recurrence: Recurrence }>("/store/recurrences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateRecurrence = async (id: string, payload: Partial<Omit<Recurrence, "id">>) => {
  return apiFetch<{ recurrence: Recurrence }>(`/store/recurrences/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteRecurrence = async (id: string) => {
  return apiFetch(`/store/recurrences/${id}`, { method: "DELETE" });
};
