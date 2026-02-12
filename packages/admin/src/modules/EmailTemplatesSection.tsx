import { FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faPenToSquare,
  faTrash,
  faPaperPlane,
  faPlus,
} from "@fortawesome/free-solid-svg-icons"

import type { EmailTemplate } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type EmailTemplatesSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  pushToast: (toast: ToastInput) => void
  mode?: "list" | "create" | "edit" | "publish" | "delete" | "bootstrap"
  templateId?: string
}

const initialForm = {
  name: "",
  subject: "",
  html: "",
  variables: "",
}

export default function EmailTemplatesSection({
  medusaUrl,
  headers,
  pushToast,
  mode = "list",
  templateId,
}: EmailTemplatesSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedTemplateId = params.templateId || templateId
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const isPublishMode = mode === "publish"
  const isDeleteMode = mode === "delete"
  const isBootstrapMode = mode === "bootstrap"
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishingId, setIsPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const templatesSorted = useMemo(
    () => [...templates].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [templates]
  )

  const renderStatusChip = (status?: string | null) => {
    if (!status) return null
    const normalized = String(status).toLowerCase()
    const className = normalized.includes("publish") ? "active" : "default"
    return <span className={`status-chip ${className}`}>{status}</span>
  }

  const normalizeError = (value: string) => {
    if (!value) return "Erro ao processar a solicitacao."
    try {
      const parsed = JSON.parse(value)
      const message =
        parsed?.message?.message ||
        parsed?.message ||
        parsed?.error ||
        parsed?.statusCode ||
        null
      if (message) {
        if (typeof message === "string") {
          try {
            const nested = JSON.parse(message)
            const nestedMessage = nested?.message || nested?.error || message
            if (nestedMessage?.toLowerCase?.().includes("too many requests")) {
              return "Muitas requisicoes ao Resend. Aguarde alguns segundos e tente novamente."
            }
            return nestedMessage
          } catch {
            if (message.toLowerCase().includes("too many requests")) {
              return "Muitas requisicoes ao Resend. Aguarde alguns segundos e tente novamente."
            }
            return message
          }
        }
        if (String(message).toLowerCase().includes("too many requests")) {
          return "Muitas requisicoes ao Resend. Aguarde alguns segundos e tente novamente."
        }
        return JSON.stringify(message)
      }
    } catch {
      // ignore
    }
    if (value.toLowerCase().includes("too many requests")) {
      return "Muitas requisicoes ao Resend. Aguarde alguns segundos e tente novamente."
    }
    return value
  }

  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/email-templates?limit=100`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao carregar templates")
      }
      const json = await res.json()
      setTemplates(json.templates || [])
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao carregar templates"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const applyTemplate = async (template: EmailTemplate) => {
    if (!template.id) return
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/email-templates/${template.id}`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao buscar template")
      }
      const json = await res.json()
      const detail = json.template || template
      setForm({
        name: detail.name || "",
        subject: detail.subject || "",
        html: detail.html || "",
        variables: detail.variables ? JSON.stringify(detail.variables, null, 2) : "",
      })
      setEditingId(template.id)
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao carregar template"))
    }
  }

  useEffect(() => {
    if (!isEditMode) return
    if (!resolvedTemplateId) return
    const template = templates.find((item) => item.id === resolvedTemplateId)
    if (!template) return
    applyTemplate(template)
  }, [isEditMode, resolvedTemplateId, templates])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const parseVariables = () => {
    if (!form.variables?.trim()) return undefined
    try {
      return JSON.parse(form.variables)
    } catch {
      throw new Error("JSON de variaveis invalido")
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.subject || !form.html) {
      setError("Nome, assunto e HTML sao obrigatorios.")
      return
    }

    let variables
    try {
      variables = parseVariables()
    } catch (err: any) {
      setError(err?.message || "Variaveis invalidas")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        html: form.html,
        variables,
      }
      const res = await fetch(
        editingId
          ? `${medusaUrl}/admin/email-templates/${editingId}`
          : `${medusaUrl}/admin/email-templates`,
        {
          method: editingId ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao salvar template")
      }
      await loadTemplates()
      pushToast({
        title: editingId ? "Template atualizado" : "Template criado",
        variant: "success",
      })
      resetForm()
      navigate("/emails")
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao salvar template"))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (templateId: string) => {
    setIsPublishingId(templateId)
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/email-templates/${templateId}/publish`, {
        method: "POST",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao publicar template")
      }
      await loadTemplates()
      pushToast({ title: "Template publicado", variant: "success" })
      return true
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao publicar template"))
      return false
    } finally {
      setIsPublishingId(null)
    }
  }

  const handleDelete = async (templateId: string) => {
    setDeletingId(templateId)
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/email-templates/${templateId}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao remover template")
      }
      await loadTemplates()
      if (editingId === templateId) resetForm()
      pushToast({ title: "Template removido", variant: "success" })
      return true
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao remover template"))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  if (isPublishMode || isDeleteMode) {
    const template = templates.find((item) => item.id === resolvedTemplateId) || null
    const title = isPublishMode ? "Publicar template" : "Excluir template"
    const actionId = resolvedTemplateId || ""

    if (isLoading && !template) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Carregando template...</p>
          </header>
        </div>
      )
    }

    if (!template) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Template não encontrado.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{template.name || template.id}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            disabled={isPublishMode ? isPublishingId === actionId : deletingId === actionId}
            onClick={async () => {
              const ok = isPublishMode
                ? await handlePublish(actionId)
                : await handleDelete(actionId)
              if (ok) navigate("/emails")
            }}
          >
            {isPublishMode
              ? isPublishingId === actionId
                ? "Publicando..."
                : "Confirmar publicação"
              : deletingId === actionId
              ? "Removendo..."
              : "Confirmar exclusão"}
          </button>
        </div>

        {error && <div className="panel muted">Erro: {error}</div>}

        <section className="panel" style={{ maxWidth: "820px" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Assunto</span>
              <span>{template.subject || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Status</span>
              <span>{template.status || "—"}</span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const handleBootstrap = async () => {
    setError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/email-templates/bootstrap`, {
        method: "POST",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(normalizeError(body) || "Falha ao criar templates padrao")
      }
      await loadTemplates()
      pushToast({ title: "Templates padrao criados", variant: "success" })
      return true
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao criar templates padrao"))
      return false
    }
  }

  if (isBootstrapMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Criar templates padrão</h1>
          <p className="page-subtitle">Gera os templates base do Resend para o catálogo.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const ok = await handleBootstrap()
              if (ok) navigate("/emails")
            }}
          >
            Confirmar criação
          </button>
        </div>

        {error && <div className="panel muted">Erro: {error}</div>}
      </div>
    )
  }

  if (isCreateMode || isEditMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">{isEditMode ? "Editar template" : "Novo template"}</h1>
          <p className="page-subtitle">Gerencie templates do Resend usados nas notificacoes.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="email-template-form" disabled={isSaving}>
              {isSaving ? "Salvando..." : isEditMode ? "Atualizar" : "Criar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="muted" style={{ marginTop: "0.75rem" }}>
            Erro: {error}
          </div>
        )}

        <div className="panel">
          <form id="email-template-form" onSubmit={handleSave} className="grid" style={{ gap: "0.85rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Nome</span>
              <input
                type="text"
                className="field-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Assunto</span>
              <input
                type="text"
                className="field-input"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">HTML</span>
              <textarea
                rows={12}
                className="field-input"
                value={form.html}
                onChange={(e) => setForm((prev) => ({ ...prev, html: e.target.value }))}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Variaveis (JSON)</span>
              <textarea
                rows={6}
                className="field-input"
                placeholder='[{"key":"USER_NAME","type":"string","fallback":""}]'
                value={form.variables}
                onChange={(e) => setForm((prev) => ({ ...prev, variables: e.target.value }))}
              />
            </label>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              Revise o HTML e as variáveis antes de salvar.
            </div>
          </form>

          <div className="panel" style={{ marginTop: "1.25rem" }}>
            <h4 style={{ marginBottom: "0.5rem" }}>Preview</h4>
            {form.html?.trim() ? (
              <iframe
                title="Preview do template"
                style={{
                  width: "100%",
                  minHeight: "240px",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  background: "white",
                }}
                srcDoc={form.html}
              />
            ) : (
              <div className="muted">Adicione HTML para visualizar o preview.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 data-testid="admin-email-templates-title">Templates de email</h2>
          <p className="muted">Gerencie os templates do Resend usados nas notificacoes.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails/bootstrap")}>
          <FontAwesomeIcon icon={faPlus} /> Criar templates padrao
        </button>
      </div>

      {error && (
        <div className="muted" style={{ marginTop: "0.75rem" }}>
          Erro: {error}
        </div>
      )}

      <div
        className="grid"
        style={{
          marginTop: "1.5rem",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          alignItems: "start",
        }}
      >
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Templates cadastrados</h3>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate("/emails/novo")}>
              Novo template
            </button>
          </div>
          {isLoading ? (
            <div className="muted">Carregando...</div>
          ) : templatesSorted.length === 0 ? (
            <div className="panel" style={{ display: "grid", gap: "0.5rem" }}>
              <strong>Nenhum template encontrado</strong>
              <span className="muted">
                Crie um template manualmente ou gere os modelos padrao para comecar.
              </span>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={() => navigate("/emails/bootstrap")}>
                  <FontAwesomeIcon icon={faPlus} /> Criar templates padrao
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => navigate("/emails/novo")}>
                  Criar manualmente
                </button>
              </div>
            </div>
          ) : (
            <div className="list">
              {templatesSorted.map((template) => (
                <div key={template.id} className="list-item">
                  <div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{template.name}</strong>
                      {renderStatusChip(template.status)}
                    </div>
                    <div className="muted">{template.id}</div>
                  </div>
                  <div className="list-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => navigate(`/emails/${template.id}`)}
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => navigate(`/emails/${template.id}/publicar`)}
                      title="Publicar"
                    >
                      <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => navigate(`/emails/${template.id}/excluir`)}
                      title="Remover"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginBottom: "0.75rem" }}>Preview</h3>
          <div className="muted">Selecione um template para editar.</div>
        </div>
      </div>
    </div>
  )
}
