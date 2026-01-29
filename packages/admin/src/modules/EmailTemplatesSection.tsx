import { FormEvent, useEffect, useMemo, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faPenToSquare,
  faTrash,
  faPaperPlane,
  faSpinner,
  faPlus,
} from "@fortawesome/free-solid-svg-icons"

import type { EmailTemplate } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type EmailTemplatesSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  pushToast: (toast: ToastInput) => void
}

const initialForm = {
  name: "",
  subject: "",
  html: "",
  variables: "",
}

export default function EmailTemplatesSection({ medusaUrl, headers, pushToast }: EmailTemplatesSectionProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishingId, setIsPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

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
      pushToast({ title: "Template publicado", variant: "success" })
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao publicar template"))
    } finally {
      setIsPublishingId(null)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm("Deseja remover este template?")) return
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
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao remover template"))
    } finally {
      setDeletingId(null)
    }
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
    } catch (err: any) {
      setError(normalizeError(err?.message || "Erro ao criar templates padrao"))
    }
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2>Templates de email</h2>
          <p className="muted">Gerencie os templates do Resend usados nas notificacoes.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={handleBootstrap}>
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
          <h3 style={{ marginBottom: "0.75rem" }}>Templates cadastrados</h3>
          {isLoading ? (
            <div className="muted">Carregando...</div>
          ) : templatesSorted.length === 0 ? (
            <div className="panel" style={{ display: "grid", gap: "0.5rem" }}>
              <strong>Nenhum template encontrado</strong>
              <span className="muted">
                Crie um template manualmente ou gere os modelos padrao para comecar.
              </span>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={handleBootstrap}>
                  <FontAwesomeIcon icon={faPlus} /> Criar templates padrao
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    resetForm()
                    document.querySelector("input.field-input")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
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
                      onClick={() => applyTemplate(template)}
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => handlePublish(template.id)}
                      title="Publicar"
                      disabled={isPublishingId === template.id}
                    >
                      <FontAwesomeIcon icon={isPublishingId === template.id ? faSpinner : faPaperPlane} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      title="Remover"
                      disabled={deletingId === template.id}
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
          <h3 style={{ marginBottom: "0.75rem" }}>{editingId ? "Editar template" : "Novo template"}</h3>
          <form onSubmit={handleSave} className="grid" style={{ gap: "0.85rem" }}>
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
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn" type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
              </button>
              {editingId && (
                <button className="btn btn-secondary" type="button" onClick={resetForm}>
                  Cancelar
                </button>
              )}
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
    </div>
  )
}
