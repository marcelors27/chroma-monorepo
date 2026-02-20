import type { Dispatch, FormEvent, SetStateAction } from "react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { BusinessType } from "../types"

type BusinessTypesSectionProps = {
  medusaUrl: string
  token: string | null
  headers: Record<string, string>
  businessTypes: BusinessType[]
  setBusinessTypes: Dispatch<SetStateAction<BusinessType[]>>
  businessTypesError: string | null
  setBusinessTypesError: Dispatch<SetStateAction<string | null>>
  mode?: "list" | "create" | "edit" | "delete"
  businessTypeId?: string
}

type FormState = {
  key: string
  label: string
  label_plural: string
  article_singular: string
  article_plural: string
  terms_json: string
  background_image_url: string
  allow_credit: boolean
  allow_pix: boolean
  allow_boleto: boolean
  boleto_allowed_days: string
  boleto_default_day: string
  is_active: boolean
}

const emptyForm: FormState = {
  key: "",
  label: "",
  label_plural: "",
  article_singular: "",
  article_plural: "",
  terms_json: "{}",
  background_image_url: "",
  allow_credit: true,
  allow_pix: true,
  allow_boleto: true,
  boleto_allowed_days: "1,3,15,30",
  boleto_default_day: "3",
  is_active: true,
}

const parseTermsJson = (value: string) => {
  if (!value || !value.trim()) return {}
  const parsed = JSON.parse(value)
  return parsed && typeof parsed === "object" ? parsed : null
}

const parseDays = (value: string, fallback: number[]) => {
  const parsed = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
  const unique = [...new Set(parsed)]
  return unique.length ? unique.sort((a, b) => a - b) : [...fallback]
}

const parsePolicyFromTerms = (terms: Record<string, any>) => {
  const policy = terms?.payment_policy || {}
  const allowedDays = parseDays(
    Array.isArray(policy?.boleto?.allowed_days)
      ? policy.boleto.allowed_days.join(",")
      : "",
    [1, 3, 15, 30]
  )
  const defaultDayCandidate = Number(policy?.boleto?.default_day)
  const defaultDay = allowedDays.includes(defaultDayCandidate)
    ? defaultDayCandidate
    : allowedDays[0] || 3
  return {
    allow_credit: policy?.methods?.credit !== false,
    allow_pix: policy?.methods?.pix !== false,
    allow_boleto: policy?.methods?.boleto !== false,
    boleto_allowed_days: allowedDays.join(","),
    boleto_default_day: String(defaultDay),
  }
}

const stripPolicyFromTerms = (terms: Record<string, any>) => {
  const clone = { ...(terms || {}) }
  delete clone.payment_policy
  return clone
}

const extractBackgroundImage = (terms: Record<string, any>) => {
  const explicit = String(terms?.background_image_url || "").trim()
  if (explicit) return explicit
  return String(terms?.background?.image_url || "").trim()
}

const mergeTermsWithForm = (baseTerms: Record<string, any>, formState: FormState) => {
  const allowedDays = parseDays(formState.boleto_allowed_days, [1, 3, 15, 30])
  const defaultDayCandidate = Number(formState.boleto_default_day)
  const defaultDay = allowedDays.includes(defaultDayCandidate)
    ? defaultDayCandidate
    : allowedDays[0] || 3

  const merged = {
    ...(baseTerms || {}),
    payment_policy: {
      methods: {
        credit: Boolean(formState.allow_credit),
        pix: Boolean(formState.allow_pix),
        boleto: Boolean(formState.allow_boleto),
      },
      boleto: {
        allowed_days: allowedDays,
        default_day: defaultDay,
      },
    },
  } as Record<string, any>

  const imageUrl = String(formState.background_image_url || "").trim()
  if (imageUrl) {
    merged.background_image_url = imageUrl
  } else {
    delete merged.background_image_url
    if (merged.background && typeof merged.background === "object") {
      delete merged.background.image_url
      if (!Object.keys(merged.background).length) delete merged.background
    }
  }

  return merged
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("pt-BR")
}

