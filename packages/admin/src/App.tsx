import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react"
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"

import ChannelsSection from "./modules/ChannelsSection"
import DashboardSection from "./modules/DashboardSection"
import NewsSection from "./modules/NewsSection"
import MarketingSection from "./modules/MarketingSection"
import ManufacturersSection from "./modules/ManufacturersSection"
import EmailTemplatesSection from "./modules/EmailTemplatesSection"
import BillingResendSection from "./modules/BillingResendSection"
import EmailLogsSection from "./modules/EmailLogsSection"
import TestPaymentLogsSection from "./modules/TestPaymentLogsSection"
import PixManualPaymentsSection from "./modules/PixManualPaymentsSection"
import OrdersSection from "./modules/OrdersSection"
import PaymentsSection from "./modules/PaymentsSection"
import PendingCondosSection from "./modules/PendingCondosSection"
import ProductsSection from "./modules/ProductsSection"
import DeliveryMethodsSection from "./modules/DeliveryMethodsSection"
import ServiceZonesSection from "./modules/ServiceZonesSection"
import PromotionsSection from "./modules/PromotionsSection"
import PushNotificationsSection from "./modules/PushNotificationsSection"
import StockSection from "./modules/StockSection"
import UsersSection from "./modules/UsersSection"
import BusinessTypesSection from "./modules/BusinessTypesSection"
import PartnersSection from "./modules/PartnersSection"
import AccessManagementSection from "./modules/AccessManagementSection"
import ToastContainer from "./modules/ToastContainer"
import adminAuthBg from "./assets/admin-auth-bg.jpg"
import adminDashboardBg from "./assets/admin-dashboard-bg.jpg"
import logo from "./assets/logo.png"
import {
  AdminCompany,
  AdminAccessProfile,
  AdminSectionDefinition,
  MarketingBanner,
  News,
  Order,
  PendingCompany,
  PriceList,
  Product,
  Region,
  SalesChannel,
  ShippingProfile,
  ShippingOption,
  StoreUser,
  StockLocation,
  SectionId,
  ProfilePermissions,
  UserProfileAssignments,
  BusinessType,
  Manufacturer,
} from "./types"

