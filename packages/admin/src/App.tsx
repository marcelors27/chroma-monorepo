import { FormEvent, useEffect, useMemo, useState } from "react"

import ChannelsSection from "./modules/ChannelsSection"
import DashboardSection from "./modules/DashboardSection"
import NewsSection from "./modules/NewsSection"
import OrdersSection from "./modules/OrdersSection"
import PaymentsSection from "./modules/PaymentsSection"
import ProductsSection from "./modules/ProductsSection"
import PromotionsSection from "./modules/PromotionsSection"
import StockSection from "./modules/StockSection"
import UsersSection from "./modules/UsersSection"
import ToastContainer from "./modules/ToastContainer"
import {
  AdminCompany,
  News,
  Order,
  PendingCompany,
  PriceList,
  Product,
  Region,
  SalesChannel,
  SectionId,
  StoreUser,
  StockLocation,
} from "./types"

const MEDUSA_URL = import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"
const DEFAULT_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@chroma.local"
const DEFAULT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "supersecret"

type Toast = { id: string; title: string; description?: string; variant?: "success" | "error" }

type DashboardTopProduct = { title: string; quantity: number; revenue: number }

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
  const [toasts, setToasts] = useState<Toast[]>([])
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [priceListsError, setPriceListsError] = useState<string | null>(null)
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([])
  const [storeUsersError, setStoreUsersError] = useState<string | null>(null)
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [dashboardDays, setDashboardDays] = useState<7 | 30 | 90>(7)
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard")

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
        const productFields = encodeURIComponent(
          "+variants.inventory_quantity,+variants.prices,+variants.title,+variants.id,+variants.sku"
        )
        const [
          productsRes,
          ordersRes,
          companiesRes,
          newsRes,
          allCompaniesRes,
          priceListsRes,
          storeUsersRes,
          salesChannelsRes,
          regionsRes,
          stockLocationsRes,
        ] = await Promise.all([
          fetch(`${MEDUSA_URL}/admin/products?limit=50&fields=${productFields}`, { headers }),
          fetch(`${MEDUSA_URL}/admin/orders?limit=50&fields=${ordersFields}`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies/pending`, { headers }),
          fetch(`${MEDUSA_URL}/admin/news?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies?limit=500`, { headers }),
          fetch(`${MEDUSA_URL}/admin/price-lists?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/store-users?limit=500`, { headers }),
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

        if (storeUsersRes.ok) {
          const json = await storeUsersRes.json()
          setStoreUsers(json.users ?? [])
          setStoreUsersError(null)
        } else {
          const body = await storeUsersRes.text()
          setStoreUsersError(body || "Não foi possível buscar usuários")
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
        setStoreUsersError("Erro ao buscar usuários")
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
                { id: "estoque", label: "Estoque", count: stockLocations.length },
                { id: "pedidos", label: "Pedidos", count: orders.length },
                { id: "promocoes", label: "Promoções", count: priceLists.length },
                { id: "canais", label: "Canais de vendas", count: salesChannels.length },
                { id: "usuarios", label: "Usuários", count: storeUsers.length },
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
              <DashboardSection
                orders={orders}
                dashboardDays={dashboardDays}
                onChangeDays={setDashboardDays}
                totalSales={totalSales}
                averageTicket={averageTicket}
                openOrders={openOrders}
                itemsPurchased={itemsPurchased}
                productsCount={products.length}
                pendingCompaniesCount={pendingCompanies.length}
                dashboardOrdersCount={dashboardOrders.length}
                recentOrders={recentOrders}
                revenueSeries={revenueSeries}
                revenueMax={revenueMax}
                topProducts={topProducts}
                getOrderStatusClass={getOrderStatusClass}
              />
            )}

            {activeSection === "pagamentos" && (
              <PaymentsSection
                medusaUrl={MEDUSA_URL}
                headers={headers}
                pendingCompanies={pendingCompanies}
                setPendingCompanies={setPendingCompanies}
                pendingCompaniesError={pendingCompaniesError}
                setPendingCompaniesError={setPendingCompaniesError}
                pendingCompanyActionId={pendingCompanyActionId}
                setPendingCompanyActionId={setPendingCompanyActionId}
                companies={companies}
                setCompanies={setCompanies}
                companiesError={companiesError}
                setCompaniesError={setCompaniesError}
                companyEmailEdits={companyEmailEdits}
                setCompanyEmailEdits={setCompanyEmailEdits}
                companySavingId={companySavingId}
                setCompanySavingId={setCompanySavingId}
                stockLocations={stockLocations}
              />
            )}

            {activeSection === "noticias" && (
              <NewsSection
                medusaUrl={MEDUSA_URL}
                headers={headers}
                news={news}
                setNews={setNews}
                newsError={newsError}
                setNewsError={setNewsError}
                pushToast={pushToast}
              />
            )}

            {activeSection === "produtos" && (
              <ProductsSection
                medusaUrl={MEDUSA_URL}
                token={token}
                headers={headers}
                products={products}
                setProducts={setProducts}
                salesChannels={salesChannels}
                stockLocations={stockLocations}
                openOrders={openOrders}
              />
            )}

            {activeSection === "estoque" && (
              <StockSection
                medusaUrl={MEDUSA_URL}
                headers={headers}
                products={products}
                stockLocations={stockLocations}
              />
            )}

            {activeSection === "pedidos" && <OrdersSection orders={orders} />}

            {activeSection === "promocoes" && (
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
              />
            )}

            {activeSection === "canais" && (
              <ChannelsSection
                medusaUrl={MEDUSA_URL}
                headers={headers}
                salesChannels={salesChannels}
                setSalesChannels={setSalesChannels}
              />
            )}

            {activeSection === "usuarios" && (
              <UsersSection
                medusaUrl={MEDUSA_URL}
                headers={headers}
                users={storeUsers}
                setUsers={setStoreUsers}
                usersError={storeUsersError}
                setUsersError={setStoreUsersError}
              />
            )}
          </main>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}
