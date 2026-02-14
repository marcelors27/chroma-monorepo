import { useEffect, useMemo, useState } from "react"

import type { AdminCompany, StoreUser } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type BillingResendSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  companies: AdminCompany[]
  pushToast: (toast: ToastInput) => void
}

export default function BillingResendSection({
  medusaUrl,
  headers,
  users,
  companies,
  pushToast,
}: BillingResendSectionProps) {
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [method, setMethod] = useState<"pix" | "boleto">("pix")
  const [paymentCollectionId, setPaymentCollectionId] = useState("")
  const [pixCode, setPixCode] = useState("")
  const [pixQr, setPixQr] = useState("")
  const [boletoLine, setBoletoLine] = useState("")
  const [boletoUrl, setBoletoUrl] = useState("")
  const [boletoExpiresAt, setBoletoExpiresAt] = useState("")
  const [isLoadingLog, setIsLoadingLog] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const filteredCompanies = useMemo(() => {
    if (!selectedUser) return companies
    return companies.filter((company) => company.customer_id === selectedUser)
  }, [companies, selectedUser])

  useEffect(() => {
    if (!selectedUser && users.length) {
      setSelectedUser(users[0].id)
    }
  }, [users, selectedUser])

  useEffect(() => {
    if (!selectedCompany && filteredCompanies.length) {
      setSelectedCompany(filteredCompanies[0].id)
    }
  }, [filteredCompanies, selectedCompany])

  const loadLatestLog = async () => {
    if (!selectedUser || !selectedCompany) return
    setIsLoadingLog(true)
    try {
      const params = new URLSearchParams({
        user_id: selectedUser,
        company_id: selectedCompany,
        limit: "1",
      })
      const res = await fetch(`${medusaUrl}/admin/email-logs?${params.toString()}`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Erro ao buscar log")
      }
      const json = await res.json()
      const log = json.logs?.[0]
      if (!log) {
        pushToast({ title: "Nenhum log encontrado", variant: "error" })
        return
      }
      setMethod(log.method || (log.type?.includes("boleto") ? "boleto" : "pix"))
      setPaymentCollectionId(log.payment_collection_id || "")
      setPixCode(log.details?.pix_code || "")
      setPixQr(log.details?.pix_qr || "")
      setBoletoLine(log.details?.boleto_line || "")
      setBoletoUrl(log.details?.boleto_url || "")
      setBoletoExpiresAt(log.details?.boleto_expires_at || "")
      pushToast({ title: "Log carregado", variant: "success" })
    } catch (err: any) {
      pushToast({ title: err?.message || "Erro ao buscar log", variant: "error" })
    } finally {
      setIsLoadingLog(false)
    }
  }

  const handleSend = async () => {
    if (!selectedUser || !selectedCompany || !paymentCollectionId) {
      pushToast({ title: "Informe usuário, estabelecimento e payment_collection_id", variant: "error" })
      return
    }
    setIsSending(true)
    try {
      const details: Record<string, any> = {}
      if (method === "pix") {
        if (pixCode) details.pix_code = pixCode
        if (pixQr) details.pix_qr = pixQr
      } else {
        if (boletoLine) details.boleto_line = boletoLine
        if (boletoUrl) details.boleto_url = boletoUrl
        if (boletoExpiresAt) details.boleto_expires_at = boletoExpiresAt
      }

      const res = await fetch(`${medusaUrl}/admin/notifications/pending-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          method,
          payment_collection_id: paymentCollectionId,
          company_id: selectedCompany,
          customer_id: selectedUser,
          details,
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
      setIsSending(false)
    }
  }

  return (
    <div className="panel">
      <div style={{ marginBottom: "1rem" }}>
        <h2 data-testid="admin-billing-resend-title">Reenvio de cobranças</h2>
        <p className="muted">Envie novamente cobranças de PIX ou boleto para usuário/estabelecimento.</p>
      </div>

      <div className="grid" style={{ gap: "1rem" }}>
        <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Usuário</span>
            <select className="field-input" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email || user.id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Estabelecimento</span>
            <select className="field-input" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
              <option value="">Selecione</option>
              {filteredCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.fantasy_name || company.trade_name || company.id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Método</span>
            <select className="field-input" value={method} onChange={(e) => setMethod(e.target.value as "pix" | "boleto")}>
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
            </select>
          </label>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Payment collection ID</span>
            <input className="field-input" value={paymentCollectionId} onChange={(e) => setPaymentCollectionId(e.target.value)} />
          </label>
        </div>

        {method === "pix" ? (
          <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Código PIX</span>
              <input className="field-input" value={pixCode} onChange={(e) => setPixCode(e.target.value)} />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">QR Code (URL)</span>
              <input className="field-input" value={pixQr} onChange={(e) => setPixQr(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="grid" style={{ gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Linha digitável</span>
              <input className="field-input" value={boletoLine} onChange={(e) => setBoletoLine(e.target.value)} />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">URL do boleto (PDF)</span>
              <input className="field-input" value={boletoUrl} onChange={(e) => setBoletoUrl(e.target.value)} />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Vencimento</span>
              <input type="date" className="field-input" value={boletoExpiresAt} onChange={(e) => setBoletoExpiresAt(e.target.value)} />
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-secondary" type="button" onClick={loadLatestLog} disabled={isLoadingLog}>
            {isLoadingLog ? "Carregando..." : "Usar último log"}
          </button>
          <button className="btn" type="button" onClick={handleSend} disabled={isSending}>
            {isSending ? "Enviando..." : "Reenviar cobrança"}
          </button>
        </div>
      </div>
    </div>
  )
}