const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"
const DEFAULT_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@chroma.local"
const DEFAULT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "supersecret"
const TOKEN_STORAGE_KEY = "chroma_admin_token"
const ACCESS_ASSIGNMENTS_STORAGE_KEY = "chroma_admin_profile_assignments"
const ACCESS_PERMISSIONS_STORAGE_KEY = "chroma_admin_profile_permissions"
const ADMIN_EMAIL_STORAGE_KEY = "chroma_admin_email"
const HARDCODED_ADMIN_EMAILS = Array.from(
  new Set(
    [DEFAULT_EMAIL, ...(import.meta.env.VITE_HARDCODED_ADMIN_EMAILS || "").split(",")]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
)
const isAdminEmail = (value: string) => {
  const normalized = normalizeEmail(value)
  return HARDCODED_ADMIN_EMAILS.includes(normalized)
}

type Toast = { id: string; title: string; description?: string; variant?: "success" | "error" }

type DashboardTopProduct = { title: string; quantity: number; revenue: number }

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const parseAssignmentsFromStorage = (): UserProfileAssignments => {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(ACCESS_ASSIGNMENTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}
    const entries = Object.entries(parsed).filter(
      ([key, value]) =>
        typeof key === "string" && (value === "admin" || value === "partner" || value === "support")
    ) as [string, AdminAccessProfile][]
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

const parsePermissionsFromStorage = (): ProfilePermissions => {
  const defaults: ProfilePermissions = { admin: [], partner: [], support: [] }
  if (typeof window === "undefined") return defaults
  try {
    const raw = localStorage.getItem(ACCESS_PERMISSIONS_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return defaults
    const toSectionIdList = (value: unknown): SectionId[] =>
      Array.isArray(value) ? value.filter((entry): entry is SectionId => typeof entry === "string") : []
    return {
      admin: toSectionIdList((parsed as ProfilePermissions).admin),
      partner: toSectionIdList((parsed as ProfilePermissions).partner),
      support: toSectionIdList((parsed as ProfilePermissions).support),
    }
  } catch {
    return defaults
  }
}

export default function App() {
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  })
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return normalizeEmail(localStorage.getItem(ADMIN_EMAIL_STORAGE_KEY) || "")
  })
  const [profileAssignments, setProfileAssignments] = useState<UserProfileAssignments>(() =>
    parseAssignmentsFromStorage()
  )
  const [permissionsByProfile, setPermissionsByProfile] = useState<ProfilePermissions>(() =>
    parsePermissionsFromStorage()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsCount, setProductsCount] = useState(0)
  const [orders, setOrders] = useState<Order[]>([])
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([])
  const [pendingCompaniesError, setPendingCompaniesError] = useState<string | null>(null)
  const [pendingCompanyActionId, setPendingCompanyActionId] = useState<string | null>(null)
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [news, setNews] = useState<News[]>([])
  const [marketingBanners, setMarketingBanners] = useState<MarketingBanner[]>([])
  const [newsError, setNewsError] = useState<string | null>(null)
  const [marketingError, setMarketingError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [priceListsError, setPriceListsError] = useState<string | null>(null)
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([])
  const [storeUsersError, setStoreUsersError] = useState<string | null>(null)
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [businessTypesError, setBusinessTypesError] = useState<string | null>(null)
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [manufacturersError, setManufacturersError] = useState<string | null>(null)
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([])
  const [deliveryMethodsCount, setDeliveryMethodsCount] = useState(0)
  const [serviceZonesCount, setServiceZonesCount] = useState(0)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [dashboardDays, setDashboardDays] = useState<7 | 30 | 90>(7)
  const location = useLocation()
  const navigate = useNavigate()

  const ProductCreateRoute = () => (
    <ProductsSection
      medusaUrl={MEDUSA_URL}
      token={token}
      headers={headers}
      products={products}
      productCount={productsCount}
      setProducts={setProducts}
      setProductsCount={setProductsCount}
      salesChannels={salesChannels}
      shippingOptions={shippingOptions}
      shippingProfiles={shippingProfiles}
      manufacturers={manufacturers}
      stockLocations={stockLocations}
      openOrders={openOrders}
      mode="create"
    />
  )

  const ProductEditRoute = () => {
    const params = useParams()
    return (
      <ProductsSection
        medusaUrl={MEDUSA_URL}
        token={token}
        headers={headers}
        products={products}
        productCount={productsCount}
        setProducts={setProducts}
        setProductsCount={setProductsCount}
        salesChannels={salesChannels}
        shippingOptions={shippingOptions}
        shippingProfiles={shippingProfiles}
        manufacturers={manufacturers}
        stockLocations={stockLocations}
        openOrders={openOrders}
        mode="edit"
        productId={params.productId}
      />
    )
  }

  const ProductDeleteRoute = () => {
    const params = useParams()
    return (
      <ProductsSection
        medusaUrl={MEDUSA_URL}
        token={token}
        headers={headers}
        products={products}
        productCount={productsCount}
        setProducts={setProducts}
        setProductsCount={setProductsCount}
        salesChannels={salesChannels}
        shippingOptions={shippingOptions}
        shippingProfiles={shippingProfiles}
        manufacturers={manufacturers}
        stockLocations={stockLocations}
        openOrders={openOrders}
        mode="delete"
        productId={params.productId}
      />
    )
  }

  const PaymentsEditRoute = () => {
    const params = useParams()
    return (
      <PaymentsSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        companies={companies}
        setCompanies={setCompanies}
        stockLocations={stockLocations}
        mode="edit"
        companyId={params.companyId}
      />
    )
  }

  const OrdersEditRoute = () => {
    const params = useParams()
    return (
      <OrdersSection
        orders={orders}
        medusaUrl={MEDUSA_URL}
        headers={headers}
        onOrderDeleted={handleOrderDeleted}
        mode="edit"
        orderId={params.orderId}
      />
    )
  }

  const PendingCondosReviewRoute = () => {
    const params = useParams()
    return (
      <PendingCondosSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        pendingCompanies={pendingCompanies}
        setPendingCompanies={setPendingCompanies}
        pendingCompaniesError={pendingCompaniesError}
        setPendingCompaniesError={setPendingCompaniesError}
        pendingCompanyActionId={pendingCompanyActionId}
        setPendingCompanyActionId={setPendingCompanyActionId}
        businessTypes={businessTypes}
        mode="review"
        companyId={params.companyId}
      />
    )
  }

  const PendingCompaniesLegacyRoute = () => {
    const params = useParams()
    const target = params.companyId
      ? `/estabelecimentos-pendentes/${params.companyId}`
      : "/estabelecimentos-pendentes"
    return <Navigate to={target} replace />
  }

  const UsersResetRoute = () => {
    const params = useParams()
    return (
      <UsersSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        users={storeUsers}
        setUsers={setStoreUsers}
        usersError={storeUsersError}
        setUsersError={setStoreUsersError}
        businessTypes={businessTypes}
        mode="reset"
        userId={params.userId}
      />
    )
  }

  const UsersStatusRoute = () => {
    const params = useParams()
    return (
      <UsersSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        users={storeUsers}
        setUsers={setStoreUsers}
        usersError={storeUsersError}
        setUsersError={setStoreUsersError}
        businessTypes={businessTypes}
        mode="status"
        userId={params.userId}
      />
    )
  }

  const DeliveryMethodDeleteRoute = () => {
    const params = useParams()
    return (
      <DeliveryMethodsSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        regions={regions}
        onCountChange={setDeliveryMethodsCount}
        mode="delete"
        optionId={params.optionId}
      />
    )
  }

  const ServiceZoneDeleteRoute = () => {
    const params = useParams()
    return (
      <ServiceZonesSection
        medusaUrl={MEDUSA_URL}
        headers={headers}
        onCountChange={setServiceZonesCount}
        mode="delete"
        zoneId={params.zoneId}
      />
    )
  }

  const BusinessTypeEditRoute = () => {
    const params = useParams()
    return (
      <BusinessTypesSection
        medusaUrl={MEDUSA_URL}
        token={token}
        headers={headers}
        businessTypes={businessTypes}
        setBusinessTypes={setBusinessTypes}
        businessTypesError={businessTypesError}
        setBusinessTypesError={setBusinessTypesError}
        mode="edit"
        businessTypeId={params.businessTypeId}
      />
    )
  }

  const BusinessTypeDeleteRoute = () => {
    const params = useParams()
    return (
      <BusinessTypesSection
        medusaUrl={MEDUSA_URL}
        token={token}
        headers={headers}
        businessTypes={businessTypes}
        setBusinessTypes={setBusinessTypes}
        businessTypesError={businessTypesError}
        setBusinessTypesError={setBusinessTypesError}
        mode="delete"
        businessTypeId={params.businessTypeId}
      />
    )
  }

  const sections = useMemo<AdminSectionDefinition[]>(
    () => [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", count: orders.length },
      { id: "noticias", label: "Notícias", path: "/noticias", count: news.length },
      { id: "marketing", label: "Marketing", path: "/marketing", count: marketingBanners.length },
      { id: "emails", label: "E-mails", path: "/emails", count: 0 },
      { id: "cobrancas", label: "Reenvio cobranças", path: "/cobrancas", count: 0 },
      { id: "email-logs", label: "Histórico e-mails", path: "/email-logs", count: 0 },
      { id: "test-payment-logs", label: "Logs pagamento teste", path: "/test-payment-logs", count: 0 },
      { id: "pix-manual", label: "PIX manual", path: "/pix-manual", count: 0 },
      { id: "pagamentos", label: "Pagamentos", path: "/pagamentos", count: 0 },
      { id: "push", label: "Push", path: "/push", count: 0 },
      {
        id: "estabelecimentos-pendentes",
        label: "Estabelecimentos pendentes",
        path: "/estabelecimentos-pendentes",
        count: pendingCompanies.length,
      },
      { id: "parceiros", label: "Parceiros", path: "/parceiros", count: companies.length },
      { id: "produtos", label: "Produtos", path: "/produtos", count: productsCount },
      { id: "fabricantes", label: "Fabricantes", path: "/fabricantes", count: manufacturers.length },
      { id: "entregas", label: "Formas de entrega", path: "/entregas", count: deliveryMethodsCount },
      { id: "zonas-servico", label: "Zonas de serviço", path: "/zonas-servico", count: serviceZonesCount },
      { id: "estoque", label: "Estoque", path: "/estoque", count: stockLocations.length },
      { id: "pedidos", label: "Pedidos", path: "/pedidos", count: orders.length },
      { id: "promocoes", label: "Promoções", path: "/promocoes", count: priceLists.length },
      { id: "canais", label: "Canais de vendas", path: "/canais", count: salesChannels.length },
      { id: "usuarios", label: "Usuários", path: "/usuarios", count: storeUsers.length },
      {
        id: "tipos-negocio",
        label: "Tipos de negócio",
        path: "/tipos-negocio",
        count: businessTypes.length,
      },
      { id: "acessos", label: "Gestão de acessos", path: "/acessos", count: 0 },
    ],
    [
      marketingBanners.length,
      news.length,
      orders.length,
      pendingCompanies.length,
      priceLists.length,
      productsCount,
      deliveryMethodsCount,
      serviceZonesCount,
      salesChannels.length,
      stockLocations.length,
      storeUsers.length,
      businessTypes.length,
      manufacturers.length,
      companies.length,
    ]
  )

  const isHardcodedAdmin = useMemo(
    () => isAdminEmail(currentUserEmail),
    [currentUserEmail]
  )

  const currentProfile = useMemo<AdminAccessProfile>(() => {
    const normalizedEmail = normalizeEmail(currentUserEmail)
    if (isAdminEmail(normalizedEmail)) return "admin"
    return profileAssignments[normalizedEmail] || "support"
  }, [currentUserEmail, profileAssignments])

  const permittedSections = useMemo(() => {
    if (currentProfile === "admin" || isHardcodedAdmin) {
      return new Set<SectionId>(sections.map((section) => section.id))
    }
    return new Set<SectionId>(permissionsByProfile[currentProfile])
  }, [currentProfile, isHardcodedAdmin, sections, permissionsByProfile])

  const hasSectionAccess = (sectionId: SectionId) => {
    if (currentProfile === "admin" || isHardcodedAdmin) return true
    return permittedSections.has(sectionId)
  }

  const getSectionLabel = (sectionId: SectionId) =>
    sections.find((section) => section.id === sectionId)?.label || "Módulo"

  const accessibleSections = useMemo(
    () => sections.filter((section) => hasSectionAccess(section.id)),
    [sections, currentProfile, isHardcodedAdmin, permittedSections]
  )

  const defaultPath = accessibleSections[0]?.path || "/sem-acesso"

  const sectionById = useMemo(() => {
    const map = new Map<string, (typeof sections)[number]>()
    sections.forEach((section) => map.set(section.id, section))
    return map
  }, [sections])

  const navGroups = useMemo(
    () => [
      {
        label: "Comercial",
        items: ["dashboard", "pedidos", "produtos"]
          .map((id) => sectionById.get(id))
          .filter((item) => item && hasSectionAccess(item.id))
          .filter(Boolean),
      },
      {
        label: "Marketing",
        items: ["noticias", "marketing", "promocoes", "push"]
          .map((id) => sectionById.get(id))
          .filter((item) => item && hasSectionAccess(item.id))
          .filter(Boolean),
      },
      {
        label: "Financeiro",
        items: ["pagamentos", "cobrancas", "pix-manual", "test-payment-logs"]
          .map((id) => sectionById.get(id))
          .filter((item) => item && hasSectionAccess(item.id))
          .filter(Boolean),
      },
      {
        label: "Operações",
        items: ["estoque", "entregas", "zonas-servico"]
          .map((id) => sectionById.get(id))
          .filter((item) => item && hasSectionAccess(item.id))
          .filter(Boolean),
      },
      {
        label: "Configurações",
        items: [
          "estabelecimentos-pendentes",
          "parceiros",
          "canais",
          "usuarios",
          "tipos-negocio",
          "fabricantes",
          "emails",
          "email-logs",
          "acessos",
        ]
          .map((id) => sectionById.get(id))
          .filter((item) => item && hasSectionAccess(item.id))
          .filter(Boolean),
      },
    ],
    [sectionById, currentProfile, isHardcodedAdmin, permittedSections]
  )

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  )

  const handleOrderDeleted = (orderId: string) => {
    setOrders((current) => current.filter((order) => order.id !== orderId))
  }

  const handleUpsertProfileAssignment = (emailInput: string, profile: AdminAccessProfile) => {
    const normalized = normalizeEmail(emailInput)
    if (!normalized) return
    setProfileAssignments((current) => ({ ...current, [normalized]: profile }))
  }

  const handleRemoveProfileAssignment = (emailInput: string) => {
    const normalized = normalizeEmail(emailInput)
    setProfileAssignments((current) => {
      if (!(normalized in current)) return current
      const next = { ...current }
      delete next[normalized]
      return next
    })
  }

  const handleTogglePermission = (
    profile: Exclude<AdminAccessProfile, "admin">,
    sectionId: SectionId
  ) => {
    setPermissionsByProfile((current) => {
      const currentItems = current[profile]
      const exists = currentItems.includes(sectionId)
      const nextItems = exists
        ? currentItems.filter((item) => item !== sectionId)
        : [...currentItems, sectionId]
      return { ...current, [profile]: nextItems }
    })
  }

  const handleResetRestrictedProfiles = () => {
    setPermissionsByProfile((current) => ({
      ...current,
      partner: [],
      support: [],
    }))
  }

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
      setCurrentUserEmail(normalizeEmail(email))
      setToken(accessToken)
    } catch (err: any) {
      setError(err?.message || "Erro ao autenticar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setToken(null)
    setCurrentUserEmail("")
    setError("Sessão finalizada. Entre novamente.")
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [token])

  useEffect(() => {
    if (typeof window === "undefined") return
    const normalized = normalizeEmail(currentUserEmail)
    if (normalized) {
      localStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, normalized)
    } else {
      localStorage.removeItem(ADMIN_EMAIL_STORAGE_KEY)
    }
  }, [currentUserEmail])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(ACCESS_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(profileAssignments))
  }, [profileAssignments])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(ACCESS_PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionsByProfile))
  }, [permissionsByProfile])

  useEffect(() => {
    if (!token) return
    if (!currentUserEmail) {
      setToken(null)
      setError("Sessão sem identificação. Entre novamente.")
      return
    }
    if (location.pathname === "/" || location.pathname === "") {
      navigate(defaultPath, { replace: true })
    }
  }, [token, location.pathname, navigate, currentUserEmail, defaultPath])

  useEffect(() => {
    if (!token) return

    const load = async () => {
      try {
        const stockLocationsUrl =
          `${MEDUSA_URL}/admin/stock-locations?limit=200&fields=` +
          encodeURIComponent("+sales_channels.id,+sales_channels.name")
        const ordersFields = encodeURIComponent(
          "+items.quantity,+items.title,+items.product_id,+created_at,+total,+currency_code,+status,+payment_status,+fulfillment_status,+display_id,+metadata"
        )
        const productFields = encodeURIComponent(
          "+variants.inventory_quantity,+variants.prices,+variants.title,+variants.id,+variants.sku,+metadata,+shipping_profile_id"
        )
        const [
          productsRes,
          ordersRes,
          companiesRes,
          newsRes,
          marketingRes,
          allCompaniesRes,
          priceListsRes,
          storeUsersRes,
          businessTypesRes,
          manufacturersRes,
          salesChannelsRes,
          regionsRes,
          stockLocationsRes,
          shippingOptionsRes,
          shippingProfilesRes,
        ] = await Promise.all([
          fetch(`${MEDUSA_URL}/admin/products?limit=50&fields=${productFields}`, { headers }),
          fetch(`${MEDUSA_URL}/admin/orders?limit=50&fields=${ordersFields}`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies/pending`, { headers }),
          fetch(`${MEDUSA_URL}/admin/news?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/marketing-banners?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies?limit=500`, { headers }),
          fetch(`${MEDUSA_URL}/admin/price-lists?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/store-users?limit=500`, { headers }),
          fetch(`${MEDUSA_URL}/admin/business-types`, { headers }),
          fetch(`${MEDUSA_URL}/admin/manufacturers?limit=300`, { headers }),
          fetch(`${MEDUSA_URL}/admin/sales-channels?limit=200`, { headers }),
          fetch(`${MEDUSA_URL}/admin/regions?limit=200`, { headers }),
          fetch(stockLocationsUrl, { headers }),
          fetch(
            `${MEDUSA_URL}/admin/shipping-options?limit=200&fields=${encodeURIComponent(
              "+name,+shipping_profile.name,+shipping_profile_id,+service_zone.name"
            )}`,
            { headers }
          ),
          fetch(`${MEDUSA_URL}/admin/shipping-profiles?limit=200`, { headers }),
        ])

        const responses = [
          productsRes,
          ordersRes,
          companiesRes,
          newsRes,
          marketingRes,
          allCompaniesRes,
          priceListsRes,
          storeUsersRes,
          businessTypesRes,
          manufacturersRes,
          salesChannelsRes,
          regionsRes,
          stockLocationsRes,
          shippingOptionsRes,
          shippingProfilesRes,
        ]

        if (responses.some((res) => res.status === 401)) {
          setToken(null)
          setError("Sessão expirada. Entre novamente.")
          return
        }

        if (productsRes.ok) {
          const json = await productsRes.json()
          setProducts(json.products ?? [])
          setProductsCount(Number(json.count ?? json.products?.length ?? 0))
        }
        if (ordersRes.ok) {
          const json = await ordersRes.json()
          const rawOrders = json.orders ?? []
          const mappedOrders = rawOrders.map((order: any) => {
            const manualFulfillmentStatus = order?.metadata?.manual_fulfillment_status
            if (!manualFulfillmentStatus) return order
            return { ...order, fulfillment_status: manualFulfillmentStatus }
          })
          setOrders(mappedOrders)
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

        if (marketingRes.ok) {
          const json = await marketingRes.json()
          setMarketingBanners(json.banners ?? [])
          setMarketingError(null)
        } else {
          const body = await marketingRes.text()
          setMarketingError(body || "Não foi possível buscar banners")
        }

        if (allCompaniesRes.ok) {
          const json = await allCompaniesRes.json()
          const items = json.companies ?? []
          setCompanies(items)
        } else {
          const body = await allCompaniesRes.text()
          setCatalogError(body || "Não foi possível buscar empresas")
        }

        if (priceListsRes.ok) {
          const json = await priceListsRes.json()
          setPriceLists(json.price_lists ?? [])
          setPriceListsError(null)
        } else {
          const body = await priceListsRes.text()
          setPriceListsError(body || "Não foi possível buscar promoções")
        }

        if (storeUsersRes.ok) {
          const json = await storeUsersRes.json()
          setStoreUsers(json.users ?? [])
          setStoreUsersError(null)
        } else {
          const body = await storeUsersRes.text()
          setStoreUsersError(body || "Não foi possível buscar usuários")
        }

        if (businessTypesRes.ok) {
          const json = await businessTypesRes.json()
          setBusinessTypes(json.business_types ?? [])
          setBusinessTypesError(null)
        } else {
          const body = await businessTypesRes.text()
          setBusinessTypesError(body || "Não foi possível buscar tipos de negócio")
        }

        if (manufacturersRes.ok) {
          const json = await manufacturersRes.json()
          setManufacturers(json.manufacturers ?? [])
          setManufacturersError(null)
        } else {
          const body = await manufacturersRes.text()
          setManufacturersError(body || "Não foi possível buscar fabricantes")
        }

        if (salesChannelsRes.ok) {
          const json = await salesChannelsRes.json()
          setSalesChannels(json.sales_channels ?? json.salesChannels ?? [])
          setCatalogError(null)
        } else if (salesChannelsRes.status === 403) {
          // Some admin users may not have explicit sales-channel permission.
          // Keep the dashboard usable without surfacing a hard catalog error.
          setSalesChannels([])
          setCatalogError(null)
        } else {
          let fallbackLoaded = false
          try {
            const fallbackRes = await fetch(
              `${MEDUSA_URL}/admin/sales-channels?limit=200&fields=${encodeURIComponent("+id,+name,+description,+is_disabled")}`,
              { headers }
            )
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json()
              setSalesChannels(fallbackJson.sales_channels ?? fallbackJson.salesChannels ?? [])
              setCatalogError(null)
              fallbackLoaded = true
            }
          } catch {
            // handled below
          }

          if (!fallbackLoaded) {
            const body = await salesChannelsRes.text()
            setCatalogError(body || "Não foi possível buscar sales channels")
          }
        }

        if (regionsRes.ok) {
          const json = await regionsRes.json()
          setRegions(json.regions ?? [])
        }

        if (stockLocationsRes.ok) {
          const json = await stockLocationsRes.json()
          setStockLocations(json.stock_locations ?? [])
        }
        if (shippingOptionsRes.ok) {
          const json = await shippingOptionsRes.json()
          const options = json.shipping_options ?? []
          setShippingOptions(options)
          setDeliveryMethodsCount(options.length)
        }
        if (shippingProfilesRes.ok) {
          const json = await shippingProfilesRes.json()
          setShippingProfiles(json.shipping_profiles ?? [])
        }
      } catch (err) {
        console.error("Erro ao buscar dados", err)
        setPendingCompaniesError("Erro ao buscar empresas pendentes")
        setNewsError("Erro ao buscar notícias")
        setMarketingError("Erro ao buscar banners")
        setPriceListsError("Erro ao buscar promoções")
        setStoreUsersError("Erro ao buscar usuários")
        setManufacturersError("Erro ao buscar fabricantes")
        setCatalogError("Erro ao buscar dados de catálogo")
      }
    }

    load()
  }, [token, headers])

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
  const topProducts: DashboardTopProduct[] = (() => {
    const map = new Map<string, DashboardTopProduct>()
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

  const getOrderStatusClass = (status?: string) => {
    if (!status) return "default"
    if (status === "completed") return "active"
    if (status === "canceled" || status === "requires_action") return "scheduled"
    if (status === "pending" || status === "processing") return "scheduled"
    return "default"
  }

  const pushToast = (toast: { title: string; description?: string; variant?: "success" | "error" }) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, ...toast }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3500)
  }

  const loginBackgroundStyle: CSSProperties = {
    backgroundImage: `linear-gradient(180deg, hsl(213 29% 6% / 0.95) 0%, hsl(217 24% 11% / 0.9) 55%, hsl(213 29% 6% / 0.98) 100%), url(${adminAuthBg})`,
  }

  const appBackgroundStyle: CSSProperties = {
    backgroundImage: `linear-gradient(160deg, hsl(213 29% 6% / 0.94) 0%, hsl(217 24% 11% / 0.88) 45%, hsl(213 29% 6% / 0.98) 100%), url(${adminDashboardBg})`,
  }

  const AccessDeniedSection = ({ sectionId }: { sectionId: SectionId }) => (
    <section className="panel grid" style={{ gap: "0.75rem" }}>
      <h1 className="page-title" style={{ fontSize: "1.5rem" }}>
        Acesso negado
      </h1>
      <p className="muted">
        Seu perfil <strong>{currentProfile}</strong> não possui permissão para o módulo{" "}
        <strong>{getSectionLabel(sectionId)}</strong>.
      </p>
      <p className="muted">Solicite liberação para um administrador.</p>
    </section>
  )

  const NoAccessSection = () => (
    <section className="panel grid" style={{ gap: "0.75rem" }}>
      <h1 className="page-title" style={{ fontSize: "1.5rem" }}>
        Sem modulos liberados
      </h1>
      <p className="muted">
        Seu perfil <strong>{currentProfile}</strong> está totalmente restrito no momento.
      </p>
      <p className="muted">Peça ao administrador para habilitar seus acessos.</p>
    </section>
  )

  const sectionPathMatchers: Array<{ prefix: string; sectionId: SectionId }> = [
    { prefix: "/dashboard", sectionId: "dashboard" },
    { prefix: "/noticias", sectionId: "noticias" },
    { prefix: "/marketing", sectionId: "marketing" },
    { prefix: "/emails", sectionId: "emails" },
    { prefix: "/cobrancas", sectionId: "cobrancas" },
    { prefix: "/email-logs", sectionId: "email-logs" },
    { prefix: "/test-payment-logs", sectionId: "test-payment-logs" },
    { prefix: "/pix-manual", sectionId: "pix-manual" },
    { prefix: "/pagamentos", sectionId: "pagamentos" },
    { prefix: "/estabelecimentos-pendentes", sectionId: "estabelecimentos-pendentes" },
    { prefix: "/condominios-pendentes", sectionId: "estabelecimentos-pendentes" },
    { prefix: "/parceiros", sectionId: "parceiros" },
    { prefix: "/fabricantes", sectionId: "fabricantes" },
    { prefix: "/produtos", sectionId: "produtos" },
    { prefix: "/entregas", sectionId: "entregas" },
    { prefix: "/zonas-servico", sectionId: "zonas-servico" },
    { prefix: "/push", sectionId: "push" },
    { prefix: "/estoque", sectionId: "estoque" },
    { prefix: "/pedidos", sectionId: "pedidos" },
    { prefix: "/promocoes", sectionId: "promocoes" },
    { prefix: "/canais", sectionId: "canais" },
    { prefix: "/usuarios", sectionId: "usuarios" },
    { prefix: "/tipos-negocio", sectionId: "tipos-negocio" },
    { prefix: "/acessos", sectionId: "acessos" },
  ]

  const blockedSection = useMemo(() => {
    const match = sectionPathMatchers.find((item) =>
      location.pathname === item.prefix || location.pathname.startsWith(`${item.prefix}/`)
    )
    if (!match) return null
    return hasSectionAccess(match.sectionId) ? null : match.sectionId
  }, [location.pathname, currentProfile, isHardcodedAdmin, permittedSections])

  return (
    <>
      {!token ? (
        <div className="page-background" style={loginBackgroundStyle}>
          <div className="layout login-layout" data-testid="admin-login">
            <header className="panel login-intro">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <img src={logo} alt="Chroma" style={{ width: "32px", height: "32px" }} />
                <span className="pill">Chroma Admin</span>
              </div>
              <h1>Painel da operação</h1>
              <p className="muted">
                Gerencie produtos, estoque, parceiros e pedidos em um único lugar.
              </p>
              <p className="muted">
                Entre com o seu e-mail corporativo para continuar.
              </p>
            </header>

            <form className="panel grid login-form" onSubmit={login}>
              <h2>Entrar</h2>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">E-mail</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="field-input"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  data-testid="admin-email"
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
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  data-testid="admin-password"
                />
              </label>

              {error && <div className="login-error">Não foi possível entrar: {error}</div>}

              <button className="btn" type="submit" disabled={isLoading} data-testid="admin-submit">
                {isLoading ? "Autenticando..." : "Acessar painel"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="page-background" style={appBackgroundStyle}>
          <div className="app-shell">
            <aside className="sidebar">
              <div className="grid" style={{ gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img src={logo} alt="Chroma" style={{ width: "28px", height: "28px" }} />
                  <span className="pill">Chroma Admin</span>
                </div>
                <h2>Painel da operação</h2>
                <span className="muted" style={{ fontSize: "0.9rem" }}>
                  {currentUserEmail || "sem usuário"} · perfil {currentProfile}
                </span>
              </div>
              <nav className="nav">
                {navGroups.filter((group) => group.items.length > 0).map((group) => (
                  <div key={group.label} style={{ marginTop: "0.75rem" }}>
                    <span
                      className="muted"
                      style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
                    >
                      {group.label}
                    </span>
                    <div className="grid" style={{ gap: "0.35rem", marginTop: "0.35rem" }}>
                      {group.items.map((item) => (
                        <NavLink
                          key={item!.id}
                          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                          to={item!.path}
                          data-testid={`admin-nav-${item!.id}`}
                        >
                          <span>{item!.label}</span>
                          <span className="nav-badge">{item!.count}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <button className="btn btn-secondary" type="button" onClick={handleLogout}>
                Sair
              </button>
            </aside>

            <main className="content">
              {catalogError && (
                <div className="panel" style={{ marginBottom: "1rem" }}>
                  <span className="muted">Erro: {catalogError}</span>
                </div>
              )}
              {blockedSection ? (
                <AccessDeniedSection sectionId={blockedSection} />
              ) : (
                <Routes>
                <Route path="/" element={<Navigate to={defaultPath} replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <DashboardSection
                      orders={orders}
                      dashboardDays={dashboardDays}
                      onChangeDays={setDashboardDays}
                      totalSales={totalSales}
                      averageTicket={averageTicket}
                      openOrders={openOrders}
                      itemsPurchased={itemsPurchased}
                      productsCount={productsCount}
                      pendingCompaniesCount={pendingCompanies.length}
                      dashboardOrdersCount={dashboardOrders.length}
                      recentOrders={recentOrders}
                      revenueSeries={revenueSeries}
                      revenueMax={revenueMax}
                      topProducts={topProducts}
                      getOrderStatusClass={getOrderStatusClass}
                    />
                  }
                />
                <Route
                  path="/pagamentos"
                  element={
                    <PaymentsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      companies={companies}
                      setCompanies={setCompanies}
                      stockLocations={stockLocations}
                    />
                  }
                />
                <Route path="/pagamentos/:companyId" element={<PaymentsEditRoute />} />
                <Route
                  path="/estabelecimentos-pendentes"
                  element={
                    <PendingCondosSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pendingCompanies={pendingCompanies}
                      setPendingCompanies={setPendingCompanies}
                      pendingCompaniesError={pendingCompaniesError}
                      setPendingCompaniesError={setPendingCompaniesError}
                      pendingCompanyActionId={pendingCompanyActionId}
                      setPendingCompanyActionId={setPendingCompanyActionId}
                      businessTypes={businessTypes}
                    />
                  }
                />
                <Route
                  path="/estabelecimentos-pendentes/:companyId"
                  element={<PendingCondosReviewRoute />}
                />
                <Route
                  path="/condominios-pendentes"
                  element={<PendingCompaniesLegacyRoute />}
                />
                <Route
                  path="/condominios-pendentes/:companyId"
                  element={<PendingCompaniesLegacyRoute />}
                />
                <Route
                  path="/parceiros"
                  element={
                    <PartnersSection
                      companies={companies}
                      storeUsers={storeUsers}
                      businessTypes={businessTypes}
                    />
                  }
                />
                <Route
                  path="/parceiros/:companyId"
                  element={
                    <PartnersSection
                      companies={companies}
                      storeUsers={storeUsers}
                      businessTypes={businessTypes}
                      mode="detail"
                    />
                  }
                />
                <Route
                  path="/noticias"
                  element={
                    <NewsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      news={news}
                      setNews={setNews}
                      newsError={newsError}
                      setNewsError={setNewsError}
                      pushToast={pushToast}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/noticias/nova"
                  element={
                    <NewsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      news={news}
                      setNews={setNews}
                      newsError={newsError}
                      setNewsError={setNewsError}
                      pushToast={pushToast}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/noticias/:newsId"
                  element={
                    <NewsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      news={news}
                      setNews={setNews}
                      newsError={newsError}
                      setNewsError={setNewsError}
                      pushToast={pushToast}
                      mode="edit"
                    />
                  }
                />
                <Route
                  path="/noticias/:newsId/excluir"
                  element={
                    <NewsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      news={news}
                      setNews={setNews}
                      newsError={newsError}
                      setNewsError={setNewsError}
                      pushToast={pushToast}
                      mode="delete"
                    />
                  }
                />
                <Route
                  path="/marketing"
                  element={
                    <MarketingSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      manufacturers={manufacturers}
                      banners={marketingBanners}
                      setBanners={setMarketingBanners}
                      bannersError={marketingError}
                      setBannersError={setMarketingError}
                      pushToast={pushToast}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/marketing/novo"
                  element={
                    <MarketingSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      manufacturers={manufacturers}
                      banners={marketingBanners}
                      setBanners={setMarketingBanners}
                      bannersError={marketingError}
                      setBannersError={setMarketingError}
                      pushToast={pushToast}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/marketing/:bannerId"
                  element={
                    <MarketingSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      manufacturers={manufacturers}
                      banners={marketingBanners}
                      setBanners={setMarketingBanners}
                      bannersError={marketingError}
                      setBannersError={setMarketingError}
                      pushToast={pushToast}
                      mode="edit"
                    />
                  }
                />
                <Route
                  path="/marketing/:bannerId/excluir"
                  element={
                    <MarketingSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      manufacturers={manufacturers}
                      banners={marketingBanners}
                      setBanners={setMarketingBanners}
                      bannersError={marketingError}
                      setBannersError={setMarketingError}
                      pushToast={pushToast}
                      mode="delete"
                    />
                  }
                />
                <Route
                  path="/emails"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/emails/novo"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/emails/bootstrap"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="bootstrap"
                    />
                  }
                />
                <Route
                  path="/emails/:templateId"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="edit"
                    />
                  }
                />
                <Route
                  path="/emails/:templateId/publicar"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="publish"
                    />
                  }
                />
                <Route
                  path="/emails/:templateId/excluir"
                  element={
                    <EmailTemplatesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      pushToast={pushToast}
                      mode="delete"
                    />
                  }
                />
                <Route
                  path="/cobrancas"
                  element={
                    <BillingResendSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                    />
                  }
                />
                <Route
                  path="/email-logs"
                  element={
                    <EmailLogsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                    />
                  }
                />
                <Route
                  path="/email-logs/reenviar"
                  element={
                    <EmailLogsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                      mode="resend"
                    />
                  }
                />
                <Route
                  path="/test-payment-logs"
                  element={
                    <TestPaymentLogsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      pushToast={pushToast}
                    />
                  }
                />
                <Route
                  path="/pix-manual"
                  element={
                    <PixManualPaymentsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                    />
                  }
                />
                <Route
                  path="/pix-manual/confirmar"
                  element={
                    <PixManualPaymentsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                      mode="confirm"
                    />
                  }
                />
                <Route
                  path="/fabricantes"
                  element={
                    <ManufacturersSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      manufacturers={manufacturers}
                      setManufacturers={setManufacturers}
                      manufacturersError={manufacturersError}
                      setManufacturersError={setManufacturersError}
                    />
                  }
                />
                <Route
                  path="/produtos"
                  element={
                    <ProductsSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      products={products}
                      productCount={productsCount}
                      setProducts={setProducts}
                      setProductsCount={setProductsCount}
                      salesChannels={salesChannels}
                      shippingOptions={shippingOptions}
                      shippingProfiles={shippingProfiles}
                      manufacturers={manufacturers}
                      stockLocations={stockLocations}
                      openOrders={openOrders}
                      mode="list"
                    />
                  }
                />
                <Route path="/produtos/novo" element={<ProductCreateRoute />} />
                <Route path="/produtos/:productId" element={<ProductEditRoute />} />
                <Route path="/produtos/:productId/excluir" element={<ProductDeleteRoute />} />
                <Route
                  path="/entregas"
                  element={
                    <DeliveryMethodsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      regions={regions}
                      onCountChange={setDeliveryMethodsCount}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/entregas/nova"
                  element={
                    <DeliveryMethodsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      regions={regions}
                      onCountChange={setDeliveryMethodsCount}
                      mode="create"
                    />
                  }
                />
                <Route path="/entregas/:optionId/excluir" element={<DeliveryMethodDeleteRoute />} />
                <Route
                  path="/zonas-servico"
                  element={
                    <ServiceZonesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      onCountChange={setServiceZonesCount}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/zonas-servico/nova"
                  element={
                    <ServiceZonesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      onCountChange={setServiceZonesCount}
                      mode="zone"
                    />
                  }
                />
                <Route
                  path="/zonas-servico/fulfillment"
                  element={
                    <ServiceZonesSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      onCountChange={setServiceZonesCount}
                      mode="fulfillment"
                    />
                  }
                />
                <Route path="/zonas-servico/:zoneId/excluir" element={<ServiceZoneDeleteRoute />} />
                <Route
                  path="/push"
                  element={
                    <PushNotificationsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                    />
                  }
                />
                <Route
                  path="/push/reenviar"
                  element={
                    <PushNotificationsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                      mode="resend"
                    />
                  }
                />
                <Route
                  path="/push/nova"
                  element={
                    <PushNotificationsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      companies={companies}
                      pushToast={pushToast}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/estoque"
                  element={
                    <StockSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      stockLocations={stockLocations}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/estoque/adicionar"
                  element={
                    <StockSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      stockLocations={stockLocations}
                      mode="action"
                      actionType="add"
                    />
                  }
                />
                <Route
                  path="/estoque/remover"
                  element={
                    <StockSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      stockLocations={stockLocations}
                      mode="action"
                      actionType="remove"
                    />
                  }
                />
                <Route
                  path="/estoque/transferir"
                  element={
                    <StockSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      stockLocations={stockLocations}
                      mode="action"
                      actionType="transfer"
                    />
                  }
                />
                <Route
                  path="/estoque/excluir"
                  element={
                    <StockSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      stockLocations={stockLocations}
                      mode="action"
                      actionType="delete"
                    />
                  }
                />
                <Route
                  path="/pedidos"
                  element={
                    <OrdersSection
                      orders={orders}
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      onOrderDeleted={handleOrderDeleted}
                    />
                  }
                />
                <Route path="/pedidos/:orderId" element={<OrdersEditRoute />} />
                <Route
                  path="/promocoes"
                  element={
                    <PromotionsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      salesChannels={salesChannels}
                      regions={regions}
                      priceLists={priceLists}
                      priceListsError={priceListsError}
                      setPriceLists={setPriceLists}
                      stockLocations={stockLocations}
                      setStockLocations={setStockLocations}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/promocoes/nova"
                  element={
                    <PromotionsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      salesChannels={salesChannels}
                      regions={regions}
                      priceLists={priceLists}
                      priceListsError={priceListsError}
                      setPriceLists={setPriceLists}
                      stockLocations={stockLocations}
                      setStockLocations={setStockLocations}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/promocoes/vinculos"
                  element={
                    <PromotionsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      products={products}
                      salesChannels={salesChannels}
                      regions={regions}
                      priceLists={priceLists}
                      priceListsError={priceListsError}
                      setPriceLists={setPriceLists}
                      stockLocations={stockLocations}
                      setStockLocations={setStockLocations}
                      mode="link"
                    />
                  }
                />
                <Route
                  path="/canais"
                  element={
                    <ChannelsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      salesChannels={salesChannels}
                      setSalesChannels={setSalesChannels}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/canais/novo"
                  element={
                    <ChannelsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      salesChannels={salesChannels}
                      setSalesChannels={setSalesChannels}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/canais/:channelId"
                  element={
                    <ChannelsSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      salesChannels={salesChannels}
                      setSalesChannels={setSalesChannels}
                      mode="edit"
                    />
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <UsersSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      setUsers={setStoreUsers}
                      usersError={storeUsersError}
                      setUsersError={setStoreUsersError}
                      businessTypes={businessTypes}
                      mode="list"
                    />
                  }
                />
                <Route
                  path="/usuarios/novo"
                  element={
                    <UsersSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      setUsers={setStoreUsers}
                      usersError={storeUsersError}
                      setUsersError={setStoreUsersError}
                      businessTypes={businessTypes}
                      mode="create"
                    />
                  }
                />
                <Route
                  path="/usuarios/:userId"
                  element={
                    <UsersSection
                      medusaUrl={MEDUSA_URL}
                      headers={headers}
                      users={storeUsers}
                      setUsers={setStoreUsers}
                      usersError={storeUsersError}
                      setUsersError={setStoreUsersError}
                      businessTypes={businessTypes}
                      mode="actions"
                    />
                  }
                />
                <Route
                  path="/tipos-negocio"
                  element={
                    <BusinessTypesSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      businessTypes={businessTypes}
                      setBusinessTypes={setBusinessTypes}
                      businessTypesError={businessTypesError}
                      setBusinessTypesError={setBusinessTypesError}
                    />
                  }
                />
                <Route
                  path="/tipos-negocio/novo"
                  element={
                    <BusinessTypesSection
                      medusaUrl={MEDUSA_URL}
                      token={token}
                      headers={headers}
                      businessTypes={businessTypes}
                      setBusinessTypes={setBusinessTypes}
                      businessTypesError={businessTypesError}
                      setBusinessTypesError={setBusinessTypesError}
                      mode="create"
                    />
                  }
                />
                <Route path="/tipos-negocio/:businessTypeId" element={<BusinessTypeEditRoute />} />
                <Route path="/tipos-negocio/:businessTypeId/excluir" element={<BusinessTypeDeleteRoute />} />
                <Route path="/usuarios/:userId/resetar-senha" element={<UsersResetRoute />} />
                <Route path="/usuarios/:userId/status" element={<UsersStatusRoute />} />
                <Route path="/acessos" element={<AccessManagementSection
                  currentUserEmail={currentUserEmail}
                  hardcodedAdminEmails={HARDCODED_ADMIN_EMAILS}
                  sections={sections}
                  profileAssignments={profileAssignments}
                  permissionsByProfile={permissionsByProfile}
                  onUpsertAssignment={handleUpsertProfileAssignment}
                  onRemoveAssignment={handleRemoveProfileAssignment}
                  onTogglePermission={handleTogglePermission}
                  onResetRestrictedProfiles={handleResetRestrictedProfiles}
                />} />
                <Route path="/sem-acesso" element={<NoAccessSection />} />
                <Route path="*" element={<Navigate to={defaultPath} replace />} />
              </Routes>
              )}
            </main>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}
