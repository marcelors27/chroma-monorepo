import type { Dispatch, SetStateAction } from "react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

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
  businessTypes: { key: string; label: string }[]
  mode?: "list" | "review"
  companyId?: string
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
  businessTypes,
  mode = "list",
  companyId,
}: PendingCondosSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedCompanyId = params.companyId || companyId
  const isReviewMode = mode === "review"
  const [selectedType, setSelectedType] = useState<string>("")

  useEffect(() => {
    if (!isReviewMode) return
    const company = pendingCompanies.find((item) => item.id === resolvedCompanyId) || null
    const initial = company?.business_type || ""
    setSelectedType(initial)
  }, [isReviewMode, pendingCompanies, resolvedCompanyId, businessTypes])

  async function setCompanyApproval(companyId: string, approved: boolean, businessType?: string) {
    setPendingCompanyActionId(companyId)
    try {
      const endpoint = approved ? "approve" : "reject"
      const res = await fetch(`${medusaUrl}/admin/companies/${companyId}/${endpoint}`, {
        method: "POST",
        headers,
        body: approved && businessType ? JSON.stringify({ business_type: businessType }) : undefined,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar status")
      }
      setPendingCompanies((prev) => prev.filter((company) => company.id !== companyId))
      return true
    } catch (err: any) {
      setPendingCompaniesError(err?.message || "Erro ao alterar status")
      return false
    } finally {
      setPendingCompanyActionId(null)
    }
  }

  if (isReviewMode) {
    const company = pendingCompanies.find((item) => item.id === resolvedCompanyId) || null

    if (!company) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
          <h1 className="page-title">Revisar estabelecimento</h1>
          <p className="page-subtitle">Estabelecimento não encontrado.</p>
        </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/estabelecimentos-pendentes")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Revisar estabelecimento</h1>
          <p className="page-subtitle">{company.trade_name || company.fantasy_name || company.id}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/estabelecimentos-pendentes")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const ok = await setCompanyApproval(company.id, true, selectedType || undefined)
                if (ok) navigate("/estabelecimentos-pendentes")
              }}
              disabled={pendingCompanyActionId === company.id}
            >
              {pendingCompanyActionId === company.id ? "Salvando..." : "Aprovar"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={async () => {
                const ok = await setCompanyApproval(company.id, false)
                if (ok) navigate("/estabelecimentos-pendentes")
              }}
              disabled={pendingCompanyActionId === company.id}
            >
              {pendingCompanyActionId === company.id ? "Salvando..." : "Rejeitar"}
            </button>
          </div>
        </div>

        {pendingCompaniesError && <div className="panel muted">Erro: {pendingCompaniesError}</div>}

        <section className="panel" style={{ maxWidth: "720px" }}>
          <h3>Dados do estabelecimento</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Razão social</span>
              <span>{company.trade_name || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Nome fantasia</span>
              <span>{company.fantasy_name || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">CNPJ</span>
              <span>{formatCnpj(company.cnpj || undefined)}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Tipo de negócio (opcional alterar antes de aprovar)</span>
              <select
                className="field-input"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
              >
                <option value="">Manter tipo cadastrado</option>
                {businessTypes.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">E-mail</span>
              <span>{company.customer_email || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Criado em</span>
              <span>
                {company.created_at
                  ? new Date(company.created_at).toLocaleDateString("pt-BR")
                  : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Estabelecimentos pendentes</h1>
        <p className="muted">Revise e aprove os estabelecimentos pendentes de acesso.</p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pendências</span>
          <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies.length}</strong>
          <span className="muted">Estabelecimentos aguardando</span>
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
            <h3>Estabelecimentos aguardando aprovação</h3>
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
                <th>Tipo</th>
                <th>E-mail</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Nenhum cadastro aguardando análise.
                  </td>
                </tr>
              ) : (
                pendingCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.trade_name || "—"}</td>
                    <td>{company.fantasy_name || "—"}</td>
                    <td>{formatCnpj(company.cnpj || undefined)}</td>
                    <td>
                      {businessTypes.find((type) => type.key === company.business_type)?.label ||
                        "—"}
                    </td>
                    <td>{company.customer_email || "—"}</td>
                    <td>
                      {company.created_at
                        ? new Date(company.created_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => navigate(`/estabelecimentos-pendentes/${company.id}`)}
                      >
                        Revisar
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
