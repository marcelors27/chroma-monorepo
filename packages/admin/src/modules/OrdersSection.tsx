import { Order } from "../types"
import { formatMoney } from "../utils/format"

type OrdersSectionProps = {
  orders: Order[]
}

const getOrderStatusClass = (status?: string) => {
  if (!status) return "default"
  if (status === "completed") return "active"
  if (status === "canceled" || status === "requires_action") return "scheduled"
  if (status === "pending" || status === "processing") return "scheduled"
  return "default"
}

export default function OrdersSection({ orders }: OrdersSectionProps) {
  const openOrders = orders.filter((o) => o.status !== "completed").length

  return (
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
  )
}
