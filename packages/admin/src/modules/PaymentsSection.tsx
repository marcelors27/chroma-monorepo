import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useNavigate } from "react-router-dom"

import { AdminCompany, StockLocation } from "../types"

type PaymentsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  companies: AdminCompany[]
  setCompanies: Dispatch<SetStateAction<AdminCompany[]>>
  stockLocations: StockLocation[]
  mode?: "list" | "edit"
  companyId?: string
}

const getBillingEmailsValue = (company: AdminCompany) => {
  const value = company.metadata?.billing_emails
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "string") return value
  return ""
}

export default function PaymentsSection({
  medusaUrl,
  headers,
  companies,
  setCompanies,
  stockLocations,
  mode = "list",
  companyId,
}: PaymentsSectionProps) {
  const navigate = useNavigate()
  const isEditMode = mode === "edit"
  const [billingEmails, setBillingEmails] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCompany = useMemo(
    () => (isEditMode ? companies.find((company) => company.id === companyId) || null : null),
    [companies, companyId, isEditMode]
  )

  useEffect(() => {
    if (!activeCompany) return
    setBillingEmails(getBillingEmailsValue(activeCompany))
    setError(null)
  }, [activeCompany])

  const configuredCount = companies.filter((company) => getBillingEmailsValue(company).trim()).length

  const saveCompanyBillingEmails = async () => {
    if (!activeCompany) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        customer_id: activeCompany.customer_id,
        billing_emails: billingEmails.trim(),
      }
      const res = await fetch(`${medusaUrl}/admin/companies/${activeCompany.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível salvar os e-mails")
      }
      const json = await res.json()
      const updated = json?.company
      if (updated) {
        setCompanies((prev) => prev.map((item) => (item.id === activeCompany.id ? updated : item)))
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar e-mails")
    } finally {
      setSaving(false)
    }
  }

  if (isEditMode) {
    if (!activeCompany) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Editar cobrança</h1>
            <p className="page-subtitle">Condomínio não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/pagamentos")}>
            Voltar para pagamentos
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar cobrança</h1>
          <p className="page-subtitle">
            {activeCompany.fantasy_name || activeCompany.trade_name || "Condomínio"}
          </p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/pagamentos")}>
            Voltar
          </button>
          <button className="btn" type="button" onClick={saveCompanyBillingEmails} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {error && <div className="panel muted">Erro: {error}</div>}

        <section className="panel" style={{ maxWidth: "720px" }}>
          <h3>Detalhes do condomínio</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Customer ID</span>
              <span>{activeCompany.customer_id}</span>
            </div>
            {activeCompany.cnpj && (
              <div className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">CNPJ</span>
                <span>{activeCompany.cnpj}</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel" style={{ maxWidth: "720px", marginTop: "1rem" }}>
          <h3>Envio de boletos/PIX</h3>
          <label className="grid" style={{ gap: "0.35rem", marginTop: "0.75rem" }}>
            <span className="muted">E-mails de boleto/PIX</span>
            <input
              value={billingEmails}
              onChange={(e) => setBillingEmails(e.target.value)}
              placeholder="financeiro@condominio.com.br, sindico@condominio.com.br"
              className="field-input"
            />
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              Separe por vírgula ou ponto e vírgula.
            </span>
          </label>
          <div className="grid" style={{ gap: "0.35rem", marginTop: "1rem" }}>
            <span className="muted">Pontos</span>
            <strong>{Number(activeCompany?.metadata?.points_balance || 0)}</strong>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Pagamentos</h1>
        <p className="muted">Acompanhe aprovações e configure responsáveis pelos boletos e PIX.</p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Condomínios</span>
          <strong style={{ fontSize: "1.6rem" }}>{companies.length}</strong>
          <span className="muted">Com cadastro ativo</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Boletos/PIX</span>
          <strong style={{ fontSize: "1.6rem" }}>{configuredCount}</strong>
          <span className="muted">E-mails configurados</span>
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
          <div>
            <h3>Canais por estoque</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Veja quais canais estao associados a cada local.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Local</th>
                <th>Canais vinculados</th>
              </tr>
            </thead>
            <tbody>
              {stockLocations.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center" }}>
                    Nenhum local encontrado.
                  </td>
                </tr>
              ) : (
                stockLocations.map((location) => (
                  <tr key={location.id}>
                    <td>{location.name || location.id}</td>
                    <td>
                      {location.sales_channels?.length ? (
                        <div className="rule-tags">
                          {location.sales_channels.map((channel) => (
                            <span key={channel.id} className="rule-tag">
                              {channel.name || channel.id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">Nenhum canal</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
          <div>
            <h3>Destinatários de boleto/PIX</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Configure os e-mails que receberão boletos e códigos PIX por condomínio.
            </p>
          </div>
          <span className="pill">{companies.length} empresas</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Condomínio</th>
                <th>E-mails</th>
                <th>Pontos</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.fantasy_name || company.trade_name || "Condomínio"}</td>
                    <td>{getBillingEmailsValue(company) || "—"}</td>
                    <td>{Number(company?.metadata?.points_balance || 0)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/pagamentos/${company.id}`)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
