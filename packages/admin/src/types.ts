export type Product = {
  id: string
  title: string
  status?: string
  variants?: {
    id?: string
    inventory_quantity?: number
    prices?: { amount: number; currency_code: string }[]
    title?: string
    sku?: string | null
  }[]
  metadata?: Record<string, any>
}

export type Order = {
  id: string
  display_id?: number
  status?: string
  total?: number
  currency_code?: string
  created_at?: string
  items?: { quantity?: number; title?: string; product_id?: string; unit_price?: number }[]
}

export type PendingCompany = {
  id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  customer_email?: string | null
  created_at?: string
}

export type AdminCompany = {
  id: string
  customer_id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  metadata?: Record<string, any>
}

export type UserCompany = {
  id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  approved?: boolean
  created_at?: string
  metadata?: Record<string, any>
}

export type StoreUser = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  created_at?: string
  metadata?: Record<string, any>
  companies?: UserCompany[]
  disabled?: boolean
  source?: "customer" | "identity"
  auth_identity_id?: string
}

export type News = {
  id: string
  title: string
  summary: string
  category?: string | null
  author?: string | null
  source?: string | null
  read_time?: number | null
  published_at?: string | null
  is_published?: boolean
}

export type MarketingBanner = {
  id: string
  title: string
  subtitle?: string | null
  image_url?: string | null
  image_mobile_url?: string | null
  animation_url?: string | null
  animation_mobile_url?: string | null
  link_type?: string | null
  link_value?: string | null
  sort_order?: number | null
  active_from?: string | null
  active_until?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type EmailTemplate = {
  id: string
  name?: string
  subject?: string | null
  html?: string | null
  variables?: { key: string; type?: string; fallback?: string; name?: string }[]
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type EmailLog = {
  type?: string | null
  company_id?: string | null
  email?: string | null
  status?: string | null
  payment_collection_id?: string | null
  method?: string | null
  details?: Record<string, any>
  sent_at?: string | null
  has_attachment?: boolean
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
}

export type PriceList = {
  id: string
  title?: string
  description?: string | null
  status?: string
  type?: string
  starts_at?: string | null
  ends_at?: string | null
  rules?: Record<string, string[]>
}

export type SectionId =
  | "dashboard"
  | "noticias"
  | "marketing"
  | "emails"
  | "cobrancas"
  | "email-logs"
  | "pagamentos"
  | "produtos"
  | "entregas"
  | "estoque"
  | "pedidos"
  | "promocoes"
  | "canais"
  | "usuarios"

export type SalesChannel = {
  id: string
  name?: string
  description?: string | null
  is_disabled?: boolean
}

export type Region = { id: string; name?: string; currency_code?: string }

export type StockLocation = {
  id: string
  name?: string
  sales_channels?: SalesChannel[]
}

export type ShippingProfile = {
  id: string
  name?: string
  type?: string
}

export type ShippingOption = {
  id: string
  name?: string
  price_type?: string
  region?: { id: string; name?: string; currency_code?: string }
  shipping_profile?: { id: string; name?: string }
  service_zone?: {
    id: string
    name?: string
    region?: { id: string; name?: string; currency_code?: string }
    fulfillment_set?: {
      type?: string
      location?: { id: string; name?: string }
    }
  }
  prices?: { currency_code?: string; amount?: number }[]
  provider_id?: string
}

export type ServiceZone = {
  id: string
  name?: string
  region?: { id: string; name?: string; currency_code?: string }
  fulfillment_set?: {
    type?: string
    location?: { id: string; name?: string }
  }
}

export type MediaPayload = { images: string[]; videos: string[]; youtube: string[] }
