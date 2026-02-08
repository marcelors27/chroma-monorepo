import { useEffect, useMemo, useState } from "react"

import type { AdminCompany, PendingPixPayment, StoreUser } from "../types"
import { formatMoney } from "../utils/format"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type PixManualPaymentsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  companies: AdminCompany[]
  pushToast: (toast: ToastInput) => void
}

export default function PixManualPaymentsSection({
  medusaUrl,
  headers,
  users,
  companies,
  pushToast,
}: PixManualPaymentsSectionProps) {
  const [pending, setPending] = useState<PendingPixPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [txid, setTxid] = useState("")
  const [collectionId, setCollectionId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filteredUsers = useMemo(() => users || [], [users])
  const filteredCompanies = useMemo(() => {
    if (!userId) return companies
    return companies.filter((company) => company.customer_id === userId)
  }, [companies, userId])

  const loadPending = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (userId) params.set("user_id", userId)
      if (companyId) params.set("company_id", companyId)
      if (txid) params.set("txid", txid)
      if (collectionId) params.set("payment_collection_id", collectionId)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      params.set("limit", String(limit))
      params.set("offset", String(offset))

      const res = await fetch(`${medusaUrl}/admin/pending-pix-payments?${params.toString()}`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Erro ao buscar pendências")
      }
      const json = await res.json()
      setPending(json.logs || [])
      setTotal(json.total || 0)
    } catch (err: any) {
      pushToast({ title: err?.message || "Erro ao buscar pendências", variant: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [userId, companyId, txid, collectionId, dateFrom, dateTo, limit, offset])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(Math.floor(offset / limit) + 1, totalPages)

  const handleConfirm = async (item: PendingPixPayment) => {
    if (!item?.payment_collection_id) return
    if (!confirm("Confirmar pagamento PIX manual?")) return
    setConfirmingId(item.payment_collection_id)
    try {
      const res = await fetch(`${medusaUrl}/admin/pending-pix-payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          payment_collection_id: item.payment_collection_id,
          customer_id: item.user_id || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Erro ao confirmar pagamento")
      }
      pushToast({ title: "Pagamento confirmado", variant: "success" })
      await loadPending()
    } catch (err: any) {
      pushToast({ title: err?.message || "Erro ao confirmar pagamento", variant: "error" })
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: "1rem" }}>
        <h2 data-testid="admin-pix-manual-title">PIX manual</h2>
        <p className="muted">Confirme pagamentos PIX que foram feitos fora da Stripe.</p>
      </div>

      <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Usuário</span>
          <select className="field-input" value={userId} onChange={(e) => { setUserId(e.target.value); setOffset(0) }}>
            <option value="">Todos</option>
            {filteredUsers.map((user) => (
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
          <span className="muted">TXID</span>
          <input className="field-input" value={txid} onChange={(e) => { setTxid(e.target.value); setOffset(0) }} placeholder="TXID" />
        </label>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Payment collection</span>
          <input className="field-input" value={collectionId} onChange={(e) => { setCollectionId(e.target.value); setOffset(0) }} placeholder="pay_col_..." />
        </label>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">De</span>
          <input className="field-input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setOffset(0) }} />
        </label>
        <label className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Até</span>
          <input className="field-input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setOffset(0) }} />
        </label>
      </div>

      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Condomínio</th>
              <th>Payment collection</th>
              <th>Valor</th>
              <th>PIX code</th>
              <th>QR</th>
              <th>TXID</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center" }}>Carregando...</td>
              </tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center" }}>Nenhuma pendência encontrada.</td>
              </tr>
            ) : (
              pending.map((item, index) => (
                <tr key={`${item.payment_collection_id || index}`}>
                  <td>{item.user_name || item.user_email || "—"}</td>
                  <td>{item.user_email || "—"}</td>
                  <td>{item.details?.company_name || "—"}</td>
                  <td>{item.payment_collection_id || "—"}</td>
                  <td>{formatMoney(item.details?.amount, item.details?.currency_code || "brl")}</td>
                  <td style={{ maxWidth: 260, whiteSpace: "normal" }}>{item.details?.pix_code || "—"}</td>
                  <td>
                    {item.details?.pix_qr ? (
                      <img
                        src={item.details.pix_qr}
                        alt="QR PIX"
                        style={{ width: 64, height: 64, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)" }}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{item.details?.pix_txid || "—"}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={async () => {
                          if (!item.details?.pix_code) return
                          try {
                            await navigator.clipboard.writeText(item.details.pix_code)
                            pushToast({ title: "Código PIX copiado", variant: "success" })
                          } catch {
                            pushToast({ title: "Não foi possível copiar", variant: "error" })
                          }
                        }}
                      >
                        Copiar PIX
                      </button>
                      {item.details?.pix_code && (
                        <a
                          className="btn btn-secondary btn-sm"
                          href={`${medusaUrl}/store/custom/pix/qr?code=${encodeURIComponent(item.details.pix_code)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir QR
                        </a>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => handleConfirm(item)}
                        disabled={confirmingId === item.payment_collection_id}
                      >
                        {confirmingId === item.payment_collection_id ? "Confirmando..." : "Confirmar"}
                      </button>
                    </div>
                  </td>
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
