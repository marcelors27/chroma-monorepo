import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Order } from "../types"
import { formatMoney } from "../utils/format"

type OrdersSectionProps = {
  orders: Order[]
  medusaUrl: string
  headers: Record<string, string>
  mode?: "list" | "edit"
  orderId?: string
}

const getOrderStatusClass = (status?: string) => {
  if (!status) return "default"
  if (status === "completed") return "active"
  if (status === "canceled" || status === "requires_action") return "scheduled"
  if (status === "pending" || status === "processing") return "scheduled"
  return "default"
}

const getPaymentStatusClass = (status?: string) => {
  if (!status) return "default"
  if (status === "captured") return "active"
  if (status === "canceled" || status === "refunded") return "scheduled"
  return "default"
}

const getPaymentStatusLabel = (status?: string) => {
  if (status === "captured") return "Pago"
  if (status === "authorized") return "Autorizado"
  if (status === "pending") return "Pendente"
  if (status === "canceled") return "Cancelado"
  if (status === "refunded") return "Reembolsado"
  return status || "—"
}

const formatHistoryDate = (value?: string) => {
  if (!value) return "—"
  return new Date(value).toLocaleString("pt-BR")
}

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "requires_action", label: "Requer ação" },
  { value: "completed", label: "Concluído" },
  { value: "canceled", label: "Cancelado" },
]

