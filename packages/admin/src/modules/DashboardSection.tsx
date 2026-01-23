import { Order } from "../types"
import { formatMoney } from "../utils/format"

type DashboardSeriesItem = { label: string; total: number }
type DashboardTopProduct = { title: string; quantity: number; revenue: number }

type DashboardSectionProps = {
  orders: Order[]
  dashboardDays: 7 | 30 | 90
  onChangeDays: (days: 7 | 30 | 90) => void
  totalSales: number
  averageTicket: number
  openOrders: number
  itemsPurchased: number
  productsCount: number
  pendingCompaniesCount: number
  dashboardOrdersCount: number
  recentOrders: Order[]
  revenueSeries: DashboardSeriesItem[]
  revenueMax: number
  topProducts: DashboardTopProduct[]
  getOrderStatusClass: (status?: string) => string
}

export default function DashboardSection({
  orders,
  dashboardDays,
  onChangeDays,
  totalSales,
  averageTicket,
  openOrders,
  itemsPurchased,
  productsCount,
  pendingCompaniesCount,
  dashboardOrdersCount,
  recentOrders,
  revenueSeries,
  revenueMax,
  topProducts,
  getOrderStatusClass,
}: DashboardSectionProps) {
  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Dashboard</h1>
        <p className="muted">Visao rapida de vendas, pedidos e desempenho do catalogo.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={`btn btn-sm ${dashboardDays === days ? "" : "btn-secondary"}`}
              onClick={() => onChangeDays(days as 7 | 30 | 90)}
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
          <span className="muted">{dashboardOrdersCount} pedidos no periodo</span>
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
          <strong style={{ fontSize: "1.6rem" }}>{itemsPurchased || "—"}</strong>
          <span className="muted">Ultimos {dashboardDays} dias</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Catalogo ativo</span>
          <strong style={{ fontSize: "1.6rem" }}>{productsCount}</strong>
          <span className="muted">Produtos publicados</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Empresas pendentes</span>
          <strong style={{ fontSize: "1.6rem" }}>{pendingCompaniesCount}</strong>
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
          <span className="pill">{dashboardOrdersCount} pedidos no periodo</span>
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
                      <span>{formatMoney(row.total, orders[0]?.currency_code || "brl")}</span>
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
                    <div>{formatMoney(item.revenue, orders[0]?.currency_code || "brl")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
