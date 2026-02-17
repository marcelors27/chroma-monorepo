import type { Dispatch, FormEvent, SetStateAction } from "react"
import { useState } from "react"

import type { Manufacturer } from "../types"

type ManufacturersSectionProps = {
  medusaUrl: string
  token: string | null
  headers: Record<string, string>
  manufacturers: Manufacturer[]
  setManufacturers: Dispatch<SetStateAction<Manufacturer[]>>
  manufacturersError: string | null
  setManufacturersError: Dispatch<SetStateAction<string | null>>
}

const emptyForm = {
  name: "",
  slug: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
}

const slugify = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

export default function ManufacturersSection({
  medusaUrl,
  token,
  headers,
  manufacturers,
  setManufacturers,
  manufacturersError,
  setManufacturersError,
}: ManufacturersSectionProps) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<"create" | "edit" | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [editingForm, setEditingForm] = useState({ ...emptyForm })

  const refresh = async () => {
    try {
      const res = await fetch(`${medusaUrl}/admin/manufacturers?limit=300`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível buscar fabricantes")
      }
      const json = await res.json()
      setManufacturers(json.manufacturers ?? [])
      setManufacturersError(null)
    } catch (err: any) {
      setManufacturersError(err?.message || "Erro ao buscar fabricantes")
    }
  }

  const uploadImage = async (files: FileList | null, target: "create" | "edit") => {
    if (!files?.length) return
    if (!token) {
      setManufacturersError("Faça login para enviar arquivos.")
      return
    }
    const file = files[0]
    if (!file.type.startsWith("image/")) {
      setManufacturersError("Envie apenas arquivos de imagem.")
      return
    }

    setUploadingField(target)
    setManufacturersError(null)
    try {
      const formData = new FormData()
      formData.append("files", file, file.name)
      const res = await fetch(`${medusaUrl}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Falha ao enviar imagem.")
      }
      const json = await res.json()
      const url = (json?.files || [])[0]?.url
      if (!url) {
        throw new Error("Upload concluído sem URL retornada.")
      }

      if (target === "create") {
        setForm((prev) => ({ ...prev, image_url: url }))
      } else {
        setEditingForm((prev) => ({ ...prev, image_url: url }))
      }
    } catch (err: any) {
      setManufacturersError(err?.message || "Erro ao enviar imagem.")
    } finally {
      setUploadingField(null)
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setManufacturersError("Informe o nome do fabricante")
      return
    }
    setCreating(true)
    setManufacturersError(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        image_url: form.image_url || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      const res = await fetch(`${medusaUrl}/admin/manufacturers`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível cadastrar fabricante")
      }
      const json = await res.json()
      setManufacturers((prev) => [json.manufacturer, ...prev])
      setForm({ ...emptyForm })
    } catch (err: any) {
      setManufacturersError(err?.message || "Erro ao cadastrar fabricante")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (item: Manufacturer) => {
    setEditingId(item.id)
    setEditingForm({
      name: item.name || "",
      slug: item.slug || "",
      image_url: item.image_url || "",
      sort_order: String(item.sort_order || 0),
      is_active: item.is_active !== false,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingForm({ ...emptyForm })
  }

  const handleUpdate = async (id: string) => {
    if (!editingForm.name.trim()) {
      setManufacturersError("Informe o nome do fabricante")
      return
    }
    setManufacturersError(null)
    try {
      const payload = {
        name: editingForm.name.trim(),
        slug: slugify(editingForm.slug || editingForm.name),
        image_url: editingForm.image_url || null,
        sort_order: Number(editingForm.sort_order) || 0,
        is_active: editingForm.is_active,
      }
      const res = await fetch(`${medusaUrl}/admin/manufacturers/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar fabricante")
      }
      await refresh()
      cancelEdit()
    } catch (err: any) {
      setManufacturersError(err?.message || "Erro ao atualizar fabricante")
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Remover este fabricante?")
    if (!confirmed) return
    setDeletingId(id)
    setManufacturersError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/manufacturers/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível remover fabricante")
      }
      setManufacturers((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      setManufacturersError(err?.message || "Erro ao remover fabricante")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Fabricantes</h1>
        <p className="muted">Cadastre marcas para filtrar produtos e usar no marketing.</p>
      </header>

      <section className="panel">
        <h3>Novo fabricante</h3>
        <form onSubmit={handleCreate} className="grid" style={{ gap: "0.6rem", marginTop: "0.75rem" }}>
          <div className="grid" style={{ gap: "0.5rem", gridTemplateColumns: "1.2fr 1fr 1fr auto auto" }}>
            <input
              className="field-input"
              placeholder="Nome"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Slug (opcional)"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <input
              className="field-input"
              placeholder="Imagem (URL)"
              value={form.image_url}
              onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
            />
            <input
              className="field-input"
              type="number"
              placeholder="Ordem"
              value={form.sort_order}
              onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
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
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files, "create")} />
            {uploadingField === "create" && <span className="muted">Enviando imagem...</span>}
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Criando..." : "Criar fabricante"}
            </button>
          </div>
        </form>
        {manufacturersError && (
          <div className="muted" style={{ marginTop: "0.5rem" }}>
            Erro: {manufacturersError}
          </div>
        )}
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Fabricantes cadastrados</h3>
          <span className="pill">{manufacturers.length} registros</span>
        </div>
        <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Slug</th>
                <th>Ordem</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {manufacturers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Nenhum fabricante cadastrado.
                  </td>
                </tr>
              ) : (
                manufacturers.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id}>
                      <td>
                        {isEditing ? (
                          <div className="grid" style={{ gap: "0.35rem" }}>
                            <input
                              className="field-input"
                              value={editingForm.image_url}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, image_url: event.target.value }))
                              }
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => uploadImage(event.target.files, "edit")}
                            />
                            {uploadingField === "edit" && <span className="muted">Enviando...</span>}
                          </div>
                        ) : item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: "54px", height: "54px", objectFit: "cover", borderRadius: "8px" }}
                          />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="field-input"
                            value={editingForm.name}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="field-input"
                            value={editingForm.slug}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, slug: event.target.value }))}
                          />
                        ) : (
                          item.slug
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="field-input"
                            type="number"
                            value={editingForm.sort_order}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, sort_order: event.target.value }))
                            }
                          />
                        ) : (
                          item.sort_order || 0
                        )}
                      </td>
                      <td>
                        {isEditing ? (
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
                        ) : item.is_active !== false ? (
                          "Sim"
                        ) : (
                          "Não"
                        )}
                      </td>
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
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "Removendo..." : "Excluir"}
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
