import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { AdminCompany, StoreUser } from "../types"
import { formatCnpj } from "../utils/format"

type PartnersSectionProps = {
  companies: AdminCompany[]
  storeUsers: StoreUser[]
  businessTypes: { key: string; label: string }[]
  mode?: "list" | "detail"
  companyId?: string
}

type CompanyStats = {
  users: StoreUser[]
  approved: boolean | null
}

export default function PartnersSection({
  companies,
  storeUsers,
  businessTypes,
  mode = "list",
  companyId,
}: PartnersSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedCompanyId = params.companyId || companyId
  const isDetailMode = mode === "detail"
  const [search, setSearch] = useState("")

  const businessTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    businessTypes.forEach((type) => map.set(type.key, type.label))
    return map
  }, [businessTypes])

  const companyStats = useMemo(() => {
    const map = new Map<string, CompanyStats>()
    storeUsers.forEach((user) => {
      const entries = user.companies || []
      entries.forEach((company) => {
        const current = map.get(company.id) || { users: [], approved: null }
        current.users.push(user)
        if (company.approved) {
          current.approved = true
        } else if (current.approved === null) {
          current.approved = false
        }
        map.set(company.id, current)
      })
    })
    return map
  }, [storeUsers])

  const getStatusInfo = (companyId: string) => {
    const stats = companyStats.get(companyId)
    if (!stats || stats.approved === null) {
      return { label: "—", className: "default" }
    }
    if (stats.approved) {
      return { label: "Aprovado", className: "active" }
    }
    return { label: "Pendente", className: "scheduled" }
  }

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies
    const term = search.trim().toLowerCase()
    return companies.filter((company) => {
      const typeLabel = company.business_type ? businessTypeMap.get(company.business_type) || "" : ""
      return (
        (company.trade_name || "").toLowerCase().includes(term) ||
        (company.fantasy_name || "").toLowerCase().includes(term) ||
        (company.cnpj || "").toLowerCase().includes(term) ||
        (company.customer_id || "").toLowerCase().includes(term) ||
        typeLabel.toLowerCase().includes(term)
      )
    })
  }, [companies, search, businessTypeMap])

  const approvedCompanies = useMemo(
    () => companies.filter((company) => companyStats.get(company.id)?.approved).length,
    [companies, companyStats]
  )

  const pendingCompanies = useMemo(
    () => companies.filter((company) => companyStats.get(company.id)?.approved === false).length,
    [companies, companyStats]
  )

  if (isDetailMode) {
    const company = companies.find((item) => item.id === resolvedCompanyId) || null

    if (!company) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Parceiro</h1>
            <p className="page-subtitle">Parceiro não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/parceiros")}
          >
            Voltar para parceiros
          </button>
        </div>
      )
    }

    const status = getStatusInfo(company.id)
    const linkedUsers = companyStats.get(company.id)?.users || []

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Parceiro</h1>
          <p className="page-subtitle">{company.trade_name || company.fantasy_name || company.id}</p>
        </header>

        <div className="action-bar">
          <div className="action-bar-group">
            <button className="btn btn-secondary" type="button" onClick={() => navigate("/parceiros")}>
              Voltar
            </button>
          </div>
          <button
            className="btn"
            type="button"
            onClick={() => navigate(`/pagamentos/${company.id}`)}
          >
            Ver pagamentos
          </button>
        </div>

        <section className="panel" style={{ maxWidth: "820px", marginBottom: "1rem" }}>
          <h3>Dados do parceiro</h3>
          <div className="grid" style={{ gap: "0.75rem", marginTop: "0.75rem" }}>
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
              <span className="muted">Tipo de negócio</span>
              <span>{company.business_type ? businessTypeMap.get(company.business_type) || "—" : "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Status</span>
              <span className={`status-chip ${status.className}`}>{status.label}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Usuários vinculados</span>
              <span>{linkedUsers.length}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Customer ID</span>
              <span>{company.customer_id}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h3>Usuários vinculados</h3>
          {linkedUsers.length === 0 ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Nenhum usuário vinculado a este parceiro.
            </p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Status</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedUsers.map((user) => {
                    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—"
                    return (
                      <tr key={`${company.id}-${user.id}`}>
                        <td>{name}</td>
                        <td>{user.email || "—"}</td>
                        <td>{user.phone || "—"}</td>
                        <td>{user.disabled ? "Desativado" : "Ativo"}</td>
                        <td>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Parceiros</h1>
        <p className="muted">Acompanhe os estabelecimentos aprovados e seus usuários vinculados.</p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Parceiros</span>
          <strong style={{ fontSize: "1.6rem" }}>{companies.length}</strong>
          <span className="muted">Total cadastrados</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Aprovados</span>
          <strong style={{ fontSize: "1.6rem" }}>{approvedCompanies}</strong>
          <span className="muted">Liberados para operar</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pendentes</span>
          <strong style={{ fontSize: "1.6rem" }}>{pendingCompanies}</strong>
          <span className="muted">Aguardando aprovação</span>
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
            <h3>Empresas parceiras</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Veja os dados principais e acesse o detalhe de cada parceiro.
            </p>
          </div>
          <span className="pill">{filteredCompanies.length} registros</span>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <input
            className="field-input"
            placeholder="Busque por nome, CNPJ ou tipo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Razão social</th>
                <th>Nome fantasia</th>
                <th>CNPJ</th>
                <th>Tipo</th>
                <th>Usuários</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => {
                  const status = getStatusInfo(company.id)
                  const usersCount = companyStats.get(company.id)?.users.length || 0
                  return (
                    <tr key={company.id}>
                      <td>{company.trade_name || "—"}</td>
                      <td>{company.fantasy_name || "—"}</td>
                      <td>{formatCnpj(company.cnpj || undefined)}</td>
                      <td>{company.business_type ? businessTypeMap.get(company.business_type) || "—" : "—"}</td>
                      <td>{usersCount}</td>
                      <td>
                        <span className={`status-chip ${status.className}`}>{status.label}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => navigate(`/parceiros/${company.id}`)}
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
