import { FormEvent, useEffect, useMemo, useState } from "react"

type Product = {
  id: string
  title: string
  status?: string
  variants?: { inventory_quantity?: number; prices?: { amount: number; currency_code: string }[] }[]
}

type Order = {
  id: string
  display_id?: number
  status?: string
  total?: number
  currency_code?: string
}

type PendingCompany = {
  id: string
  trade_name?: string | null
  fantasy_name?: string | null
  cnpj?: string | null
  customer_email?: string | null
  created_at?: string
}

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
        const [productsRes, ordersRes, companiesRes] = await Promise.all([
          fetch(`${MEDUSA_URL}/admin/products?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/orders?limit=50`, { headers }),
          fetch(`${MEDUSA_URL}/admin/companies/pending`, { headers }),
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
      } catch (err) {
        console.error("Erro ao buscar dados", err)
        setPendingCompaniesError("Erro ao buscar empresas pendentes")
      }
    }

    load()
  }, [token, headers])

  const totalInventory = products.reduce((acc, p) => {
    const inv = p.variants?.[0]?.inventory_quantity ?? 0
    return acc + inv
  }, 0)
  const openOrders = orders.filter((o) => o.status !== "completed").length

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

  return (
    <div className="layout">
      <header className="grid" style={{ gap: "0.75rem" }}>
        <span className="pill">Chroma Admin</span>
        <h1 style={{ fontSize: "2.1rem" }}>Painel da operação</h1>
        <p className="muted" style={{ maxWidth: "640px" }}>
          Autentique com o usuário admin do Medusa para ver produtos, estoque e pedidos.
        </p>
      </header>

      {!token ? (
        <form className="panel grid" onSubmit={login} style={{ gap: "1rem", maxWidth: "520px" }}>
          <h2>Entrar</h2>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">E-mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{
                padding: "0.75rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "#0b1324",
                color: "var(--text)",
              }}
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Senha</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              style={{
                padding: "0.75rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "#0b1324",
                color: "var(--text)",
              }}
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
      ) : (
        <>
          <section className="panel" style={{ marginTop: "1rem" }}>
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
                            className="btn"
                            onClick={() => setCompanyApproval(company.id, true)}
                            disabled={pendingCompanyActionId === company.id}
                            style={{ padding: "0.4rem 0.75rem" }}
                          >
                            Aprovar
                          </button>
                          <button
                            className="btn"
                            onClick={() => setCompanyApproval(company.id, false)}
                            disabled={pendingCompanyActionId === company.id}
                            style={{
                              padding: "0.4rem 0.75rem",
                              background: "transparent",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                            }}
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
              <span className="muted">Pedidos em aberto</span>
              <strong style={{ fontSize: "1.6rem" }}>{openOrders}</strong>
              <span className="muted">Acompanhe a separação</span>
            </div>
          </section>

          <section className="grid grid-3" style={{ alignItems: "start" }}>
            <div className="panel" style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3>Produtos</h3>
                <span className="pill">{products.length} itens</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Estoque</th>
                      <th>Preço</th>
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel" style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3>Pedidos</h3>
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
                          <span className="badge">{o.status ?? "—"}</span>
                        </td>
                        <td>{formatMoney(o.total, o.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