const FULFILLMENT_STATUS_OPTIONS = [
  { value: "not_fulfilled", label: "Não entregue" },
  { value: "partially_fulfilled", label: "Separação parcial" },
  { value: "fulfilled", label: "Separado" },
  { value: "shipped", label: "Enviado" },
  { value: "partially_shipped", label: "Parcialmente enviado" },
  { value: "partially_delivered", label: "Parcialmente entregue" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
]

const withCurrentOption = (options: { value: string; label: string }[], value?: string) => {
  if (!value) return options
  if (options.some((opt) => opt.value === value)) return options
  return [...options, { value, label: value }]
}

const getOptionLabel = (options: { value: string; label: string }[], value?: string) => {
  if (!value) return "—"
  return options.find((opt) => opt.value === value)?.label || value
}

export default function OrdersSection({
  orders,
  medusaUrl,
  headers,
  mode = "list",
  orderId,
}: OrdersSectionProps) {
  const isEditMode = mode === "edit"
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    status: "",
    fulfillment: "",
    payment: "",
    query: "",
  })

  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [draft, setDraft] = useState<Partial<Order>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditMode) return
    const found = orders.find((order) => order.id === orderId) || null
    setActiveOrder(found)
    setDraft({})
    setError(null)
  }, [isEditMode, orderId, orders])

  const openOrders = orders.filter((o) => o.status !== "completed").length

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status && order.status !== filters.status) return false
      if (filters.fulfillment && order.fulfillment_status !== filters.fulfillment) return false
      if (filters.payment && order.payment_status !== filters.payment) return false
      if (filters.query) {
        const query = filters.query.toLowerCase()
        const displayId = order.display_id ? `#${order.display_id}` : ""
        const idMatch = order.id?.toLowerCase().includes(query) || false
        const displayMatch = displayId.toLowerCase().includes(query)
        if (!idMatch && !displayMatch) return false
      }
      return true
    })
  }, [filters, orders])

  const getDraftValue = (field: keyof Order) => {
    if (!activeOrder) return ""
    return (draft[field] as string | undefined) ?? (activeOrder[field] as string | undefined) ?? ""
  }

  const hasChanges = () => {
    if (!activeOrder) return false
    return (
      (draft.status && draft.status !== activeOrder.status) ||
      (draft.fulfillment_status && draft.fulfillment_status !== activeOrder.fulfillment_status)
    )
  }

  const saveOrder = async () => {
    if (!activeOrder) return
    const payload: Partial<Order> = {}
    if (draft.status && draft.status !== activeOrder.status) {
      payload.status = draft.status
    }
    if (draft.fulfillment_status && draft.fulfillment_status !== activeOrder.fulfillment_status) {
      payload.fulfillment_status = draft.fulfillment_status
    }

    if (!Object.keys(payload).length) {
      setError("Nenhuma alteração para salvar.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/custom/orders-status/${activeOrder.id}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar o pedido.")
      }
      const json = await res.json().catch(() => null)
      const updated = json?.order
      if (updated) {
        setActiveOrder((current) => (current ? { ...current, ...updated } : updated))
      }
      setDraft({})
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar status.")
    } finally {
      setSaving(false)
    }
  }

  if (isEditMode) {
    if (!activeOrder) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Editar pedido</h1>
            <p className="page-subtitle">Pedido não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/pedidos")}
          >
            Voltar para pedidos
          </button>
        </div>
      )
    }

    const history = Array.isArray(activeOrder.metadata?.status_history)
      ? activeOrder.metadata?.status_history
      : []

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar pedido</h1>
          <p className="page-subtitle">Pedido #{activeOrder.display_id ?? activeOrder.id.slice(0, 6)}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/pedidos")}>
            Voltar
          </button>
          <button className="btn" type="button" onClick={saveOrder} disabled={!hasChanges() || saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        {error && <div className="panel muted">Erro: {error}</div>}

        <section className="panel" style={{ marginBottom: "1rem" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.75rem", maxWidth: "520px", marginTop: "0.75rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Status</span>
              <select
                className="field-input"
                value={getDraftValue("status")}
                onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value }))}
              >
                <option value="">—</option>
                {withCurrentOption(ORDER_STATUS_OPTIONS, activeOrder.status).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Entrega</span>
              <select
                className="field-input"
                value={getDraftValue("fulfillment_status")}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, fulfillment_status: e.target.value }))
                }
              >
                <option value="">—</option>
                {withCurrentOption(FULFILLMENT_STATUS_OPTIONS, activeOrder.fulfillment_status).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Pagamento</span>
              <span className={`status-chip ${getPaymentStatusClass(activeOrder.payment_status)}`}>
                {getPaymentStatusLabel(activeOrder.payment_status)}
              </span>
            </div>

            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Total</span>
              <span>{formatMoney(activeOrder.total, activeOrder.currency_code)}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3>Histórico</h3>
          {history.length === 0 ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Nenhum histórico encontrado.
            </p>
          ) : (
            <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
              {history
                .slice()
                .reverse()
                .map((entry: any, idx: number) => (
                  <div key={`history-${idx}`} className="panel grid" style={{ gap: "0.35rem" }}>
                    <strong>{formatHistoryDate(entry?.at)}</strong>
                    <span className="muted">
                      Status: {entry?.status || "—"} • Entrega: {entry?.fulfillment_status || "—"}
                    </span>
                    {entry?.actor && <span className="muted">Por: {entry.actor}</span>}
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    )
  }

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
          <span className="pill">{filteredOrders.length} entradas</span>
        </div>
        <div className="filters-grid" style={{ marginBottom: "0.75rem" }}>
          <input
            className="field-input"
            placeholder="Buscar por # ou ID"
            value={filters.query}
            onChange={(e) => setFilters((current) => ({ ...current, query: e.target.value }))}
          />
          <select
            className="field-input"
            value={filters.status}
            onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
          >
            <option value="">Status (todos)</option>
            {withCurrentOption(ORDER_STATUS_OPTIONS, undefined).map((option) => (
              <option key={`status-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="field-input"
            value={filters.fulfillment}
            onChange={(e) => setFilters((current) => ({ ...current, fulfillment: e.target.value }))}
          >
            <option value="">Entrega (todas)</option>
            {withCurrentOption(FULFILLMENT_STATUS_OPTIONS, undefined).map((option) => (
              <option key={`fulfillment-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="field-input"
            value={filters.payment}
            onChange={(e) => setFilters((current) => ({ ...current, payment: e.target.value }))}
          >
            <option value="">Pagamento (todos)</option>
            <option value="captured">Pago</option>
            <option value="authorized">Autorizado</option>
            <option value="pending">Pendente</option>
            <option value="canceled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </select>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setFilters({ status: "", fulfillment: "", payment: "", query: "" })}
          >
            Limpar filtros
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Entrega</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.display_id ?? o.id.slice(0, 6)}</td>
                  <td>
                    <span className={`status-chip ${getOrderStatusClass(o.status)}`}>
                      {getOptionLabel(ORDER_STATUS_OPTIONS, o.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-chip ${getOrderStatusClass(o.fulfillment_status)}`}>
                      {getOptionLabel(FULFILLMENT_STATUS_OPTIONS, o.fulfillment_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-chip ${getPaymentStatusClass(o.payment_status)}`}>
                      {getPaymentStatusLabel(o.payment_status)}
                    </span>
                  </td>
                  <td>{formatMoney(o.total, o.currency_code)}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => navigate(`/pedidos/${o.id}`)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
