import { useEffect, useState } from "react"
import { Order } from "../types"
import { formatMoney } from "../utils/format"

type OrdersSectionProps = {
  orders: Order[]
  medusaUrl: string
  headers: Record<string, string>
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
  { value: "processing", label: "Processando" },
  { value: "completed", label: "Concluído" },
  { value: "canceled", label: "Cancelado" },
]

const FULFILLMENT_STATUS_OPTIONS = [
  { value: "not_fulfilled", label: "Não entregue" },
  { value: "processing", label: "Processando" },
  { value: "shipped", label: "Enviado" },
  { value: "partially_shipped", label: "Parcialmente enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
]

const withCurrentOption = (options: { value: string; label: string }[], value?: string) => {
  if (!value) return options
  if (options.some((opt) => opt.value === value)) return options
  return [...options, { value, label: value }]
}

export default function OrdersSection({ orders, medusaUrl, headers }: OrdersSectionProps) {
  const [localOrders, setLocalOrders] = useState<Order[]>(orders)
  const [draftById, setDraftById] = useState<Record<string, Partial<Order>>>({})
  const [savingById, setSavingById] = useState<Record<string, boolean>>({})
  const [errorById, setErrorById] = useState<Record<string, string | null>>({})
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null)
  const openOrders = localOrders.filter((o) => o.status !== "completed").length

  useEffect(() => {
    setLocalOrders(orders)
  }, [orders])

  const updateDraft = (id: string, patch: Partial<Order>) => {
    setDraftById((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
  }

  const getDraftValue = (order: Order, field: keyof Order) => {
    return (draftById[order.id]?.[field] as string | undefined) ?? (order[field] as string | undefined) ?? ""
  }

  const hasChanges = (order: Order) => {
    const draft = draftById[order.id]
    if (!draft) return false
    return (
      (draft.status && draft.status !== order.status) ||
      (draft.fulfillment_status && draft.fulfillment_status !== order.fulfillment_status)
    )
  }

  const saveOrder = async (order: Order) => {
    const payload = {
      status: draftById[order.id]?.status ?? order.status,
      fulfillment_status: draftById[order.id]?.fulfillment_status ?? order.fulfillment_status,
    }
    setSavingById((current) => ({ ...current, [order.id]: true }))
    setErrorById((current) => ({ ...current, [order.id]: null }))
    try {
      const res = await fetch(`${medusaUrl}/admin/custom/orders-status/${order.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar o pedido.")
      }
      const json = await res.json().catch(() => null)
      const updated = json?.order
      setLocalOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, ...updated } : item))
      )
      setDraftById((current) => {
        const next = { ...current }
        delete next[order.id]
        return next
      })
    } catch (err: any) {
      setErrorById((current) => ({
        ...current,
        [order.id]: err?.message || "Erro ao atualizar status.",
      }))
    } finally {
      setSavingById((current) => ({ ...current, [order.id]: false }))
    }
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
          <span className="pill">{localOrders.length} entradas</span>
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
                <th>Histórico</th>
                <th>Atualização</th>
              </tr>
            </thead>
            <tbody>
              {localOrders.map((o) => {
                const isSaving = savingById[o.id]
                const history = Array.isArray(o.metadata?.status_history)
                  ? o.metadata?.status_history
                  : []
                const recentHistory = history.slice(-2).reverse()
                return (
                  <tr key={o.id}>
                    <td>#{o.display_id ?? o.id.slice(0, 6)}</td>
                    <td>
                      <select
                        className="field-input"
                        value={getDraftValue(o, "status")}
                        onChange={(e) => updateDraft(o.id, { status: e.target.value })}
                      >
                        <option value="">—</option>
                        {withCurrentOption(ORDER_STATUS_OPTIONS, o.status).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="field-input"
                        value={getDraftValue(o, "fulfillment_status")}
                        onChange={(e) =>
                          updateDraft(o.id, { fulfillment_status: e.target.value })
                        }
                      >
                        <option value="">—</option>
                        {withCurrentOption(FULFILLMENT_STATUS_OPTIONS, o.fulfillment_status).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status-chip ${getPaymentStatusClass(o.payment_status)}`}>
                        {getPaymentStatusLabel(o.payment_status)}
                      </span>
                    </td>
                    <td>{formatMoney(o.total, o.currency_code)}</td>
                    <td>
                      {recentHistory.length ? (
                        <div className="grid" style={{ gap: "0.25rem" }}>
                          {recentHistory.map((entry: any, idx: number) => (
                            <span key={`${o.id}-history-${idx}`} className="muted">
                              {formatHistoryDate(entry?.at)} • {entry?.status || "—"}/
                              {entry?.fulfillment_status || "—"}
                            </span>
                          ))}
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => setHistoryOrder(o)}
                          >
                            Ver histórico
                          </button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="grid" style={{ gap: "0.35rem" }}>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => saveOrder(o)}
                          disabled={!hasChanges(o) || isSaving}
                        >
                          {isSaving ? "Salvando..." : "Atualizar"}
                        </button>
                        {errorById[o.id] && (
                          <span className="muted">Erro: {errorById[o.id]}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {historyOrder && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3>Histórico do pedido</h3>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setHistoryOrder(null)}
              >
                Fechar
              </button>
            </div>
            <div className="modal-body">
              <p className="muted" style={{ marginBottom: "0.75rem" }}>
                Pedido #{historyOrder.display_id ?? historyOrder.id.slice(0, 6)}
              </p>
              {(Array.isArray(historyOrder.metadata?.status_history)
                ? historyOrder.metadata.status_history
                : []
              )
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
          </div>
        </div>
      )}
    </div>
  )
}
