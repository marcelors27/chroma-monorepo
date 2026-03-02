import { FormEvent, useMemo, useState } from "react"

import type {
  AdminAccessProfile,
  AdminSectionDefinition,
  ProfilePermissions,
  UserProfileAssignments,
} from "../types"

type AccessManagementSectionProps = {
  currentUserEmail: string
  hardcodedAdminEmails: string[]
  sections: AdminSectionDefinition[]
  profileAssignments: UserProfileAssignments
  permissionsByProfile: ProfilePermissions
  onUpsertAssignment: (email: string, profile: AdminAccessProfile) => void
  onRemoveAssignment: (email: string) => void
  onTogglePermission: (profile: Exclude<AdminAccessProfile, "admin">, sectionId: AdminSectionDefinition["id"]) => void
  onResetRestrictedProfiles: () => void
}

const PROFILE_LABELS: Record<AdminAccessProfile, string> = {
  admin: "Admin",
  partner: "Partner",
  support: "Support",
}

const RESTRICTED_PROFILES: Exclude<AdminAccessProfile, "admin">[] = ["partner", "support"]

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export default function AccessManagementSection({
  currentUserEmail,
  hardcodedAdminEmails,
  sections,
  profileAssignments,
  permissionsByProfile,
  onUpsertAssignment,
  onRemoveAssignment,
  onTogglePermission,
  onResetRestrictedProfiles,
}: AccessManagementSectionProps) {
  const [email, setEmail] = useState("")
  const [profile, setProfile] = useState<AdminAccessProfile>("partner")

  const assignmentRows = useMemo(
    () =>
      Object.entries(profileAssignments)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([assignedEmail, assignedProfile]) => ({
          email: assignedEmail,
          profile: assignedProfile,
        })),
    [profileAssignments]
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = normalizeEmail(email)
    if (!normalized) return
    onUpsertAssignment(normalized, profile)
    setEmail("")
    setProfile("partner")
  }

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <header className="page-header">
        <h1 className="page-title">Gestao de acessos</h1>
        <p className="page-subtitle">
          Configure perfis por e-mail e permissões por módulo. O perfil admin sempre tem acesso total.
        </p>
      </header>

      <div className="panel grid" style={{ gap: "0.9rem" }}>
        <h2>Contexto da sessao</h2>
        <div className="grid" style={{ gap: "0.4rem" }}>
          <span className="muted">Usuário autenticado: {currentUserEmail}</span>
          <span className="muted">Admins hardcoded: {hardcodedAdminEmails.join(", ")}</span>
        </div>
      </div>

      <div className="panel grid" style={{ gap: "0.9rem" }}>
        <h2>Perfis por usuario</h2>
        <form className="grid" style={{ gap: "0.6rem" }} onSubmit={handleSubmit}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">E-mail</span>
            <input
              className="field-input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@empresa.com"
            />
          </label>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Perfil</span>
            <select
              className="field-input"
              value={profile}
              onChange={(event) => setProfile(event.target.value as AdminAccessProfile)}
            >
              <option value="admin">Admin</option>
              <option value="partner">Partner</option>
              <option value="support">Support</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" type="submit">
              Salvar perfil
            </button>
            <button className="btn btn-secondary" type="button" onClick={onResetRestrictedProfiles}>
              Zerar acessos de partner/support
            </button>
          </div>
        </form>

        {assignmentRows.length === 0 ? (
          <span className="muted">Nenhum usuário mapeado manualmente.</span>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {assignmentRows.map((row) => (
                  <tr key={row.email}>
                    <td>{row.email}</td>
                    <td>
                      <span className="badge">{PROFILE_LABELS[row.profile]}</span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => onRemoveAssignment(row.email)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel grid" style={{ gap: "0.9rem" }}>
        <h2>Permissoes por modulo</h2>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Admin e hardcoded admin possuem acesso completo, independentemente desta matriz.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Admin</th>
                <th>Partner</th>
                <th>Support</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id}>
                  <td>{section.label}</td>
                  <td>
                    <span className="status-chip active">FULL</span>
                  </td>
                  {RESTRICTED_PROFILES.map((restrictedProfile) => {
                    const checked = permissionsByProfile[restrictedProfile].includes(section.id)
                    return (
                      <td key={`${section.id}-${restrictedProfile}`}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          <input
                            className="checkbox"
                            type="checkbox"
                            checked={checked}
                            onChange={() => onTogglePermission(restrictedProfile, section.id)}
                          />
                          <span className="muted">Permitir</span>
                        </label>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
