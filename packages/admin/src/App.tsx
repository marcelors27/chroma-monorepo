import { FormEvent, useEffect, useMemo, useState } from "react"

type Product = {
  id: string
  title: string
  status?: string
  variants?: { inventory_quantity?: number; prices?: { amount: number; currency_code: string }[] }[]
  metadata?: Record<string, any>
}

type Order = {
  id: string
  display_id?: number
  status?: string
  total?: number
  currency_code?: string
  created_at?: string
  items?: { quantity?: number; title?: string; product_id?: string; unit_price?: number }[]
}

type PendingCompany = {
  id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  customer_email?: string | null
  created_at?: string
}

type AdminCompany = {
  id: string
  customer_id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  metadata?: Record<string, any>
}

type News = {
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

type PriceList = {
  id: string
  title?: string
  description?: string | null
  status?: string
  type?: string
  starts_at?: string | null
  ends_at?: string | null
  rules?: Record<string, string[]>
}

type SectionId =
  | "dashboard"
  | "noticias"
  | "pagamentos"
  | "produtos"
  | "pedidos"
  | "promocoes"
  | "canais"

type SalesChannel = { id: string; name?: string; description?: string | null; is_disabled?: boolean }
type Region = { id: string; name?: string; currency_code?: string }
type StockLocation = { id: string; name?: string; sales_channels?: SalesChannel[] }
type MediaPayload = { images: string[]; videos: string[]; youtube: string[] }

const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"
const DEFAULT_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@chroma.local"
const DEFAULT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "supersecret"

function formatMoney(amount?: number, currency?: string) {
  if (!amount || !currency) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export default function App() {
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([])
  const [pendingCompaniesError, setPendingCompaniesError] = useState<string | null>(null)
  const [pendingCompanyActionId, setPendingCompanyActionId] = useState<string | null>(null)
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [companiesError, setCompaniesError] = useState<string | null>(null)
  const [companyEmailEdits, setCompanyEmailEdits] = useState<Record<string, string>>({})
  const [companySavingId, setCompanySavingId] = useState<string | null>(null)
  const [news, setNews] = useState<News[]>([])
  const [newsError, setNewsError] = useState<string | null>(null)
  const [newsSaving, setNewsSaving] = useState(false)
  const [newsDeletingId, setNewsDeletingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<
    { id: string; title: string; description?: string; variant?: "success" | "error" }[]
  >([])
  const [newsForm, setNewsForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "",
    image_url: "",
    author: "",
    source: "",
    read_time: "",
    published_at: "",
    is_published: true,
  })
  const [productError, setProductError] = useState<string | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productEditError, setProductEditError] = useState<string | null>(null)
  const [productEditSaving, setProductEditSaving] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    currency_code: "brl",
    sku: "",
    thumbnail: "",
    image_url: "",
    media_images: "",
    media_videos: "",
    media_youtube: "",
    sales_channel_id: "",
    manage_inventory: false,
    stock_location_id: "",
    stock_quantity: "",
  })
  const [productEditForm, setProductEditForm] = useState({
    media_images: "",
    media_videos: "",
    media_youtube: "",
  })
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSaving, setPromoSaving] = useState(false)
  const [promoForm, setPromoForm] = useState({
    title: "",
    description: "Promoção criada no admin.",
    variant_id: "",
    sale_price: "",
    currency_code: "brl",
    starts_at: "",
    ends_at: "",
    sales_channel_id: "",
    region_id: "",
  })
  const [promoOnlyActive, setPromoOnlyActive] = useState(true)
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [priceListsError, setPriceListsError] = useState<string | null>(null)
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [channelForm, setChannelForm] = useState({
    name: "",
    description: "",
    is_disabled: false,
  })
  const [channelError, setChannelError] = useState<string | null>(null)
  const [channelSaving, setChannelSaving] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [channelEdits, setChannelEdits] = useState<Record<string, typeof channelForm>>({})
  const [channelSavingId, setChannelSavingId] = useState<string | null>(null)
  const [linkForm, setLinkForm] = useState({
    stock_location_id: "",
    sales_channel_id: "",
  })
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSaving, setLinkSaving] = useState(false)
  const [dashboardDays, setDashboardDays] = useState<7 | 30 | 90>(7)
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard")

  const now = new Date()
  const isScheduledPromo = (promo: PriceList) =>
    promo.starts_at ? new Date(promo.starts_at) > now : false

  const getPromoStatusLabel = (promo: PriceList) => {
    if (isScheduledPromo(promo)) return "Agendada"
    return promo.status || "—"
  }

  const getPromoStatusClass = (promo: PriceList) => {
    if (isScheduledPromo(promo)) return "scheduled"
    if (promo.status === "active") return "active"
    return "default"
  }

  const getOrderStatusClass = (status?: string) => {
    if (!status) return "default"
    if (status === "completed") return "active"
    if (status === "canceled" || status === "requires_action") return "scheduled"
    if (status === "pending" || status === "processing") return "scheduled"
    return "default"
  }

  const filteredPromotions = promoOnlyActive
    ? priceLists.filter(
        (promo) =>
          promo.type === "sale" &&
          (promo.status === "active" || isScheduledPromo(promo))
      )
    : priceLists

  const getPromoRules = (promo: PriceList) => {
    const rules = promo.rules || {}
    const entries = Object.entries(rules)
    if (!entries.length) return ["Todas"]
    return entries
      .flatMap(([key, values]) => {
        if (!values?.length) return null
        if (key === "sales_channel_id") {
          return values.map((value) => {
            const found = salesChannels.find((channel) => channel.id === value)
            return `Canal: ${found?.name || value}`
          })
        }
        if (key === "region_id") {
          return values.map((value) => {
            const found = regions.find((region) => region.id === value)
            return `Região: ${found?.name || value}`
          })
        }
        return values.map((value) => `${key}: ${value}`)
      })
      .filter(Boolean)
      .map((value) => String(value))
  }

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  )

  async function login(e?: FormEvent) {
    e?.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível autenticar")
      }
      const json = await res.json()
      const accessToken = json.access_token || json.token
      if (!accessToken) {
        throw new Error("Token não retornado pelo backend")
      }
      setToken(accessToken)
    } catch (err: any) {
      setError(err?.message || "Erro ao autenticar")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return

    const load = async () => {
      try {
        const stockLocationsUrl =
          `${MEDUSA_URL}/admin/stock-locations?limit=200&fields=` +
          encodeURIComponent("+sales_channels.id,+sales_channels.name")
        const ordersFields = encodeURIComponent(
          "+items.quantity,+items.title,+items.product_id,+created_at,+total,+currency_code,+status,+display_id"
        )
        const [
          productsRes,
          ordersRes,
          companiesRes,
          newsRes,
          allCompaniesRes,
          priceListsRes,
          salesChannelsRes,
          regionsRes,
          stockLocationsRes,
        ] = await Promise.all([
          fetch(`${MEDUSA_URL}/admin/products?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/orders?limit=50&fields=${ordersFields}`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies/pending`, { headers }),
          fetch(`${MEDUSA_URL}/admin/news?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies?limit=500`, { headers }),
          fetch(`${MEDUSA_URL}/admin/price-lists?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/sales-channels?limit=200`, { headers }),
          fetch(`${MEDUSA_URL}/admin/regions?limit=200`, { headers }),
          fetch(stockLocationsUrl, { headers }),
        ])

        if (productsRes.ok) {
          const json = await productsRes.json()
          setProducts(json.products ?? [])
        }
        if (ordersRes.ok) {
          const json = await ordersRes.json()
          setOrders(json.orders ?? [])
        }

        if (companiesRes.ok) {
          const json = await companiesRes.json()
          setPendingCompanies(json.companies ?? [])
          setPendingCompaniesError(null)
        } else {
          const body = await companiesRes.text()
          setPendingCompaniesError(body || "Não foi possível buscar empresas pendentes")
        }

        if (newsRes.ok) {
          const json = await newsRes.json()
          setNews(json.news ?? [])
          setNewsError(null)
        } else {
          const body = await newsRes.text()
          setNewsError(body || "Não foi possível buscar notícias")
        }

        if (allCompaniesRes.ok) {
          const json = await allCompaniesRes.json()
          const items = json.companies ?? []
          setCompanies(items)
          const nextEdits: Record<string, string> = {}
          items.forEach((company: AdminCompany) => {
            const raw = company?.metadata?.billing_emails
            const value = Array.isArray(raw) ? raw.join(", ") : raw || ""
            nextEdits[company.id] = value
          })
          setCompanyEmailEdits(nextEdits)
          setCompaniesError(null)
        } else {
          const body = await allCompaniesRes.text()
          setCompaniesError(body || "Não foi possível buscar empresas")
        }

        if (priceListsRes.ok) {
          const json = await priceListsRes.json()
          setPriceLists(json.price_lists ?? [])
          setPriceListsError(null)
        } else {
          const body = await priceListsRes.text()
          setPriceListsError(body || "Não foi possível buscar promoções")
        }

        if (salesChannelsRes.ok) {
          const json = await salesChannelsRes.json()
          setSalesChannels(json.sales_channels ?? [])
          setCatalogError(null)
        } else {
          const body = await salesChannelsRes.text()
          setCatalogError(body || "Não foi possível buscar sales channels")
        }

        if (regionsRes.ok) {
          const json = await regionsRes.json()
          setRegions(json.regions ?? [])
        }

        if (stockLocationsRes.ok) {
          const json = await stockLocationsRes.json()
          setStockLocations(json.stock_locations ?? [])
        }
      } catch (err) {
        console.error("Erro ao buscar dados", err)
        setPendingCompaniesError("Erro ao buscar empresas pendentes")
        setNewsError("Erro ao buscar notícias")
        setCompaniesError("Erro ao buscar empresas")
        setPriceListsError("Erro ao buscar promoções")
        setCatalogError("Erro ao buscar dados de catálogo")
      }
    }

    load()
  }, [token, headers])

  const totalInventory = products.reduce((acc, p) => {
    const inv = p.variants?.[0]?.inventory_quantity ?? 0
    return acc + inv
  }, 0)
  const openOrders = orders.filter((o) => o.status !== "completed").length
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dashboardDays)
  const dashboardOrders = orders.filter((order) => {
    if (!order.created_at) return false
    const date = new Date(order.created_at)
    if (Number.isNaN(date.getTime())) return false
    return date >= cutoff
  })
  const totalSales = dashboardOrders.reduce((acc, order) => acc + (order.total || 0), 0)
  const averageTicket = dashboardOrders.length ? totalSales / dashboardOrders.length : 0
  const itemsPurchased = dashboardOrders.reduce((acc, order) => {
    const items = order.items
    if (!items) return acc
    return acc + items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  }, 0)
  const recentOrders = dashboardOrders.slice(0, 6)
  const revenueByDay = dashboardOrders.reduce((acc, order) => {
    if (!order.created_at) return acc
    const date = new Date(order.created_at)
    if (Number.isNaN(date.getTime())) return acc
    const key = date.toISOString().slice(0, 10)
    const label = date.toLocaleDateString("pt-BR")
    const current = acc.get(key) || { label, total: 0 }
    current.total += order.total || 0
    acc.set(key, current)
    return acc
  }, new Map<string, { label: string; total: number }>())
  const revenueSeries = Array.from(revenueByDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value)
    .slice(-dashboardDays)
  const revenueMax = revenueSeries.reduce((max, row) => Math.max(max, row.total), 0)
  const topProducts = (() => {
    const map = new Map<string, { title: string; quantity: number; revenue: number }>()
    dashboardOrders.forEach((order) => {
      const items = order.items || []
      items.forEach((item) => {
        const key = item.product_id || item.title || "produto"
        const current = map.get(key) || {
          title: item.title || "Produto",
          quantity: 0,
          revenue: 0,
        }
        const quantity = item.quantity || 0
        const unitPrice = item.unit_price || 0
        current.quantity += quantity
        current.revenue += quantity * unitPrice
        map.set(key, current)
      })
    })
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .slice(0, 5)
  })()

  const formatCnpj = (cnpj?: string) => {
    if (!cnpj) return "—"
    const digits = cnpj.replace(/\D/g, "")
    const parts = [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14),
    ]
    let formatted = ""
    if (parts[0]) formatted += parts[0]
    if (parts[1]) formatted += `.${parts[1]}`
    if (parts[2]) formatted += `.${parts[2]}`
    if (parts[3]) formatted += `/${parts[3]}`
    if (parts[4]) formatted += `-${parts[4]}`
    return formatted || "—"
  }

  async function setCompanyApproval(companyId: string, approved: boolean) {
    setPendingCompanyActionId(companyId)
    try {
      const endpoint = approved ? "approve" : "reject"
      const res = await fetch(`${MEDUSA_URL}/admin/companies/${companyId}/${endpoint}`, {
        method: "POST",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar status")
      }
      setPendingCompanies((prev) => prev.filter((company) => company.id !== companyId))
    } catch (err: any) {
      setPendingCompaniesError(err?.message || "Erro ao alterar status")
    } finally {
      setPendingCompanyActionId(null)
    }
  }

  const handleNewsChange = (field: keyof typeof newsForm, value: string | boolean) => {
    setNewsForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetNewsForm = () => {
    setNewsForm({
      title: "",
      summary: "",
      content: "",
      category: "",
      image_url: "",
      author: "",
      source: "",
      read_time: "",
      published_at: "",
      is_published: true,
    })
  }

  async function createNews(e: FormEvent) {
    e.preventDefault()
    if (!newsForm.title || !newsForm.summary || !newsForm.content) {
      setNewsError("Preencha titulo, resumo e conteudo.")
      return
    }
    setNewsSaving(true)
    setNewsError(null)
    try {
      const payload = {
        title: newsForm.title,
        summary: newsForm.summary,
        content: newsForm.content,
        category: newsForm.category || null,
        image_url: newsForm.image_url || null,
        author: newsForm.author || null,
        source: newsForm.source || null,
        read_time: newsForm.read_time ? Number(newsForm.read_time) : null,
        published_at: newsForm.published_at || null,
        is_published: newsForm.is_published,
      }
      const res = await fetch(`${MEDUSA_URL}/admin/news`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar notícia")
      }
      const json = await res.json()
      if (json?.news) {
        setNews((prev) => [json.news, ...prev])
      }
      resetNewsForm()
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao criar notícia")
    } finally {
      setNewsSaving(false)
    }
  }

  async function deleteNews(id: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta noticia?")
    if (!confirmed) return
    setNewsDeletingId(id)
    setNewsError(null)
    try {
      const res = await fetch(`${MEDUSA_URL}/admin/news/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Nao foi possivel excluir a noticia")
      }
      setNews((prev) => prev.filter((item) => item.id !== id))
      pushToast({
        title: "Noticia excluida",
        description: "A noticia foi removida com sucesso.",
        variant: "success",
      })
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao excluir noticia")
      pushToast({
        title: "Erro ao excluir noticia",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setNewsDeletingId(null)
    }
  }

  const pushToast = (toast: {
    title: string
    description?: string
    variant?: "success" | "error"
  }) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, ...toast }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3500)
  }

  const handleCompanyEmailChange = (companyId: string, value: string) => {
    setCompanyEmailEdits((prev) => ({ ...prev, [companyId]: value }))
  }

  const handleProductChange = (field: keyof typeof productForm, value: string | boolean) => {
    setProductForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetProductForm = () => {
    setProductForm({
      title: "",
      description: "",
      price: "",
      currency_code: "brl",
      sku: "",
      thumbnail: "",
      image_url: "",
      media_images: "",
      media_videos: "",
      media_youtube: "",
      sales_channel_id: "",
      manage_inventory: false,
      stock_location_id: "",
      stock_quantity: "",
    })
  }

  const toAmount = (value: string) => {
    const normalized = value.replace(",", ".")
    const parsed = Number(normalized)
    if (Number.isNaN(parsed)) return null
    return Math.round(parsed * 100)
  }

  const parseMediaList = (value: string) => {
    return value
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const toYoutubeEmbed = (url: string) => {
    const match =
      url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/i) ||
      []
    const id = match[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }

  const validateMedia = (media: MediaPayload) => {
    const invalidImages = media.images.filter((url) => !/^https?:\/\//i.test(url))
    const invalidVideos = media.videos.filter((url) => !/^https?:\/\//i.test(url))
    const invalidYoutube = media.youtube.filter((url) => !toYoutubeEmbed(url))
    if (invalidImages.length) return "Existem URLs de imagem inválidas."
    if (invalidVideos.length) return "Existem URLs de vídeo inválidas."
    if (invalidYoutube.length) return "Existem links do YouTube inválidos."
    return null
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault()
    if (!productForm.title || !productForm.price) {
      setProductError("Preencha título e preço.")
      return
    }
    if (productForm.manage_inventory) {
      if (!productForm.stock_location_id || !productForm.stock_quantity) {
        setProductError("Informe o local de estoque e a quantidade.")
        return
      }
      const stockAmount = Number(productForm.stock_quantity)
      if (Number.isNaN(stockAmount) || stockAmount < 0) {
        setProductError("Quantidade de estoque inválida.")
        return
      }
    }
    const amount = toAmount(productForm.price)
    if (!amount || amount <= 0) {
      setProductError("Preço inválido.")
      return
    }
    setProductSaving(true)
    setProductError(null)
    try {
      const mediaImages = parseMediaList(productForm.media_images)
      const mediaVideos = parseMediaList(productForm.media_videos)
      const mediaYoutube = parseMediaList(productForm.media_youtube)
      const mediaValidation = validateMedia({
        images: mediaImages,
        videos: mediaVideos,
        youtube: mediaYoutube,
      })
      if (mediaValidation) {
        setProductError(mediaValidation)
        setProductSaving(false)
        return
      }

      const payload: Record<string, any> = {
        title: productForm.title,
        description: productForm.description || null,
        status: "published",
        thumbnail: productForm.thumbnail || null,
        images: productForm.image_url ? [{ url: productForm.image_url }] : undefined,
        metadata:
          mediaImages.length || mediaVideos.length || mediaYoutube.length
            ? {
                media: {
                  images: mediaImages,
                  videos: mediaVideos,
                  youtube: mediaYoutube,
                },
              }
            : undefined,
        variants: [
          {
            title: "Padrão",
            sku: productForm.sku || null,
            allow_backorder: !productForm.manage_inventory,
            manage_inventory: productForm.manage_inventory,
            prices: [{ currency_code: productForm.currency_code, amount }],
          },
        ],
      }
      if (productForm.sales_channel_id) {
        payload.sales_channels = [{ id: productForm.sales_channel_id }]
      }
      const res = await fetch(`${MEDUSA_URL}/admin/products`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar o produto")
      }
      const json = await res.json()
      if (json?.product) {
        setProducts((prev) => [json.product, ...prev])
      }

      if (productForm.manage_inventory && json?.product?.id) {
        const variantId = json.product.variants?.[0]?.id
        if (variantId && productForm.stock_location_id) {
          const inventoryRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              sku: productForm.sku || null,
              title: productForm.title,
              location_levels: [
                {
                  location_id: productForm.stock_location_id,
                  stocked_quantity: Number(productForm.stock_quantity),
                },
              ],
            }),
          })
          if (!inventoryRes.ok) {
            const body = await inventoryRes.text()
            throw new Error(body || "Produto criado, mas falhou ao criar estoque.")
          }
          const inventoryJson = await inventoryRes.json()
          const inventoryItemId = inventoryJson?.inventory_item?.id
          if (inventoryItemId) {
            const linkRes = await fetch(
              `${MEDUSA_URL}/admin/products/${json.product.id}/variants/${variantId}/inventory-items`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  inventory_item_id: inventoryItemId,
                  required_quantity: 1,
                }),
              }
            )
            if (!linkRes.ok) {
              const body = await linkRes.text()
              throw new Error(body || "Produto criado, mas falhou ao vincular o estoque.")
            }
          }
        }
      }

      resetProductForm()
    } catch (err: any) {
      setProductError(err?.message || "Erro ao criar produto")
    } finally {
      setProductSaving(false)
    }
  }

  const formatMediaValue = (value?: string[] | null) => {
    if (!value?.length) return ""
    return value.join("\n")
  }

  const startEditProductMedia = (product: Product) => {
    const metadata = product.metadata as Record<string, unknown> | undefined
    const media = (metadata?.media || {}) as Record<string, unknown>
    setEditingProductId(product.id)
    setProductEditForm({
      media_images: formatMediaValue(media.images as string[] | undefined),
      media_videos: formatMediaValue(media.videos as string[] | undefined),
      media_youtube: formatMediaValue(media.youtube as string[] | undefined),
    })
  }

  const cancelEditProductMedia = () => {
    setEditingProductId(null)
    setProductEditError(null)
  }

  const updateProductEditField = (
    field: keyof typeof productEditForm,
    value: string
  ) => {
    setProductEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveProductMedia = async (product: Product) => {
    const mediaImages = parseMediaList(productEditForm.media_images)
    const mediaVideos = parseMediaList(productEditForm.media_videos)
    const mediaYoutube = parseMediaList(productEditForm.media_youtube)
    const mediaValidation = validateMedia({
      images: mediaImages,
      videos: mediaVideos,
      youtube: mediaYoutube,
    })
    if (mediaValidation) {
      setProductEditError(mediaValidation)
      return
    }
    setProductEditSaving(true)
    setProductEditError(null)
    try {
      const payload = {
        metadata: {
          ...(product.metadata || {}),
          media: {
            images: mediaImages,
            videos: mediaVideos,
            youtube: mediaYoutube,
          },
        },
      }
      const res = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar a mídia")
      }
      const json = await res.json()
      if (json?.product) {
        setProducts((prev) => prev.map((item) => (item.id === product.id ? json.product : item)))
      }
      setEditingProductId(null)
    } catch (err: any) {
      setProductEditError(err?.message || "Erro ao atualizar mídia")
    } finally {
      setProductEditSaving(false)
    }
  }

  const handlePromoChange = (field: keyof typeof promoForm, value: string) => {
    setPromoForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetPromoForm = () => {
    setPromoForm({
      title: "",
      description: "Promoção criada no admin.",
      variant_id: "",
      sale_price: "",
      currency_code: "brl",
      starts_at: "",
      ends_at: "",
      sales_channel_id: "",
      region_id: "",
    })
  }

  async function createPromotion(e: FormEvent) {
    e.preventDefault()
    if (!promoForm.title || !promoForm.variant_id || !promoForm.sale_price) {
      setPromoError("Preencha título, variante e preço promocional.")
      return
    }
    const amount = toAmount(promoForm.sale_price)
    if (!amount || amount <= 0) {
      setPromoError("Preço promocional inválido.")
      return
    }
    setPromoSaving(true)
    setPromoError(null)
    try {
      const rules: Record<string, string[]> = {}
      if (promoForm.sales_channel_id) {
        rules.sales_channel_id = [promoForm.sales_channel_id]
      }
      if (promoForm.region_id) {
        rules.region_id = [promoForm.region_id]
      }
      const payload = {
        title: promoForm.title,
        description: promoForm.description || "",
        type: "sale",
        status: "active",
        starts_at: promoForm.starts_at || null,
        ends_at: promoForm.ends_at || null,
        rules: Object.keys(rules).length ? rules : undefined,
        prices: [
          {
            currency_code: promoForm.currency_code,
            amount,
            variant_id: promoForm.variant_id,
          },
        ],
      }
      const res = await fetch(`${MEDUSA_URL}/admin/price-lists`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar a promoção")
      }
      const json = await res.json()
      if (json?.price_list) {
        setPriceLists((prev) => [json.price_list, ...prev])
      }
      resetPromoForm()
    } catch (err: any) {
      setPromoError(err?.message || "Erro ao criar promoção")
    } finally {
      setPromoSaving(false)
    }
  }

  const handleChannelChange = (
    field: keyof typeof channelForm,
    value: string | boolean
  ) => {
    setChannelForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetChannelForm = () => {
    setChannelForm({
      name: "",
      description: "",
      is_disabled: false,
    })
  }

  async function createSalesChannel(e: FormEvent) {
    e.preventDefault()
    if (!channelForm.name) {
      setChannelError("Informe o nome do canal.")
      return
    }
    setChannelSaving(true)
    setChannelError(null)
    try {
      const payload = {
        name: channelForm.name,
        description: channelForm.description || null,
        is_disabled: channelForm.is_disabled,
      }
      const res = await fetch(`${MEDUSA_URL}/admin/sales-channels`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar o canal")
      }
      const json = await res.json()
      if (json?.sales_channel) {
        setSalesChannels((prev) => [json.sales_channel, ...prev])
      }
      resetChannelForm()
    } catch (err: any) {
      setChannelError(err?.message || "Erro ao criar canal")
    } finally {
      setChannelSaving(false)
    }
  }

  const startEditChannel = (channel: SalesChannel) => {
    setEditingChannelId(channel.id)
    setChannelEdits((prev) => ({
      ...prev,
      [channel.id]: {
        name: channel.name || "",
        description: channel.description || "",
        is_disabled: Boolean(channel.is_disabled),
      },
    }))
  }

  const cancelEditChannel = () => {
    setEditingChannelId(null)
  }

  const updateChannelEdit = (
    channelId: string,
    field: keyof typeof channelForm,
    value: string | boolean
  ) => {
    setChannelEdits((prev) => ({
      ...prev,
      [channelId]: {
        ...(prev[channelId] || { name: "", description: "", is_disabled: false }),
        [field]: value,
      },
    }))
  }

  const saveChannelEdit = async (channelId: string) => {
    const payload = channelEdits[channelId]
    if (!payload?.name) {
      setChannelError("Informe o nome do canal.")
      return
    }
    setChannelSavingId(channelId)
    setChannelError(null)
    try {
      const res = await fetch(`${MEDUSA_URL}/admin/sales-channels/${channelId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: payload.name,
          description: payload.description || null,
          is_disabled: payload.is_disabled,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar o canal")
      }
      const json = await res.json()
      if (json?.sales_channel) {
        setSalesChannels((prev) =>
          prev.map((item) => (item.id === channelId ? json.sales_channel : item))
        )
      }
      setEditingChannelId(null)
    } catch (err: any) {
      setChannelError(err?.message || "Erro ao atualizar canal")
    } finally {
      setChannelSavingId(null)
    }
  }

  const updateLinkForm = (field: keyof typeof linkForm, value: string) => {
    setLinkForm((prev) => ({ ...prev, [field]: value }))
  }

  const linkSalesChannel = async (action: "add" | "remove") => {
    if (!linkForm.stock_location_id || !linkForm.sales_channel_id) {
      setLinkError("Selecione o canal e o local de estoque.")
      return
    }
    setLinkSaving(true)
    setLinkError(null)
    try {
      const payload = {
        add: action === "add" ? [linkForm.sales_channel_id] : [],
        remove: action === "remove" ? [linkForm.sales_channel_id] : [],
      }
      const res = await fetch(
        `${MEDUSA_URL}/admin/stock-locations/${linkForm.stock_location_id}/sales-channels`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar a associação")
      }
      await fetchStockLocations()
    } catch (err: any) {
      setLinkError(err?.message || "Erro ao associar canal")
    } finally {
      setLinkSaving(false)
    }
  }

  const saveCompanyBillingEmails = async (company: AdminCompany) => {
    setCompanySavingId(company.id)
    setCompaniesError(null)
    try {
      const payload = {
        customer_id: company.customer_id,
        billing_emails: companyEmailEdits[company.id] || "",
      }
      const res = await fetch(`${MEDUSA_URL}/admin/companies/${company.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível salvar os e-mails")
      }
      const json = await res.json()
      const updated = json?.company
      if (updated) {
        setCompanies((prev) => prev.map((item) => (item.id === company.id ? updated : item)))
      }
    } catch (err: any) {
      setCompaniesError(err?.message || "Erro ao salvar e-mails")
    } finally {
      setCompanySavingId(null)
    }
  }

  return (
    <>
      {!token ? (
        <div className="layout">
          <header className="grid" style={{ gap: "0.75rem" }}>
            <span className="pill">Chroma Admin</span>
            <h1 style={{ fontSize: "2.1rem" }}>Painel da operação</h1>
            <p className="muted" style={{ maxWidth: "640px" }}>
              Autentique com o usuário admin do Medusa para ver produtos, estoque e pedidos.
            </p>
          </header>

          <form className="panel grid" onSubmit={login} style={{ gap: "1rem", maxWidth: "520px" }}>
            <h2>Entrar</h2>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">E-mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Senha</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="field-input"
              />
            </label>

            {error && <div className="muted">Erro: {error}</div>}

            <button className="btn" type="submit" disabled={isLoading}>
              {isLoading ? "Autenticando..." : "Acessar admin"}
            </button>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Dica: crie o usuário rodando `medusa user -e admin@chroma.local -p supersecret` no
              pacote da API.
            </p>
          </form>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="grid" style={{ gap: "0.4rem" }}>
              <span className="pill">Chroma Admin</span>
              <h2>Painel da operação</h2>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                Selecione um módulo para trabalhar.
              </span>
            </div>
            <nav className="nav">
              {[
                { id: "dashboard", label: "Dashboard", count: orders.length },
                { id: "noticias", label: "Notícias", count: news.length },
                { id: "pagamentos", label: "Pagamentos", count: pendingCompanies.length },
                { id: "produtos", label: "Produtos", count: products.length },
                { id: "pedidos", label: "Pedidos", count: orders.length },
                { id: "promocoes", label: "Promoções", count: priceLists.length },
                { id: "canais", label: "Canais de vendas", count: salesChannels.length },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveSection(item.id as SectionId)}
                >
                  <span>{item.label}</span>
                  <span className="nav-badge">{item.count}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="content">
            {catalogError && (
              <div className="panel" style={{ marginBottom: "1rem" }}>
                <span className="muted">Erro: {catalogError}</span>
              </div>
            )}
            {activeSection === "dashboard" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Dashboard</h1>
                  <p className="muted">
                    Visao rapida de vendas, pedidos e desempenho do catalogo.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {[7, 30, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        className={`btn btn-sm ${dashboardDays === days ? "" : "btn-secondary"}`}
                        onClick={() => setDashboardDays(days as 7 | 30 | 90)}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                </header>

                <section className="grid grid-3">
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Vendas (ultimos pedidos)</span>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {formatMoney(totalSales, orders[0]?.currency_code || "brl")}
                    </strong>
                    <span className="muted">{dashboardOrders.length} pedidos no periodo</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Ticket medio</span>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {formatMoney(averageTicket, orders[0]?.currency_code || "brl")}
                    </strong>
                    <span className="muted">Baseado no total atual</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Pedidos pendentes</span>
                    <strong style={{ fontSize: "1.6rem" }}>{openOrders}</strong>
                    <span className="muted">Nao concluidos</span>
                  </div>
                </section>

                <section className="grid grid-3">
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Produtos comprados</span>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {itemsPurchased || "—"}
                    </strong>
                    <span className="muted">Ultimos {dashboardDays} dias</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Catalogo ativo</span>
                    <strong style={{ fontSize: "1.6rem" }}>{products.length}</strong>
                    <span className="muted">Produtos publicados</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Empresas pendentes</span>
                    <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies.length}</strong>
                    <span className="muted">Aguardando aprovacao</span>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3>Pedidos recentes</h3>
                    <span className="pill">{dashboardOrders.length} pedidos no periodo</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Status</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center" }}>
                              Nenhum pedido encontrado.
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((order) => (
                            <tr key={order.id}>
                              <td>#{order.display_id ?? order.id.slice(0, 6)}</td>
                              <td>
                                <span className={`status-chip ${getOrderStatusClass(order.status)}`}>
                                  {order.status ?? "—"}
                                </span>
                              </td>
                              <td>{formatMoney(order.total, order.currency_code)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section
                  className="grid"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
                >
                  <div className="panel">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <h3>Faturamento por dia</h3>
                      <span className="pill">Ultimos {dashboardDays} dias</span>
                    </div>
                    {revenueSeries.length === 0 ? (
                      <p className="muted">Sem dados suficientes.</p>
                    ) : (
                      <div className="grid" style={{ gap: "0.6rem" }}>
                        {revenueSeries.map((row) => {
                          const width = revenueMax ? Math.round((row.total / revenueMax) * 100) : 0
                          return (
                            <div key={row.label} className="grid" style={{ gap: "0.35rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span className="muted">{row.label}</span>
                                <span>
                                  {formatMoney(row.total, orders[0]?.currency_code || "brl")}
                                </span>
                              </div>
                              <div
                                style={{
                                  background: "hsl(220 28% 15%)",
                                  borderRadius: "999px",
                                  height: "8px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${width}%`,
                                    height: "100%",
                                    background: "hsl(210 73% 63%)",
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="panel">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                    <h3>Top produtos</h3>
                    <span className="pill">Maior receita</span>
                    </div>
                    {topProducts.length === 0 ? (
                      <p className="muted">Sem dados suficientes.</p>
                    ) : (
                      <div className="grid" style={{ gap: "0.75rem" }}>
                        {topProducts.map((item) => (
                          <div
                            key={item.title}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "1rem",
                            }}
                          >
                            <div>
                              <strong>{item.title}</strong>
                              <div className="muted" style={{ fontSize: "0.85rem" }}>
                                {item.quantity} itens
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div className="muted" style={{ fontSize: "0.85rem" }}>
                                Receita
                              </div>
                              <div>
                                {formatMoney(item.revenue, orders[0]?.currency_code || "brl")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
            {activeSection === "pagamentos" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Pagamentos</h1>
                  <p className="muted">
                    Acompanhe aprovações e configure responsáveis pelos boletos e PIX.
                  </p>
                </header>

                <section className="grid grid-3">
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Pendências</span>
                    <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies.length}</strong>
                    <span className="muted">Empresas aguardando</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Condomínios</span>
                    <strong style={{ fontSize: "1.6rem" }}>{companies.length}</strong>
                    <span className="muted">Com cadastro ativo</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Boletos/PIX</span>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {companies.filter((company) => companyEmailEdits[company.id]?.trim()).length}
                    </strong>
                    <span className="muted">E-mails configurados</span>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Empresas aguardando aprovação</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Use os dados da empresa para liberar ou negar o acesso ao catálogo.
                      </p>
                    </div>
                    <span className="pill">{pendingCompanies.length} pendentes</span>
                  </div>

                  {pendingCompaniesError && <div className="muted">Erro: {pendingCompaniesError}</div>}

                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Empresa</th>
                          <th>Nome fantasia</th>
                          <th>CNPJ</th>
                          <th>E-mail</th>
                          <th>Criado em</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center" }}>
                              Nenhum cadastro aguardando análise.
                            </td>
                          </tr>
                        ) : (
                          pendingCompanies.map((company) => (
                            <tr key={company.id}>
                              <td>{company.trade_name || "—"}</td>
                              <td>{company.fantasy_name || "—"}</td>
                              <td>{formatCnpj(company.cnpj || undefined)}</td>
                              <td>{company.customer_email || "—"}</td>
                              <td>
                                {company.created_at
                                  ? new Date(company.created_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                              <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => setCompanyApproval(company.id, true)}
                                  disabled={pendingCompanyActionId === company.id}
                                >
                                  Aprovar
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setCompanyApproval(company.id, false)}
                                  disabled={pendingCompanyActionId === company.id}
                                >
                                  Rejeitar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Canais por estoque</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Veja quais canais estao associados a cada local.
                      </p>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Local</th>
                          <th>Canais vinculados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockLocations.length === 0 ? (
                          <tr>
                            <td colSpan={2} style={{ textAlign: "center" }}>
                              Nenhum local encontrado.
                            </td>
                          </tr>
                        ) : (
                          stockLocations.map((location) => (
                            <tr key={location.id}>
                              <td>{location.name || location.id}</td>
                              <td>
                                {location.sales_channels?.length ? (
                                  <div className="rule-tags">
                                    {location.sales_channels.map((channel) => (
                                      <span key={channel.id} className="rule-tag">
                                        {channel.name || channel.id}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="muted">Nenhum canal</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Destinatários de boleto/PIX</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Configure os e-mails que receberão boletos e códigos PIX por condomínio.
                      </p>
                    </div>
                    <span className="pill">{companies.length} empresas</span>
                  </div>

                  {companiesError && <div className="muted">Erro: {companiesError}</div>}

                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Condomínio</th>
                          <th>E-mails</th>
                          <th>Pontos</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center" }}>
                              Nenhuma empresa encontrada.
                            </td>
                          </tr>
                        ) : (
                          companies.map((company) => (
                            <tr key={company.id}>
                              <td>{company.fantasy_name || company.trade_name || "Condomínio"}</td>
                              <td style={{ minWidth: "320px" }}>
                                <input
                                  value={companyEmailEdits[company.id] || ""}
                                  onChange={(e) => handleCompanyEmailChange(company.id, e.target.value)}
                                  placeholder="financeiro@condominio.com.br, sindico@condominio.com.br"
                                  className="field-input"
                                />
                                <span className="muted" style={{ fontSize: "0.8rem" }}>
                                  Separe por vírgula ou ponto e vírgula.
                                </span>
                              </td>
                              <td>{Number(company?.metadata?.points_balance || 0)}</td>
                              <td>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => saveCompanyBillingEmails(company)}
                                  disabled={companySavingId === company.id}
                                >
                                  {companySavingId === company.id ? "Salvando..." : "Salvar"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "noticias" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Notícias</h1>
                  <p className="muted">Crie e acompanhe as notícias exibidas no app e no front-store.</p>
                </header>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Publicações</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Organize comunicados, campanhas e novidades do marketplace.
                      </p>
                    </div>
                    <span className="pill">{news.length} registros</span>
                  </div>

                  {newsError && <div className="muted">Erro: {newsError}</div>}

                  <form className="panel grid" onSubmit={createNews} style={{ gap: "0.85rem", marginBottom: "1rem" }}>
                    <h4 style={{ marginBottom: "0.35rem" }}>Adicionar notícia</h4>
                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Título</span>
                      <input
                        value={newsForm.title}
                        onChange={(e) => handleNewsChange("title", e.target.value)}
                        required
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Resumo</span>
                      <textarea
                        value={newsForm.summary}
                        onChange={(e) => handleNewsChange("summary", e.target.value)}
                        rows={3}
                        required
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Conteúdo (HTML)</span>
                      <textarea
                        value={newsForm.content}
                        onChange={(e) => handleNewsChange("content", e.target.value)}
                        rows={6}
                        required
                        className="field-input"
                      />
                    </label>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      }}
                    >
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Categoria</span>
                        <input
                          value={newsForm.category}
                          onChange={(e) => handleNewsChange("category", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Autor</span>
                        <input
                          value={newsForm.author}
                          onChange={(e) => handleNewsChange("author", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Fonte</span>
                        <input
                          value={newsForm.source}
                          onChange={(e) => handleNewsChange("source", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Tempo de leitura (min)</span>
                        <input
                          type="number"
                          value={newsForm.read_time}
                          onChange={(e) => handleNewsChange("read_time", e.target.value)}
                          min={1}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Data de publicação</span>
                        <input
                          type="datetime-local"
                          value={newsForm.published_at}
                          onChange={(e) => handleNewsChange("published_at", e.target.value)}
                          className="field-input"
                        />
                      </label>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={newsForm.is_published}
                        onChange={(e) => handleNewsChange("is_published", e.target.checked)}
                        className="checkbox"
                      />
                      <span className="muted">Publicar imediatamente</span>
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Imagem (URL)</span>
                      <input
                        value={newsForm.image_url}
                        onChange={(e) => handleNewsChange("image_url", e.target.value)}
                        className="field-input"
                      />
                    </label>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="btn" type="submit" disabled={newsSaving}>
                        {newsSaving ? "Salvando..." : "Adicionar notícia"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={resetNewsForm}
                      >
                        Limpar
                      </button>
                    </div>
                  </form>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>Categoria</th>
                          <th>Publicado</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {news.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center" }}>
                              Nenhuma notícia cadastrada.
                            </td>
                          </tr>
                        ) : (
                          news.map((item) => (
                            <tr key={item.id}>
                              <td>{item.title}</td>
                              <td>{item.category || "Geral"}</td>
                              <td>
                                {item.published_at
                                  ? new Date(item.published_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                              <td>{item.is_published ? "Ativa" : "Rascunho"}</td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  type="button"
                                  onClick={() => deleteNews(item.id)}
                                  disabled={newsDeletingId === item.id}
                                >
                                  {newsDeletingId === item.id ? "Excluindo..." : "Excluir"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "produtos" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Produtos</h1>
                  <p className="muted">Acompanhe catálogo, estoque e preços médios.</p>
                </header>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Adicionar novo produto</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Produto é criado como publicado para aparecer na vitrine.
                      </p>
                    </div>
                  </div>

                  {productError && <div className="muted">Erro: {productError}</div>}

                  <form className="panel grid" onSubmit={createProduct} style={{ gap: "0.85rem" }}>
                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Título</span>
                      <input
                        value={productForm.title}
                        onChange={(e) => handleProductChange("title", e.target.value)}
                        required
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Descrição</span>
                      <textarea
                        value={productForm.description}
                        onChange={(e) => handleProductChange("description", e.target.value)}
                        rows={3}
                        className="field-input"
                      />
                    </label>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      }}
                    >
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Preço (R$)</span>
                        <input
                          type="number"
                          value={productForm.price}
                          onChange={(e) => handleProductChange("price", e.target.value)}
                          min={0}
                          step="0.01"
                          required
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Moeda</span>
                        <input
                          value={productForm.currency_code}
                          onChange={(e) => handleProductChange("currency_code", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">SKU</span>
                        <input
                          value={productForm.sku}
                          onChange={(e) => handleProductChange("sku", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Sales Channel (opcional)</span>
                        <select
                          value={productForm.sales_channel_id}
                          onChange={(e) => handleProductChange("sales_channel_id", e.target.value)}
                          className="field-input"
                        >
                          <option value="">Selecionar</option>
                          {salesChannels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name || channel.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Thumbnail (URL)</span>
                      <input
                        value={productForm.thumbnail}
                        onChange={(e) => handleProductChange("thumbnail", e.target.value)}
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Imagem principal (URL)</span>
                      <input
                        value={productForm.image_url}
                        onChange={(e) => handleProductChange("image_url", e.target.value)}
                        className="field-input"
                      />
                    </label>

                    <div className="grid" style={{ gap: "0.75rem" }}>
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Imagens adicionais (URLs, uma por linha)</span>
                        <textarea
                          value={productForm.media_images}
                          onChange={(e) => handleProductChange("media_images", e.target.value)}
                          rows={3}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Videos (URLs MP4, uma por linha)</span>
                        <textarea
                          value={productForm.media_videos}
                          onChange={(e) => handleProductChange("media_videos", e.target.value)}
                          rows={3}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Links do YouTube (um por linha)</span>
                        <textarea
                          value={productForm.media_youtube}
                          onChange={(e) => handleProductChange("media_youtube", e.target.value)}
                          rows={3}
                          className="field-input"
                        />
                      </label>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={productForm.manage_inventory}
                        onChange={(e) => handleProductChange("manage_inventory", e.target.checked)}
                        className="checkbox"
                      />
                      <span className="muted">Gerenciar estoque</span>
                    </label>

                    {productForm.manage_inventory && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.75rem",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        }}
                      >
                        <label className="grid" style={{ gap: "0.35rem" }}>
                          <span className="muted">Local de estoque</span>
                          <select
                            value={productForm.stock_location_id}
                            onChange={(e) => handleProductChange("stock_location_id", e.target.value)}
                            className="field-input"
                          >
                            <option value="">Selecionar</option>
                            {stockLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name || location.id}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid" style={{ gap: "0.35rem" }}>
                          <span className="muted">Quantidade inicial</span>
                          <input
                            type="number"
                            min={0}
                            value={productForm.stock_quantity}
                            onChange={(e) => handleProductChange("stock_quantity", e.target.value)}
                            className="field-input"
                          />
                        </label>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="btn" type="submit" disabled={productSaving}>
                        {productSaving ? "Criando..." : "Adicionar produto"}
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={resetProductForm}>
                        Limpar
                      </button>
                    </div>
                  </form>
                </section>

                <section className="grid grid-3">
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Produtos</span>
                    <strong style={{ fontSize: "1.6rem" }}>{products.length}</strong>
                    <span className="muted">Em catálogo</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Estoque total</span>
                    <strong style={{ fontSize: "1.6rem" }}>{totalInventory}</strong>
                    <span className="muted">Unidades disponíveis</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Pedidos abertos</span>
                    <strong style={{ fontSize: "1.6rem" }}>{openOrders}</strong>
                    <span className="muted">Acompanhe a separação</span>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3>Catálogo recente</h3>
                    <span className="pill">{products.length} itens</span>
                  </div>
                  {productEditError && <div className="muted">Erro: {productEditError}</div>}
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>Estoque</th>
                          <th>Preço</th>
                          <th>Mídias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => {
                          const variant = p.variants?.[0]
                          const price = variant?.prices?.[0]
                          return (
                            <tr key={p.id}>
                              <td>{p.title}</td>
                              <td>{variant?.inventory_quantity ?? 0}</td>
                              <td>{formatMoney(price?.amount, price?.currency_code)}</td>
                              <td>
                                {editingProductId === p.id ? (
                                  <div className="grid" style={{ gap: "0.5rem", minWidth: "260px" }}>
                                    <textarea
                                      value={productEditForm.media_images}
                                      onChange={(e) =>
                                        updateProductEditField("media_images", e.target.value)
                                      }
                                      rows={2}
                                      placeholder="Imagens (URLs)"
                                      className="field-input"
                                    />
                                    <textarea
                                      value={productEditForm.media_videos}
                                      onChange={(e) =>
                                        updateProductEditField("media_videos", e.target.value)
                                      }
                                      rows={2}
                                      placeholder="Vídeos (URLs MP4)"
                                      className="field-input"
                                    />
                                    <textarea
                                      value={productEditForm.media_youtube}
                                      onChange={(e) =>
                                        updateProductEditField("media_youtube", e.target.value)
                                      }
                                      rows={2}
                                      placeholder="YouTube (links)"
                                      className="field-input"
                                    />
                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                      <button
                                        className="btn btn-sm"
                                        type="button"
                                        disabled={productEditSaving}
                                        onClick={() => saveProductMedia(p)}
                                      >
                                        {productEditSaving ? "Salvando..." : "Salvar"}
                                      </button>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        type="button"
                                        onClick={cancelEditProductMedia}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    type="button"
                                    onClick={() => startEditProductMedia(p)}
                                  >
                                    Editar mídias
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "pedidos" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Pedidos</h1>
                  <p className="muted">Monitoramento dos pedidos abertos e entregues.</p>
                </header>

                <section className="grid grid-3">
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Pedidos</span>
                    <strong style={{ fontSize: "1.6rem" }}>{orders.length}</strong>
                    <span className="muted">Total no período</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Em aberto</span>
                    <strong style={{ fontSize: "1.6rem" }}>{openOrders}</strong>
                    <span className="muted">Processamento</span>
                  </div>
                  <div className="panel grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Concluídos</span>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {orders.filter((order) => order.status === "completed").length}
                    </strong>
                    <span className="muted">Finalizados</span>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3>Pedidos recentes</h3>
                    <span className="pill">{orders.length} entradas</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Status</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td>#{o.display_id ?? o.id.slice(0, 6)}</td>
                            <td>
                              <span className={`status-chip ${getOrderStatusClass(o.status)}`}>
                                {o.status ?? "—"}
                              </span>
                            </td>
                            <td>{formatMoney(o.total, o.currency_code)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "promocoes" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Promoções</h1>
                  <p className="muted">
                    Crie preços promocionais simples para aparecerem como ofertas na vitrine.
                  </p>
                </header>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Nova promoção</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Informe o ID da variante e o preço promocional em reais.
                      </p>
                    </div>
                  </div>

                  {promoError && <div className="muted">Erro: {promoError}</div>}

                  <form className="panel grid" onSubmit={createPromotion} style={{ gap: "0.85rem" }}>
                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Título</span>
                      <input
                        value={promoForm.title}
                        onChange={(e) => handlePromoChange("title", e.target.value)}
                        required
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Descrição</span>
                      <input
                        value={promoForm.description}
                        onChange={(e) => handlePromoChange("description", e.target.value)}
                        className="field-input"
                      />
                    </label>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      }}
                    >
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Variante</span>
                        <select
                          value={promoForm.variant_id}
                          onChange={(e) => handlePromoChange("variant_id", e.target.value)}
                          required
                          className="field-input"
                        >
                          <option value="">Selecionar</option>
                          {products.flatMap((product) =>
                            (product.variants || []).map((variant, idx) => ({
                              id: variant.id,
                              label: `${product.title} • ${variant.title || `Variante ${idx + 1}`}`,
                            }))
                          ).map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Preço promocional (R$)</span>
                        <input
                          type="number"
                          value={promoForm.sale_price}
                          onChange={(e) => handlePromoChange("sale_price", e.target.value)}
                          min={0}
                          step="0.01"
                          required
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Moeda</span>
                        <input
                          value={promoForm.currency_code}
                          onChange={(e) => handlePromoChange("currency_code", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Início</span>
                        <input
                          type="datetime-local"
                          value={promoForm.starts_at}
                          onChange={(e) => handlePromoChange("starts_at", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Fim</span>
                        <input
                          type="datetime-local"
                          value={promoForm.ends_at}
                          onChange={(e) => handlePromoChange("ends_at", e.target.value)}
                          className="field-input"
                        />
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Sales Channel (opcional)</span>
                        <select
                          value={promoForm.sales_channel_id}
                          onChange={(e) => handlePromoChange("sales_channel_id", e.target.value)}
                          className="field-input"
                        >
                          <option value="">Todos</option>
                          {salesChannels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name || channel.id}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Região (opcional)</span>
                        <select
                          value={promoForm.region_id}
                          onChange={(e) => handlePromoChange("region_id", e.target.value)}
                          className="field-input"
                        >
                          <option value="">Todas</option>
                          {regions.map((region) => (
                            <option key={region.id} value={region.id}>
                              {region.name || region.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="btn" type="submit" disabled={promoSaving}>
                        {promoSaving ? "Criando..." : "Criar promoção"}
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={resetPromoForm}>
                        Limpar
                      </button>
                    </div>
                  </form>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Vincular canais a estoques</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Associe canais aos locais de estoque para segmentar disponibilidade.
                      </p>
                    </div>
                  </div>

                  {linkError && <div className="muted">Erro: {linkError}</div>}

                  <div
                    className="panel grid"
                    style={{ gap: "0.85rem", marginBottom: "0.5rem" }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      }}
                    >
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Local de estoque</span>
                        <select
                          value={linkForm.stock_location_id}
                          onChange={(e) => updateLinkForm("stock_location_id", e.target.value)}
                          className="field-input"
                        >
                          <option value="">Selecionar</option>
                          {stockLocations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name || location.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid" style={{ gap: "0.35rem" }}>
                        <span className="muted">Canal</span>
                        <select
                          value={linkForm.sales_channel_id}
                          onChange={(e) => updateLinkForm("sales_channel_id", e.target.value)}
                          className="field-input"
                        >
                          <option value="">Selecionar</option>
                          {salesChannels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name || channel.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="btn"
                        type="button"
                        disabled={linkSaving}
                        onClick={() => linkSalesChannel("add")}
                      >
                        {linkSaving ? "Salvando..." : "Vincular"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={linkSaving}
                        onClick={() => linkSalesChannel("remove")}
                      >
                        Remover vínculo
                      </button>
                    </div>
                  </div>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Promoções recentes</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Visualize as promoções ativas e agendadas.
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={promoOnlyActive}
                          onChange={(e) => setPromoOnlyActive(e.target.checked)}
                        />
                        <span className="muted">Ativas ou agendadas</span>
                      </label>
                      <span className="pill">{filteredPromotions.length} registros</span>
                    </div>
                  </div>

                  {priceListsError && <div className="muted">Erro: {priceListsError}</div>}

                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>Status</th>
                          <th>Tipo</th>
                          <th>Regras</th>
                          <th>Início</th>
                          <th>Fim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPromotions.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center" }}>
                              Nenhuma promoção cadastrada.
                            </td>
                          </tr>
                        ) : (
                          filteredPromotions.map((promo) => (
                            <tr key={promo.id}>
                              <td>{promo.title || "Promoção"}</td>
                              <td>
                                <span className={`status-chip ${getPromoStatusClass(promo)}`}>
                                  {getPromoStatusLabel(promo)}
                                </span>
                              </td>
                              <td>{promo.type || "sale"}</td>
                              <td>
                                <div className="rule-tags">
                                  {getPromoRules(promo).map((rule) => (
                                    <span key={`${promo.id}-${rule}`} className="rule-tag">
                                      {rule}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                {promo.starts_at
                                  ? new Date(promo.starts_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                              <td>
                                {promo.ends_at
                                  ? new Date(promo.ends_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "canais" && (
              <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
                <header className="grid" style={{ gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2rem" }}>Canais de vendas</h1>
                  <p className="muted">
                    Crie e organize canais para separar vitrines e promoções.
                  </p>
                </header>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <h3>Novo canal</h3>
                      <p className="muted" style={{ marginTop: "0.25rem" }}>
                        Use canais para segmentar preços e disponibilidade.
                      </p>
                    </div>
                  </div>

                  {channelError && <div className="muted">Erro: {channelError}</div>}

                  <form className="panel grid" onSubmit={createSalesChannel} style={{ gap: "0.85rem" }}>
                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Nome</span>
                      <input
                        value={channelForm.name}
                        onChange={(e) => handleChannelChange("name", e.target.value)}
                        required
                        className="field-input"
                      />
                    </label>

                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Descrição</span>
                      <input
                        value={channelForm.description}
                        onChange={(e) => handleChannelChange("description", e.target.value)}
                        className="field-input"
                      />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={channelForm.is_disabled}
                        onChange={(e) => handleChannelChange("is_disabled", e.target.checked)}
                        className="checkbox"
                      />
                      <span className="muted">Canal desativado</span>
                    </label>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="btn" type="submit" disabled={channelSaving}>
                        {channelSaving ? "Criando..." : "Criar canal"}
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={resetChannelForm}>
                        Limpar
                      </button>
                    </div>
                  </form>
                </section>

                <section className="panel">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3>Canais existentes</h3>
                    <span className="pill">{salesChannels.length} registros</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Descrição</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesChannels.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center" }}>
                              Nenhum canal cadastrado.
                            </td>
                          </tr>
                        ) : (
                          salesChannels.map((channel) => (
                            <tr key={channel.id}>
                              {editingChannelId === channel.id ? (
                                <>
                                  <td>
                                    <input
                                      value={channelEdits[channel.id]?.name || ""}
                                      onChange={(e) =>
                                        updateChannelEdit(channel.id, "name", e.target.value)
                                      }
                                      className="field-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={channelEdits[channel.id]?.description || ""}
                                      onChange={(e) =>
                                        updateChannelEdit(channel.id, "description", e.target.value)
                                      }
                                      className="field-input"
                                    />
                                  </td>
                                  <td>
                                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={channelEdits[channel.id]?.is_disabled || false}
                                        onChange={(e) =>
                                          updateChannelEdit(channel.id, "is_disabled", e.target.checked)
                                        }
                                      />
                                      <span className="muted">Desativado</span>
                                    </label>
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                      <button
                                        className="btn btn-sm"
                                        type="button"
                                        disabled={channelSavingId === channel.id}
                                        onClick={() => saveChannelEdit(channel.id)}
                                      >
                                        {channelSavingId === channel.id ? "Salvando..." : "Salvar"}
                                      </button>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        type="button"
                                        onClick={cancelEditChannel}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{channel.name || channel.id}</td>
                                  <td>{channel.description || "—"}</td>
                                  <td>
                                    <span
                                      className={`status-chip ${
                                        channel.is_disabled ? "default" : "active"
                                      }`}
                                    >
                                      {channel.is_disabled ? "Desativado" : "Ativo"}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      type="button"
                                      onClick={() => startEditChannel(channel)}
                                    >
                                      Editar
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.variant || ""}`.trim()}>
              <strong>{toast.title}</strong>
              {toast.description && <span>{toast.description}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
  const fetchStockLocations = async () => {
    const url =
      `${MEDUSA_URL}/admin/stock-locations?limit=200&fields=` +
      encodeURIComponent("+sales_channels.id,+sales_channels.name")
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível buscar locais de estoque")
    }
    const json = await res.json()
    setStockLocations(json.stock_locations ?? [])
  }
