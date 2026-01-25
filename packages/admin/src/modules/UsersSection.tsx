import type { Dispatch, FormEvent, SetStateAction } from "react"
import { Fragment, useMemo, useState } from "react"

import type { StoreUser } from "../types"
import { formatCnpj } from "../utils/format"

type UsersSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  users: StoreUser[]
  setUsers: Dispatch<SetStateAction<StoreUser[]>>
  usersError: string | null
  setUsersError: Dispatch<SetStateAction<string | null>>
}

export default function UsersSection({
  medusaUrl,
  headers,
  users,
  setUsers,
  usersError,
  setUsersError,
}: UsersSectionProps) {
  const [createForm, setCreateForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [creating, setCreating] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showIdentityUsers, setShowIdentityUsers] = useState(true)
  const [usersNotice, setUsersNotice] = useState<string | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  const totalCompanies = useMemo(
    () => users.reduce((acc, user) => acc + (user.companies?.length || 0), 0),
    [users]
  )
  const approvedCompanies = useMemo(
    () =>
      users.reduce(
        (acc, user) =>
          acc + (user.companies?.filter((company) => company?.approved).length || 0),
        0
      ),
    [users]
  )

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const term = search.trim().toLowerCase()
    return users.filter((user) => {
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase()
      const email = user.email?.toLowerCase() || ""
      const phone = user.phone?.toLowerCase() || ""
      const companies = user.companies || []
      const companyMatch = companies.some((company) => {
        const label = `${company.fantasy_name || ""} ${company.trade_name || ""} ${
          company.cnpj || ""
        }`.toLowerCase()
        return label.includes(term)
      })
      return name.includes(term) || email.includes(term) || phone.includes(term) || companyMatch
    })
  }, [users, search])

  const visibleUsers = useMemo(() => {
    if (showIdentityUsers) return filteredUsers
    return filteredUsers.filter((user) => user.source !== "identity")
  }, [filteredUsers, showIdentityUsers])

  const refreshUsers = async () => {
    try {
      const res = await fetch(`${medusaUrl}/admin/store-users?limit=500`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível buscar usuários")
      }
      const json = await res.json()
      setUsers(json.users ?? [])
      setUsersError(null)
    } catch (err: any) {
      setUsersError(err?.message || "Erro ao buscar usuários")
    }
  }

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const toggleUserStatus = async (user: StoreUser) => {
    setStatusChangingId(user.id)
    setUsersError(null)
    setUsersNotice(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/store-users/${user.id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ disabled: !user.disabled }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar o usuário")
      }
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, disabled: !user.disabled } : item))
      )
    } catch (err: any) {
      setUsersError(err?.message || "Erro ao atualizar usuário")
    } finally {
      setStatusChangingId(null)
    }
  }

  const generatePassword = () => {
    const length = 12
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    const values = new Uint32Array(length)
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(values)
      return Array.from(values, (value) => charset[value % charset.length]).join("")
    }
    return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join(
      ""
    )
  }

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault()
    if (!createForm.email) {
      setUsersError("Informe o e-mail do usuário")
      return
    }
    setCreating(true)
    setUsersError(null)
    setUsersNotice(null)
    try {
      const password = generatePassword()
      const res = await fetch(`${medusaUrl}/auth/customer/emailpass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          password,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar usuário")
      }
      const registerJson = await res.json()
      const token = registerJson?.token
      if (token) {
        await fetch(`${medusaUrl}/store/customers/me`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: createForm.first_name || undefined,
            last_name: createForm.last_name || undefined,
            phone: createForm.phone || undefined,
          }),
        })
      }
      const sendRes = await fetch(`${medusaUrl}/admin/store-users/send-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: createForm.email,
          password,
          first_name: createForm.first_name || undefined,
          last_name: createForm.last_name || undefined,
          kind: "invite",
        }),
      })
      if (!sendRes.ok) {
        const body = await sendRes.text()
        throw new Error(body || "Não foi possível enviar a senha por e-mail")
      }
      setCreateForm({ email: "", first_name: "", last_name: "", phone: "" })
      setUsersNotice("Senha provisória enviada por e-mail.")
      await refreshUsers()
    } catch (err: any) {
      setUsersError(err?.message || "Erro ao criar usuário")
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setResettingId(userId)
    setUsersError(null)
    setUsersNotice(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/store-users/${userId}/reset-password`, {
        method: "POST",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível resetar a senha")
      }
      setUsersNotice("Senha resetada e enviada por e-mail.")
    } catch (err: any) {
      setUsersError(err?.message || "Erro ao resetar a senha")
    } finally {
      setResettingId(null)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Usuários do front-store</h1>
        <p className="muted">
          Cadastre contas, resete senhas e acompanhe os condomínios vinculados.
        </p>
      </header>

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Usuários</span>
          <strong style={{ fontSize: "1.6rem" }}>{users.length}</strong>
          <span className="muted">Contas cadastradas</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Condomínios</span>
          <strong style={{ fontSize: "1.6rem" }}>{totalCompanies}</strong>
          <span className="muted">Vinculados aos usuários</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Aprovados</span>
          <strong style={{ fontSize: "1.6rem" }}>{approvedCompanies}</strong>
          <span className="muted">Condomínios liberados</span>
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
            <h3>Criar usuário</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Envie um convite com senha provisória para o usuário acessar o front-store.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className="grid" style={{ gap: "0.75rem" }}>
          <div
            className="grid"
            style={{ gap: "0.5rem", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr auto" }}
          >
            <input
              className="field-input"
              type="email"
              placeholder="email@exemplo.com"
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              className="field-input"
              placeholder="Nome"
              value={createForm.first_name}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, first_name: event.target.value }))
              }
            />
            <input
              className="field-input"
              placeholder="Sobrenome"
              value={createForm.last_name}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, last_name: event.target.value }))
              }
            />
            <input
              className="field-input"
              placeholder="Telefone"
              value={createForm.phone}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Uma senha provisória será gerada automaticamente e enviada por e-mail.
          </span>
        </form>
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
            <h3>Usuários cadastrados</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Veja os condomínios por usuário e resete senhas quando necessário.
            </p>
          </div>
          <span className="pill">{visibleUsers.length} registros</span>
        </div>

        {usersError && <div className="muted">Erro: {usersError}</div>}
        {usersNotice && <div className="muted">{usersNotice}</div>}

        <div style={{ marginBottom: "0.75rem", display: "grid", gap: "0.5rem" }}>
          <input
            className="field-input"
            placeholder="Busque por nome, e-mail ou condomínio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={showIdentityUsers}
              onChange={(event) => setShowIdentityUsers(event.target.checked)}
            />
            <span className="muted">Mostrar identidades sem customer</span>
          </label>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Condomínios</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center" }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const name =
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—"
                  const companies = user.companies || []
                  const isExpanded = expandedUsers.has(user.id)
                  const approvedCount = companies.filter((company) => company?.approved).length
                  return (
                    <Fragment key={user.id}>
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span>{name}</span>
                            {user.source === "identity" && (
                              <span className="rule-tag">Sem customer</span>
                            )}
                            {user.disabled && <span className="rule-tag">Desativado</span>}
                          </div>
                        </td>
                        <td>{user.email || "—"}</td>
                        <td>{user.phone || "—"}</td>
                        <td>
                          {companies.length
                            ? `${companies.length} (${approvedCount} aprov.)`
                            : "Nenhum"}
                        </td>
                        <td>{user.disabled ? "Desativado" : "Ativo"}</td>
                        <td>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td style={{ minWidth: "220px" }}>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              className="btn btn-sm"
                              type="button"
                              disabled={resettingId === user.id}
                              onClick={() => handleResetPassword(user.id)}
                            >
                              {resettingId === user.id ? "Resetando..." : "Resetar"}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              disabled={statusChangingId === user.id}
                              onClick={() => toggleUserStatus(user)}
                            >
                              {statusChangingId === user.id
                                ? "Salvando..."
                                : user.disabled
                                ? "Ativar"
                                : "Desativar"}
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            type="button"
                            onClick={() => toggleExpanded(user.id)}
                            aria-label="Mostrar detalhes do usuário"
                            title="Detalhes"
                          >
                            ≡
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${user.id}-details`}>
                          <td colSpan={8}>
                            <div style={{ padding: "0.75rem 0" }}>
                              <div style={{ marginBottom: "0.5rem" }}>
                                <strong>Condomínios vinculados</strong>
                              </div>
                              {companies.length ? (
                                <div style={{ overflowX: "auto" }}>
                                  <table className="table">
                                    <thead>
                                      <tr>
                                        <th>ID</th>
                                        <th>Fantasia</th>
                                        <th>Razão social</th>
                                        <th>CNPJ</th>
                                        <th>Status</th>
                                        <th>Criado em</th>
                                        <th>E-mails</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {companies.map((company) => {
                                        const billing =
                                          company?.metadata?.billing_emails ||
                                          company?.metadata?.billingEmails ||
                                          ""
                                        const emails = Array.isArray(billing)
                                          ? billing.join(", ")
                                          : billing
                                        return (
                                          <tr key={`${user.id}-${company.id}-details`}>
                                            <td>{company.id}</td>
                                            <td>{company.fantasy_name || "—"}</td>
                                            <td>{company.trade_name || "—"}</td>
                                            <td>{formatCnpj(company.cnpj || undefined)}</td>
                                            <td>{company.approved ? "Aprovado" : "Pendente"}</td>
                                            <td>
                                              {company.created_at
                                                ? new Date(company.created_at).toLocaleDateString(
                                                    "pt-BR"
                                                  )
                                                : "—"}
                                            </td>
                                            <td>{emails || "—"}</td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <span className="muted">Nenhum condomínio vinculado.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
