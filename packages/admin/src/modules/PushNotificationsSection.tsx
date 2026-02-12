import { FormEvent, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { AdminCompany, StoreUser } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type PushNotificationsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  companies: AdminCompany[]
  pushToast: (toast: ToastInput) => void
  mode?: "list" | "create" | "resend"
}

type TargetType = "all" | "companies" | "users"

type PushNotification = {
  id: string
  title: string
  message: string
  target_type: TargetType
  target_company_ids?: string[]
  target_user_ids?: string[]
  send_at?: string | null
  status?: string | null
  last_error?: string | null
  sent_at?: string | null
  created_at?: string | null
}

type PushResendState = { notification?: PushNotification }

export default function PushNotificationsSection({
  medusaUrl,
  headers,
  users,
  companies,
  pushToast,
  mode = "list",
}: PushNotificationsSectionProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const isCreateMode = mode === "create"
  const isResendMode = mode === "resend"
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [targetType, setTargetType] = useState<TargetType>("all")
  const [scheduledAt, setScheduledAt] = useState("")
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<PushNotification[]>([])
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendTarget, setResendTarget] = useState<PushNotification | null>(null)

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => (a.trade_name || a.fantasy_name || "").localeCompare(b.trade_name || b.fantasy_name || "")),
    [companies]
  )
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.email || "").localeCompare(b.email || "")),
    [users]
  )

  const toggleSelection = (id: string, list: string[], setter: (next: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter((item) => item !== id))
    } else {
      setter([...list, id])
    }
  }

  const resetForm = () => {
    setTitle("")
    setMessage("")
    setTargetType("all")
    setScheduledAt("")
    setSelectedCompanies([])
    setSelectedUsers([])
    setError(null)
  }

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`${medusaUrl}/admin/push-notifications?limit=50`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível carregar o histórico.")
      }
      const json = await res.json()
      setHistory(json.notifications ?? [])
    } catch (err: any) {
      pushToast({
        title: "Erro ao carregar histórico",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const processQueue = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`${medusaUrl}/admin/push-notifications/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({ limit: 50 }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível processar a fila.")
      }
      await loadHistory()
      pushToast({
        title: "Fila processada",
        description: "Notificações pendentes foram atualizadas.",
        variant: "success",
      })
    } catch (err: any) {
      pushToast({
        title: "Erro ao processar fila",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resendNotification = async (id: string) => {
    setResendingId(id)
    try {
      const res = await fetch(`${medusaUrl}/admin/push-notifications/resend`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível reenviar a notificação.")
      }
      await loadHistory()
      pushToast({
        title: "Notificação reenfileirada",
        description: "A notificação voltou para a fila de envio.",
        variant: "success",
      })
      return true
    } catch (err: any) {
      pushToast({
        title: "Erro ao reenviar",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
      return false
    } finally {
      setResendingId(null)
    }
  }

  useEffect(() => {
    if (isCreateMode || isResendMode) return
    loadHistory()
  }, [isCreateMode, isResendMode])

  useEffect(() => {
    if (!isResendMode) return
    const state = (location.state || {}) as PushResendState
    setResendTarget(state.notification || null)
  }, [isResendMode, location.state])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!title.trim() || !message.trim()) {
      setError("Informe título e mensagem.")
      return
    }
    if (targetType === "companies" && selectedCompanies.length === 0) {
      setError("Selecione ao menos uma empresa.")
      return
    }
    if (targetType === "users" && selectedUsers.length === 0) {
      setError("Selecione ao menos um usuário.")
      return
    }

    const sendAtIso = scheduledAt ? new Date(scheduledAt).toISOString() : null

    setIsSending(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        target: {
          type: targetType,
          company_ids: targetType === "companies" ? selectedCompanies : undefined,
          user_ids: targetType === "users" ? selectedUsers : undefined,
        },
        send_at: sendAtIso,
      }

      const res = await fetch(`${medusaUrl}/admin/push-notifications`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível agendar a notificação.")
      }
      resetForm()
      pushToast({
        title: "Notificação agendada",
        description: sendAtIso ? "Envio programado com sucesso." : "Envio iniciado.",
        variant: "success",
      })
      navigate("/push")
    } catch (err: any) {
      setError(err?.message || "Erro ao enviar notificação.")
      pushToast({
        title: "Erro ao enviar",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isResendMode) {
    if (!resendTarget) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Reenviar notificação</h1>
            <p className="page-subtitle">Selecione uma notificação no histórico para reenviar.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/push")}>
            Voltar
          </button>
        </div>
      )
    }

    const targetLabel =
      resendTarget.target_type === "all"
        ? "Todos"
        : resendTarget.target_type === "companies"
        ? `Empresas (${resendTarget.target_company_ids?.length || 0})`
        : `Usuários (${resendTarget.target_user_ids?.length || 0})`

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Reenviar notificação</h1>
          <p className="page-subtitle">Confirme o reenvio para a mesma audiência.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/push")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const ok = await resendNotification(resendTarget.id)
              if (ok) navigate("/push")
            }}
            disabled={resendingId === resendTarget.id}
          >
            {resendingId === resendTarget.id ? "Reenviando..." : "Confirmar reenvio"}
          </button>
        </div>

        <section className="panel" style={{ maxWidth: "720px" }}>
          <div className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Título</span>
            <strong>{resendTarget.title}</strong>
          </div>
          <div className="grid" style={{ gap: "0.35rem", marginTop: "0.75rem" }}>
            <span className="muted">Mensagem</span>
            <span>{resendTarget.message}</span>
          </div>
          <div className="grid" style={{ gap: "0.35rem", marginTop: "0.75rem" }}>
            <span className="muted">Destino</span>
            <span>{targetLabel}</span>
          </div>
        </section>
      </div>
    )
  }

  if (isCreateMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Nova notificação</h1>
          <p className="page-subtitle">
            Envie mensagens para usuários específicos ou grupos. Agende o envio para uma data futura.
          </p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/push")}>
            Voltar
          </button>
          <button className="btn" type="submit" form="push-form" disabled={isSending}>
            {isSending ? "Enviando..." : "Agendar envio"}
          </button>
        </div>

        <form
          id="push-form"
          className="panel grid"
          onSubmit={handleSubmit}
          style={{ gap: "0.9rem", maxWidth: "920px" }}
        >
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field-input"
              required
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Mensagem</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="field-input"
              required
            />
          </label>

          <div className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Destinatários</span>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as TargetType)}
              className="field-input"
            >
              <option value="all">Todos os usuários</option>
              <option value="companies">Empresas específicas</option>
              <option value="users">Usuários específicos</option>
            </select>
          </div>

          {targetType === "companies" && (
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Empresas</span>
              <div className="panel" style={{ maxHeight: "220px", overflowY: "auto" }}>
                {sortedCompanies.length === 0 ? (
                  <span className="muted">Nenhuma empresa disponível.</span>
                ) : (
                  <div className="grid" style={{ gap: "0.45rem" }}>
                    {sortedCompanies.map((company) => {
                      const name = company.trade_name || company.fantasy_name || company.id
                      const checked = selectedCompanies.includes(company.id)
                      return (
                        <label key={company.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleSelection(company.id, selectedCompanies, setSelectedCompanies)
                            }
                            className="checkbox"
                          />
                          <span>{name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {targetType === "users" && (
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Usuários</span>
              <div className="panel" style={{ maxHeight: "220px", overflowY: "auto" }}>
                {sortedUsers.length === 0 ? (
                  <span className="muted">Nenhum usuário disponível.</span>
                ) : (
                  <div className="grid" style={{ gap: "0.45rem" }}>
                    {sortedUsers.map((user) => {
                      const label = user.email || user.id
                      const checked = selectedUsers.includes(user.id)
                      return (
                        <label key={user.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelection(user.id, selectedUsers, setSelectedUsers)}
                            className="checkbox"
                          />
                          <span>{label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Data de envio (opcional)</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="field-input"
            />
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              Se vazio, o envio é imediato.
            </span>
          </label>

          {error && <div className="muted">Erro: {error}</div>}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" type="button" onClick={resetForm} disabled={isSending}>
              Limpar
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Push notifications</h1>
        <p className="muted">Histórico de envios e processamento da fila.</p>
      </header>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button className="btn" type="button" onClick={() => navigate("/push/nova")}>
          Nova notificação
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={processQueue}
          disabled={isProcessing}
        >
          {isProcessing ? "Processando..." : "Processar fila"}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={loadHistory}
          disabled={isLoadingHistory}
        >
          {isLoadingHistory ? "Atualizando..." : "Atualizar histórico"}
        </button>
      </div>

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3>Histórico recente</h3>
          <span className="muted">{history.length} registros</span>
        </div>
        {history.length === 0 ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Nenhuma notificação enviada/agendada ainda.
          </p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Destino</th>
                  <th>Status</th>
                  <th>Erro</th>
                  <th>Agendamento</th>
                  <th>Enviado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const targetLabel =
                    item.target_type === "all"
                      ? "Todos"
                      : item.target_type === "companies"
                      ? `Empresas (${item.target_company_ids?.length || 0})`
                      : `Usuários (${item.target_user_ids?.length || 0})`
                  return (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{targetLabel}</td>
                      <td>{item.status || "—"}</td>
                      <td>
                        {item.last_error ? (
                          <details>
                            <summary className="muted" style={{ cursor: "pointer" }}>
                              {item.last_error.length > 120
                                ? `${item.last_error.slice(0, 120)}...`
                                : item.last_error}
                            </summary>
                            <pre
                              className="muted"
                              style={{
                                marginTop: "0.5rem",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {item.last_error}
                            </pre>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {item.send_at ? new Date(item.send_at).toLocaleString("pt-BR") : "Imediato"}
                      </td>
                      <td>
                        {item.sent_at ? new Date(item.sent_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => navigate("/push/reenviar", { state: { notification: item } })}
                        >
                          Reenviar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
