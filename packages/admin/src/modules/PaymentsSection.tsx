import type { Dispatch, SetStateAction } from "react"

import { AdminCompany, PendingCompany, StockLocation } from "../types"
import { formatCnpj } from "../utils/format"

type PaymentsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  pendingCompanies: PendingCompany[]
  setPendingCompanies: Dispatch<SetStateAction<PendingCompany[]>>
  pendingCompaniesError: string | null
  setPendingCompaniesError: Dispatch<SetStateAction<string | null>>
  pendingCompanyActionId: string | null
  setPendingCompanyActionId: Dispatch<SetStateAction<string | null>>
  companies: AdminCompany[]
  setCompanies: Dispatch<SetStateAction<AdminCompany[]>>
  companiesError: string | null
  setCompaniesError: Dispatch<SetStateAction<string | null>>
  companyEmailEdits: Record<string, string>
  setCompanyEmailEdits: Dispatch<SetStateAction<Record<string, string>>>
  companySavingId: string | null
  setCompanySavingId: Dispatch<SetStateAction<string | null>>
  stockLocations: StockLocation[]
}

export default function PaymentsSection({
  medusaUrl,
  headers,
  pendingCompanies,
  setPendingCompanies,
  pendingCompaniesError,
  setPendingCompaniesError,
  pendingCompanyActionId,
  setPendingCompanyActionId,
  companies,
  setCompanies,
  companiesError,
  setCompaniesError,
  companyEmailEdits,
  setCompanyEmailEdits,
  companySavingId,
  setCompanySavingId,
  stockLocations,
}: PaymentsSectionProps) {
  async function setCompanyApproval(companyId: string, approved: boolean) {
    setPendingCompanyActionId(companyId)
    try {
      const endpoint = approved ? "approve" : "reject"
      const res = await fetch(`${medusaUrl}/admin/companies/${companyId}/${endpoint}`, {
        method: "POST",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar status")
      }
      setPendingCompanies((prev) => prev.filter((company) => company.id !== companyId))
    } catch (err: any) {
      setPendingCompaniesError(err?.message || "Erro ao alterar status")
    } finally {
      setPendingCompanyActionId(null)
    }
  }

  const handleCompanyEmailChange = (companyId: string, value: string) => {
    setCompanyEmailEdits((prev) => ({ ...prev, [companyId]: value }))
  }

  const saveCompanyBillingEmails = async (company: AdminCompany) => {
    setCompanySavingId(company.id)
    setCompaniesError(null)
    try {
      const payload = {
        customer_id: company.customer_id,
        billing_emails: companyEmailEdits[company.id] || "",
      }
      const res = await fetch(`${medusaUrl}/admin/companies/${company.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível salvar os e-mails")
      }
      const json = await res.json()
      const updated = json?.company
      if (updated) {
        setCompanies((prev) => prev.map((item) => (item.id === company.id ? updated : item)))
      }
    } catch (err: any) {
      setCompaniesError(err?.message || "Erro ao salvar e-mails")
    } finally {
      setCompanySavingId(null)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Pagamentos</h1>
        <p className="muted">Acompanhe aprovações e configure responsáveis pelos boletos e PIX.</p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pendências</span>
          <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies.length}</strong>
          <span className="muted">Empresas aguardando</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Condomínios</span>
          <strong style={{ fontSize: "1.6rem" }}>{companies.length}</strong>
          <span className="muted">Com cadastro ativo</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Boletos/PIX</span>
          <strong style={{ fontSize: "1.6rem" }}>
            {companies.filter((company) => companyEmailEdits[company.id]?.trim()).length}
          </strong>
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
            <h3>Empresas aguardando aprovação</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Use os dados da empresa para liberar ou negar o acesso ao catálogo.
            </p>
          </div>
          <span className="pill">{pendingCompanies.length} pendentes</span>
        </div>

        {pendingCompaniesError && <div className="muted">Erro: {pendingCompaniesError}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Nome fantasia</th>
                <th>CNPJ</th>
                <th>E-mail</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Nenhum cadastro aguardando análise.
                  </td>
                </tr>
              ) : (
                pendingCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.trade_name || "—"}</td>
                    <td>{company.fantasy_name || "—"}</td>
                    <td>{formatCnpj(company.cnpj || undefined)}</td>
                    <td>{company.customer_email || "—"}</td>
                    <td>
                      {company.created_at
                        ? new Date(company.created_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => setCompanyApproval(company.id, true)}
                        disabled={pendingCompanyActionId === company.id}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCompanyApproval(company.id, false)}
                        disabled={pendingCompanyActionId === company.id}
                      >
                        Rejeitar
                      </button>
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

        {companiesError && <div className="muted">Erro: {companiesError}</div>}

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
                    <td style={{ minWidth: "320px" }}>
                      <input
                        value={companyEmailEdits[company.id] || ""}
                        onChange={(e) => handleCompanyEmailChange(company.id, e.target.value)}
                        placeholder="financeiro@condominio.com.br, sindico@condominio.com.br"
                        className="field-input"
                      />
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        Separe por vírgula ou ponto e vírgula.
                      </span>
                    </td>
                    <td>{Number(company?.metadata?.points_balance || 0)}</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => saveCompanyBillingEmails(company)}
                        disabled={companySavingId === company.id}
                      >
                        {companySavingId === company.id ? "Salvando..." : "Salvar"}
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
