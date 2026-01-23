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
  | "pagamentos"
  | "produtos"
  | "estoque"
  | "pedidos"
  | "promocoes"
  | "canais"

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

export type MediaPayload = { images: string[]; videos: string[]; youtube: string[] }
