import { useEffect, useState } from "react"

import type { StoreUser, TestPaymentLog } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type TestPaymentLogsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  pushToast: (toast: ToastInput) => void
}

export default function TestPaymentLogsSection({
  medusaUrl,
  headers,
  users,
  pushToast,
}: TestPaymentLogsSectionProps) {
  const [logs, setLogs] = useState<TestPaymentLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState("")

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (userId) params.set("user_id", userId)
      params.set("limit", String(limit))
      params.set("offset", String(offset))

      const res = await fetch(`${medusaUrl}/admin/test-payment-logs?${params.toString()}`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Erro ao buscar logs")
      }
      const json = await res.json()
      setLogs(json.logs || [])
      setTotal(json.total || 0)
    } catch (err: any) {
      pushToast({ title: err?.message || "Erro ao buscar logs", variant: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [userId, limit, offset])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(Math.floor(offset / limit) + 1, totalPages)

  return (
    <div className="panel">
      <div style={{ marginBottom: "1rem" }}>
        <h2 data-testid="admin-test-payment-logs-title">Logs de pagamento em teste</h2>
        <p className="muted">Auditoria de confirmações manuais de boleto.</p>
      </div>

      <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Usuário</span>
          <select className="field-input" value={userId} onChange={(e) => { setUserId(e.target.value); setOffset(0) }}>
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email || user.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Payment collection</th>
              <th>Session</th>
              <th>IP</th>
              <th>User-agent</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>Carregando...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>Nenhum log encontrado.</td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr key={`${log.user_id}-${log.created_at || index}`}>
                  <td>{log.user_name || log.user_email || "—"}</td>
                  <td>{log.user_email || "—"}</td>
                  <td>{log.payment_collection_id || "—"}</td>
                  <td>{log.session_id || "—"}</td>
                  <td>{log.ip || "—"}</td>
                  <td style={{ maxWidth: 320, whiteSpace: "normal" }}>{log.user_agent || "—"}</td>
                  <td>{log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "flex-end", marginTop: "0.75rem" }}>
        <span className="muted">Página {page} de {totalPages}</span>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
          disabled={page >= totalPages}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