const formFromBusinessType = (item: BusinessType): FormState => {
  const terms = (item.terms || {}) as Record<string, any>
  const policy = parsePolicyFromTerms(terms)
  const termsForEditor = stripPolicyFromTerms(terms)

  return {
    key: item.key || "",
    label: item.label || "",
    label_plural: item.label_plural || "",
    article_singular: item.article_singular || "",
    article_plural: item.article_plural || "",
    terms_json: JSON.stringify(termsForEditor, null, 2),
    background_image_url: extractBackgroundImage(terms),
    allow_credit: policy.allow_credit,
    allow_pix: policy.allow_pix,
    allow_boleto: policy.allow_boleto,
    boleto_allowed_days: policy.boleto_allowed_days,
    boleto_default_day: policy.boleto_default_day,
    is_active: item.is_active ?? true,
  }
}

export default function BusinessTypesSection({
  medusaUrl,
  token,
  headers,
  businessTypes,
  setBusinessTypes,
  businessTypesError,
  setBusinessTypesError,
  mode = "list",
  businessTypeId,
}: BusinessTypesSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedBusinessTypeId = params.businessTypeId || businessTypeId
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const isDeleteMode = mode === "delete"
  const activeItem =
    (isEditMode || isDeleteMode) && resolvedBusinessTypeId
      ? businessTypes.find((item) => item.id === resolvedBusinessTypeId)
      : null

  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<"create" | "edit" | null>(null)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [editForm, setEditForm] = useState<FormState>({ ...emptyForm })

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

  const uploadImage = async (files: FileList | null, target: "create" | "edit") => {
    if (!files?.length) return
    if (!token) {
      setBusinessTypesError("Faça login para enviar arquivos.")
      return
    }
    const file = files[0]
    if (!file.type.startsWith("image/")) {
      setBusinessTypesError("Envie apenas arquivos de imagem.")
      return
    }

    setUploadingField(target)
    setBusinessTypesError(null)
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
        setForm((prev) => ({ ...prev, background_image_url: url }))
      } else {
        setEditForm((prev) => ({ ...prev, background_image_url: url }))
      }
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao enviar imagem.")
    } finally {
      setUploadingField(null)
    }
  }

  const buildPayload = (state: FormState) => {
    const parsed = parseTermsJson(state.terms_json)
    if (!parsed) {
      throw new Error("Termos precisa ser um JSON válido")
    }
    const terms = mergeTermsWithForm(parsed as Record<string, any>, state)
    return {
      key: state.key.trim(),
      label: state.label.trim(),
      label_plural: state.label_plural.trim(),
      article_singular: state.article_singular.trim() || null,
      article_plural: state.article_plural.trim() || null,
      terms,
      is_active: state.is_active,
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.label || !form.label_plural || !form.key) {
      setBusinessTypesError("Informe key, label e label plural")
      return
    }

    let payload: Record<string, any>
    try {
      payload = buildPayload(form)
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Dados inválidos")
      return
    }

    setCreating(true)
    setBusinessTypesError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar tipo de negócio")
      }
      const json = await res.json()
      if (json?.business_type) {
        setBusinessTypes((prev) => [json.business_type, ...prev])
      }
      setForm({ ...emptyForm })
      navigate("/tipos-negocio")
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao criar tipo de negócio")
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async () => {
    if (!activeItem) return
    if (!editForm.label || !editForm.label_plural || !editForm.key) {
      setBusinessTypesError("Informe key, label e label plural")
      return
    }

    let payload: Record<string, any>
    try {
      payload = buildPayload(editForm)
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Dados inválidos")
      return
    }

    setSaving(true)
    setBusinessTypesError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/business-types/${activeItem.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar tipo de negócio")
      }
      await refresh()
      navigate("/tipos-negocio")
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao atualizar tipo de negócio")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
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
      navigate("/tipos-negocio")
      return true
    } catch (err: any) {
      setBusinessTypesError(err?.message || "Erro ao remover tipo de negócio")
      return false
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!isEditMode || !activeItem) return
    setEditForm(formFromBusinessType(activeItem))
  }, [isEditMode, activeItem?.id])

  const renderPolicyFields = (
    state: FormState,
    setState: Dispatch<SetStateAction<FormState>>,
    target: "create" | "edit"
  ) => (
    <>
      <div className="grid" style={{ gap: "0.5rem", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={state.allow_credit}
            onChange={(event) => setState((prev) => ({ ...prev, allow_credit: event.target.checked }))}
          />
          Permitir Cartão
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={state.allow_pix}
            onChange={(event) => setState((prev) => ({ ...prev, allow_pix: event.target.checked }))}
          />
          Permitir PIX
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={state.allow_boleto}
            onChange={(event) => setState((prev) => ({ ...prev, allow_boleto: event.target.checked }))}
          />
          Permitir Boleto
        </label>
      </div>
      <div className="grid" style={{ gap: "0.5rem", gridTemplateColumns: "1fr 1fr" }}>
        <input
          className="field-input"
          placeholder="Prazos boleto (ex: 1,3,15,30)"
          value={state.boleto_allowed_days}
          onChange={(event) => setState((prev) => ({ ...prev, boleto_allowed_days: event.target.value }))}
        />
        <input
          className="field-input"
          placeholder="Padrão boleto (ex: 3)"
          value={state.boleto_default_day}
          onChange={(event) => setState((prev) => ({ ...prev, boleto_default_day: event.target.value }))}
        />
      </div>
      <label className="grid" style={{ gap: "0.35rem" }}>
        <span className="muted">Imagem de fundo do app</span>
        <input
          className="field-input"
          placeholder="URL da imagem de fundo"
          value={state.background_image_url}
          onChange={(event) => setState((prev) => ({ ...prev, background_image_url: event.target.value }))}
        />
      </label>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files, target)} />
        {uploadingField === target && <span className="muted">Enviando imagem...</span>}
      </div>
      {state.background_image_url && (
        <div className="grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pré-visualização</span>
          <img
            src={state.background_image_url}
            alt="Prévia de fundo"
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "180px",
              objectFit: "cover",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
        </div>
      )}
      <label className="grid" style={{ gap: "0.35rem" }}>
        <span className="muted">Termos extras (JSON)</span>
        <textarea
          className="field-input"
          rows={6}
          placeholder='{"responsible_label":"Síndico","unit_label":"Unidade"}'
          value={state.terms_json}
          onChange={(event) => setState((prev) => ({ ...prev, terms_json: event.target.value }))}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <input
          type="checkbox"
          checked={state.is_active}
          onChange={(event) => setState((prev) => ({ ...prev, is_active: event.target.checked }))}
        />
        Ativo
      </label>
    </>
  )

  if (isCreateMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Novo tipo de negócio</h1>
          <p className="page-subtitle">Cadastre o segmento e a imagem de fundo usada no app.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/tipos-negocio")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="business-type-create-form" disabled={creating}>
              {creating ? "Criando..." : "Criar tipo"}
            </button>
          </div>
        </div>

        {businessTypesError && <div className="muted">Erro: {businessTypesError}</div>}

        <form
          id="business-type-create-form"
          className="panel grid"
          style={{ gap: "0.85rem" }}
          onSubmit={handleCreate}
        >
          <div className="grid" style={{ gap: "0.6rem", gridTemplateColumns: "1fr 1.2fr 1.2fr" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Key</span>
              <input
                className="field-input"
                placeholder="ex: condominio"
                value={form.key}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Label</span>
              <input
                className="field-input"
                placeholder="ex: Condomínio"
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Label plural</span>
              <input
                className="field-input"
                placeholder="ex: Condomínios"
                value={form.label_plural}
                onChange={(event) => setForm((prev) => ({ ...prev, label_plural: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid" style={{ gap: "0.6rem", gridTemplateColumns: "1fr 1fr" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Artigo singular</span>
              <input
                className="field-input"
                placeholder="ex: do/da"
                value={form.article_singular}
                onChange={(event) => setForm((prev) => ({ ...prev, article_singular: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Artigo plural</span>
              <input
                className="field-input"
                placeholder="ex: dos/das"
                value={form.article_plural}
                onChange={(event) => setForm((prev) => ({ ...prev, article_plural: event.target.value }))}
              />
            </label>
          </div>

          {renderPolicyFields(form, setForm, "create")}
        </form>
      </div>
    )
  }

  if (isEditMode) {
    if (!activeItem) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Editar tipo de negócio</h1>
            <p className="page-subtitle">Tipo não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/tipos-negocio")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar tipo de negócio</h1>
          <p className="page-subtitle">{activeItem.label}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/tipos-negocio")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="button" onClick={handleUpdate} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate(`/tipos-negocio/${activeItem.id}/excluir`)}>
              Excluir
            </button>
          </div>
        </div>

        {businessTypesError && <div className="muted">Erro: {businessTypesError}</div>}

        <section className="panel grid" style={{ gap: "0.85rem" }}>
          <div className="grid" style={{ gap: "0.6rem", gridTemplateColumns: "1fr 1.2fr 1.2fr" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Key</span>
              <input
                className="field-input"
                value={editForm.key}
                onChange={(event) => setEditForm((prev) => ({ ...prev, key: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Label</span>
              <input
                className="field-input"
                value={editForm.label}
                onChange={(event) => setEditForm((prev) => ({ ...prev, label: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Label plural</span>
              <input
                className="field-input"
                value={editForm.label_plural}
                onChange={(event) => setEditForm((prev) => ({ ...prev, label_plural: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid" style={{ gap: "0.6rem", gridTemplateColumns: "1fr 1fr" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Artigo singular</span>
              <input
                className="field-input"
                value={editForm.article_singular}
                onChange={(event) => setEditForm((prev) => ({ ...prev, article_singular: event.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Artigo plural</span>
              <input
                className="field-input"
                value={editForm.article_plural}
                onChange={(event) => setEditForm((prev) => ({ ...prev, article_plural: event.target.value }))}
              />
            </label>
          </div>

          {renderPolicyFields(editForm, setEditForm, "edit")}

          <div className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Atualizado em</span>
            <span>{formatDateTime(activeItem.updated_at)}</span>
          </div>
        </section>
      </div>
    )
  }

  if (isDeleteMode) {
    if (!activeItem) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir tipo de negócio</h1>
            <p className="page-subtitle">Tipo não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/tipos-negocio")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir tipo de negócio</h1>
          <p className="page-subtitle">{activeItem.label}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate(`/tipos-negocio/${activeItem.id}`)}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            disabled={deletingId === activeItem.id}
            onClick={() => handleDelete(activeItem.id)}
          >
            {deletingId === activeItem.id ? "Removendo..." : "Confirmar exclusão"}
          </button>
        </div>

        {businessTypesError && <div className="panel muted">Erro: {businessTypesError}</div>}

        <section className="panel" style={{ maxWidth: "820px" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Key</span>
              <span>{activeItem.key}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Label</span>
              <span>{activeItem.label}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Ativo</span>
              <span>{activeItem.is_active ? "Sim" : "Não"}</span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="page-header">
        <h1 className="page-title">Tipos de negócio</h1>
        <p className="page-subtitle">Gerencie segmentos e imagens de fundo do app por segmento.</p>
      </header>

      <div className="action-bar">
        <div />
        <div className="action-bar-group">
          <button className="btn" type="button" onClick={() => navigate("/tipos-negocio/novo")}>
            Novo tipo
          </button>
        </div>
      </div>

      {businessTypesError && <div className="muted">Erro: {businessTypesError}</div>}

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
                <th>Fundo</th>
                <th>Pagamentos</th>
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
                  const policy = parsePolicyFromTerms((item.terms || {}) as Record<string, any>)
                  const methods = [
                    policy.allow_credit ? "Cartão" : null,
                    policy.allow_pix ? "PIX" : null,
                    policy.allow_boleto ? "Boleto" : null,
                  ]
                    .filter(Boolean)
                    .join(", ")
                  return (
                    <tr key={item.id}>
                      <td>{item.key}</td>
                      <td>{item.label}</td>
                      <td>{item.label_plural}</td>
                      <td>{extractBackgroundImage((item.terms || {}) as Record<string, any>) ? "Configurado" : "—"}</td>
                      <td>{`${methods || "—"} | boleto: ${policy.boleto_allowed_days || "—"}`}</td>
                      <td>{item.is_active ? "Sim" : "Não"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            onClick={() => navigate(`/tipos-negocio/${item.id}`)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            onClick={() => navigate(`/tipos-negocio/${item.id}/excluir`)}
                            style={{ color: "#c23b3b", borderColor: "rgba(194, 59, 59, 0.35)" }}
                          >
                            Remover
                          </button>
                        </div>
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
