import { useEffect, useMemo, useState } from "react"

import type { AdminCompany, EmailLog, StoreUser } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type EmailLogsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  companies: AdminCompany[]
  pushToast: (toast: ToastInput) => void
}

export default function EmailLogsSection({
  medusaUrl,
  headers,
  users,
  companies,
  pushToast,
}: EmailLogsSectionProps) {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null)

  const filteredCompanies = useMemo(() => {
    if (!userId) return companies
    return companies.filter((company) => company.customer_id === userId)
  }, [companies, userId])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (userId) params.set("user_id", userId)
      if (companyId) params.set("company_id", companyId)
      if (type) params.set("type", type)
      if (status) params.set("status", status)
      params.set("limit", String(limit))
      params.set("offset", String(offset))

      const res = await fetch(`${medusaUrl}/admin/email-logs?${params.toString()}`, { headers })
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
  }, [userId, companyId, type, status, limit, offset])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(Math.floor(offset / limit) + 1, totalPages)

  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})

  const toggleDetails = (key: string) => {
    setExpandedDetails((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleResend = async (log: EmailLog) => {
    if (!log?.company_id || !log?.user_id || !log?.payment_collection_id || !log?.method) {
      pushToast({ title: "Log sem dados suficientes para reenvio.", variant: "error" })
      return
    }
    if (!confirm("Deseja reenviar esta cobrança?")) return
    setResendLoadingId(`${log.user_id}-${log.sent_at}`)
    try {
      const res = await fetch(`${medusaUrl}/admin/notifications/pending-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          method: log.method,
          payment_collection_id: log.payment_collection_id,
          company_id: log.company_id,
          customer_id: log.user_id,
          details: log.details || {},
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Erro ao reenviar cobrança")
      }
      pushToast({ title: "Cobrança reenviada", variant: "success" })
    } catch (err: any) {
      pushToast({ title: err?.message || "Erro ao reenviar cobrança", variant: "error" })
    } finally {
      setResendLoadingId(null)
    }
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: "1rem" }}>
        <h2>Histórico geral de e-mails</h2>
        <p className="muted">Visualize e filtre os envios registrados por usuário e condomínio.</p>
      </div>

      <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
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
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Condomínio</span>
          <select className="field-input" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setOffset(0) }}>
            <option value="">Todos</option>
            {filteredCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.fantasy_name || company.trade_name || company.id}
              </option>
            ))}
          </select>
        </label>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Tipo</span>
          <select className="field-input" value={type} onChange={(e) => { setType(e.target.value); setOffset(0) }}>
            <option value="">Todos</option>
            <option value="boleto_admin">Boleto</option>
            <option value="pix_admin">PIX</option>
            <option value="welcome">Boas-vindas</option>
            <option value="company_added">Condomínio adicionado</option>
          </select>
        </label>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Status</span>
          <select className="field-input" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0) }}>
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="failed">Falhou</option>
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Condomínio</th>
              <th>Status</th>
              <th>Anexo</th>
              <th>Enviado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center" }}>Carregando...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center" }}>Nenhum envio encontrado.</td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const rowKey = `${log.user_id}-${log.sent_at || index}`
                const showDetails = expandedDetails[rowKey]
                return (
                  <>
                <tr key={rowKey}>
                  <td>{log.user_name || log.user_email || "—"}</td>
                  <td>{log.user_email || "—"}</td>
                  <td>{log.type || "—"}</td>
                  <td>{log.company_id || "—"}</td>
                  <td>{log.status || "—"}</td>
                  <td>{log.has_attachment ? "Sim" : "Não"}</td>
                  <td>{log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR") : "—"}</td>
                  <td>
                    {(log.type === "boleto_admin" || log.type === "pix_admin") ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => handleResend(log)}
                          disabled={resendLoadingId === `${log.user_id}-${log.sent_at}`}
                        >
                          {resendLoadingId === `${log.user_id}-${log.sent_at}` ? "Enviando..." : "Reenviar"}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => toggleDetails(rowKey)}
                        >
                          {showDetails ? "Ocultar" : "Detalhes"}
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                {showDetails && (log.type === "boleto_admin" || log.type === "pix_admin") && (
                  <tr key={`${rowKey}-details`}>
                    <td colSpan={8}>
                      <div className="panel" style={{ marginTop: "0.5rem" }}>
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                          <div><strong>Payment collection:</strong> {log.payment_collection_id || "—"}</div>
                          <div><strong>Método:</strong> {log.method || "—"}</div>
                          {log.method === "pix" ? (
                            <>
                              <div><strong>PIX code:</strong> {log.details?.pix_code || "—"}</div>
                              <div><strong>QR code:</strong> {log.details?.pix_qr || "—"}</div>
                            </>
                          ) : (
                            <>
                              <div><strong>Linha digitável:</strong> {log.details?.boleto_line || "—"}</div>
                              <div><strong>URL boleto:</strong> {log.details?.boleto_url || "—"}</div>
                              <div><strong>Vencimento:</strong> {log.details?.boleto_expires_at || "—"}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
                )
              })
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
