import type { Dispatch, SetStateAction, FormEvent } from "react"
import { useState } from "react"

import type { BusinessType } from "../types"

type BusinessTypesSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  businessTypes: BusinessType[]
  setBusinessTypes: Dispatch<SetStateAction<BusinessType[]>>
  businessTypesError: string | null
  setBusinessTypesError: Dispatch<SetStateAction<string | null>>
}

const emptyForm = {
  key: "",
  label: "",
  label_plural: "",
  article_singular: "",
  article_plural: "",
  terms_json: "{}",
  is_active: true,
}

export default function BusinessTypesSection({
  medusaUrl,
  headers,
  businessTypes,
  setBusinessTypes,
  businessTypesError,
  setBusinessTypesError,
}: BusinessTypesSectionProps) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState({ ...emptyForm })

  const refresh = async () => {
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível buscar tipos de negócio")
      }
      const json = await res.json()
      setBusinessTypes(json.business_types ?? [])
      setBusinessTypesError(null)
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao buscar tipos de negócio")
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.label || !form.label_plural || !form.key) {
      setBusinessTypesError("Informe key, label e label plural")
      return
    }
    let terms: Record<string, string> = {}
    if (form.terms_json && form.terms_json.trim()) {
      try {
        const parsed = JSON.parse(form.terms_json)
        if (parsed && typeof parsed === "object") {
          terms = parsed
        } else {
          setBusinessTypesError("Termos precisa ser um JSON válido")
          return
        }
      } catch {
        setBusinessTypesError("Termos precisa ser um JSON válido")
        return
      }
    }
    setCreating(true)
    setBusinessTypesError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, terms }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar tipo de negócio")
      }
      const json = await res.json()
      setBusinessTypes((prev) => [json.business_type, ...prev])
      setForm({ ...emptyForm })
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao criar tipo de negócio")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (item: BusinessType) => {
    setEditingId(item.id)
    setEditingForm({
      key: item.key,
      label: item.label,
      label_plural: item.label_plural,
      article_singular: item.article_singular || "",
      article_plural: item.article_plural || "",
      terms_json: JSON.stringify(item.terms || {}, null, 2),
      is_active: item.is_active ?? true,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleUpdate = async (id: string) => {
    setBusinessTypesError(null)
    let terms: Record<string, string> = {}
    if (editingForm.terms_json && editingForm.terms_json.trim()) {
      try {
        const parsed = JSON.parse(editingForm.terms_json)
        if (parsed && typeof parsed === "object") {
          terms = parsed
        } else {
          setBusinessTypesError("Termos precisa ser um JSON válido")
          return
        }
      } catch {
        setBusinessTypesError("Termos precisa ser um JSON válido")
        return
      }
    }
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ...editingForm, terms }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar tipo de negócio")
      }
      await refresh()
      setEditingId(null)
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao atualizar tipo de negócio")
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Remover este tipo de negócio? Essa ação não pode ser desfeita.")
    if (!confirmed) return
    setBusinessTypesError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível remover tipo de negócio")
      }
      setBusinessTypes((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao remover tipo de negócio")
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Tipos de negócio</h1>
        <p className="muted">Configure os segmentos disponíveis para os estabelecimentos.</p>
      </header>

      <section className="panel">
        <h3>Novo tipo</h3>
        <form onSubmit={handleCreate} className="grid" style={{ gap: "0.6rem", marginTop: "0.75rem" }}>
          <div
            className="grid"
            style={{ gap: "0.5rem", gridTemplateColumns: "1fr 1.2fr 1.2fr 0.6fr 0.6fr auto" }}
          >
            <input
              className="field-input"
              placeholder="key (ex: loja)"
              value={form.key}
              onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Label (ex: Loja)"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Label plural (ex: Lojas)"
              value={form.label_plural}
              onChange={(event) => setForm((prev) => ({ ...prev, label_plural: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Artigo sing. (ex: do/da)"
              value={form.article_singular}
              onChange={(event) => setForm((prev) => ({ ...prev, article_singular: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Artigo plural (ex: dos/das)"
              value={form.article_plural}
              onChange={(event) => setForm((prev) => ({ ...prev, article_plural: event.target.value }))}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              Ativo
            </label>
          </div>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Termos (JSON)</span>
            <textarea
              className="field-input"
              rows={4}
              placeholder='{"responsible_label":"Síndico","unit_label":"Unidade"}'
              value={form.terms_json}
              onChange={(event) => setForm((prev) => ({ ...prev, terms_json: event.target.value }))}
            />
          </label>
          <div>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Criando..." : "Criar tipo"}
            </button>
          </div>
        </form>
        {businessTypesError && <div className="muted" style={{ marginTop: "0.5rem" }}>Erro: {businessTypesError}</div>}
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Tipos cadastrados</h3>
          <span className="pill">{businessTypes.length} registros</span>
        </div>

        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Label</th>
                <th>Plural</th>
                <th>Artigo</th>
                <th>Termos</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {businessTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Nenhum tipo cadastrado.
                  </td>
                </tr>
              ) : (
                businessTypes.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id}>
                      <td>{isEditing ? (
                        <input
                          className="field-input"
                          value={editingForm.key}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, key: event.target.value }))}
                        />
                      ) : (
                        item.key
                      )}</td>
                      <td>{isEditing ? (
                        <input
                          className="field-input"
                          value={editingForm.label}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, label: event.target.value }))}
                        />
                      ) : (
                        item.label
                      )}</td>
                      <td>{isEditing ? (
                        <input
                          className="field-input"
                          value={editingForm.label_plural}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, label_plural: event.target.value }))}
                        />
                      ) : (
                        item.label_plural
                      )}</td>
                      <td>{isEditing ? (
                        <div style={{ display: "grid", gap: "0.25rem" }}>
                          <input
                            className="field-input"
                            placeholder="sing."
                            value={editingForm.article_singular}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, article_singular: event.target.value }))
                            }
                          />
                          <input
                            className="field-input"
                            placeholder="plural"
                            value={editingForm.article_plural}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, article_plural: event.target.value }))
                            }
                          />
                        </div>
                      ) : (
                        `${item.article_singular || "—"} / ${item.article_plural || "—"}`
                      )}</td>
                      <td>{isEditing ? (
                        <textarea
                          className="field-input"
                          rows={4}
                          value={editingForm.terms_json}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, terms_json: event.target.value }))
                          }
                        />
                      ) : (
                        Object.keys(item.terms || {}).length ? "Personalizado" : "—"
                      )}</td>
                      <td>{isEditing ? (
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <input
                            type="checkbox"
                            checked={editingForm.is_active}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, is_active: event.target.checked }))
                            }
                          />
                          Ativo
                        </label>
                      ) : (
                        item.is_active ? "Sim" : "Não"
                      )}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-sm" type="button" onClick={() => handleUpdate(item.id)}>
                              Salvar
                            </button>
                            <button className="btn btn-secondary btn-sm" type="button" onClick={cancelEdit}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-secondary btn-sm" type="button" onClick={() => startEdit(item)}>
                              Editar
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              style={{ color: "#c23b3b", borderColor: "rgba(194, 59, 59, 0.35)" }}
                            >
                              Remover
                            </button>
                          </div>
                        )}
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
