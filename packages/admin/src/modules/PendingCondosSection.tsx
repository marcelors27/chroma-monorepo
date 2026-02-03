import type { Dispatch, SetStateAction } from "react"

import { PendingCompany } from "../types"
import { formatCnpj } from "../utils/format"

type PendingCondosSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  pendingCompanies: PendingCompany[]
  setPendingCompanies: Dispatch<SetStateAction<PendingCompany[]>>
  pendingCompaniesError: string | null
  setPendingCompaniesError: Dispatch<SetStateAction<string | null>>
  pendingCompanyActionId: string | null
  setPendingCompanyActionId: Dispatch<SetStateAction<string | null>>
}

export default function PendingCondosSection({
  medusaUrl,
  headers,
  pendingCompanies,
  setPendingCompanies,
  pendingCompaniesError,
  setPendingCompaniesError,
  pendingCompanyActionId,
  setPendingCompanyActionId,
}: PendingCondosSectionProps) {
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

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Condomínios pendentes</h1>
        <p className="muted">Revise e aprove os condomínios pendentes de acesso.</p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pendências</span>
          <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies.length}</strong>
          <span className="muted">Empresas aguardando</span>
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
    </div>
  )
}
