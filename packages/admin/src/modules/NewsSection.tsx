import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Dispatch, SetStateAction } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperPlane, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons"

import { News } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type NewsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  news: News[]
  setNews: Dispatch<SetStateAction<News[]>>
  newsError: string | null
  setNewsError: Dispatch<SetStateAction<string | null>>
  pushToast: (toast: ToastInput) => void
  mode?: "list" | "create" | "edit" | "delete"
  newsId?: string
}

export default function NewsSection({
  medusaUrl,
  headers,
  news,
  setNews,
  newsError,
  setNewsError,
  pushToast,
  mode = "list",
  newsId,
}: NewsSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedNewsId = params.newsId || newsId
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const isDeleteMode = mode === "delete"
  const activeNews =
    (isEditMode || isDeleteMode) && resolvedNewsId ? news.find((n) => n.id === resolvedNewsId) : null
  const [newsSaving, setNewsSaving] = useState(false)
  const [newsDeletingId, setNewsDeletingId] = useState<string | null>(null)
  const [newsForm, setNewsForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "",
    image_url: "",
    author: "",
    source: "",
    read_time: "",
    published_at: "",
    is_published: true,
  })
  const [newsEditForm, setNewsEditForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "",
    image_url: "",
    author: "",
    source: "",
    read_time: "",
    published_at: "",
    is_published: true,
  })

  useEffect(() => {
    if (!isEditMode) return
    if (!activeNews) return
    setNewsEditForm({
      title: activeNews.title || "",
      summary: activeNews.summary || "",
      content: activeNews.content || "",
      category: activeNews.category || "",
      image_url: activeNews.image_url || "",
      author: activeNews.author || "",
      source: activeNews.source || "",
      read_time: activeNews.read_time ? String(activeNews.read_time) : "",
      published_at: activeNews.published_at || "",
      is_published: Boolean(activeNews.is_published),
    })
  }, [isEditMode, activeNews?.id])

  const handleNewsChange = (field: keyof typeof newsForm, value: string | boolean) => {
    setNewsForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleNewsEditChange = (
    field: keyof typeof newsEditForm,
    value: string | boolean
  ) => {
    setNewsEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetNewsForm = () => {
    setNewsForm({
      title: "",
      summary: "",
      content: "",
      category: "",
      image_url: "",
      author: "",
      source: "",
      read_time: "",
      published_at: "",
      is_published: true,
    })
  }

  async function createNews(e: FormEvent) {
    e.preventDefault()
    if (!newsForm.title || !newsForm.summary || !newsForm.content) {
      setNewsError("Preencha titulo, resumo e conteudo.")
      return
    }
    setNewsSaving(true)
    setNewsError(null)
    try {
      const payload = {
        title: newsForm.title,
        summary: newsForm.summary,
        content: newsForm.content,
        category: newsForm.category || null,
        image_url: newsForm.image_url || null,
        author: newsForm.author || null,
        source: newsForm.source || null,
        read_time: newsForm.read_time ? Number(newsForm.read_time) : null,
        published_at: newsForm.published_at || null,
        is_published: newsForm.is_published,
      }
      const res = await fetch(`${medusaUrl}/admin/news`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar notícia")
      }
      const json = await res.json()
      if (json?.news) {
        setNews((prev) => [json.news, ...prev])
      }
      resetNewsForm()
      navigate("/noticias")
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao criar notícia")
    } finally {
      setNewsSaving(false)
    }
  }

  async function saveNewsEdit() {
    if (!activeNews) return
    if (!newsEditForm.title || !newsEditForm.summary || !newsEditForm.content) {
      setNewsError("Preencha titulo, resumo e conteudo.")
      return
    }
    setNewsSaving(true)
    setNewsError(null)
    try {
      const payload = {
        title: newsEditForm.title,
        summary: newsEditForm.summary,
        content: newsEditForm.content,
        category: newsEditForm.category || null,
        image_url: newsEditForm.image_url || null,
        author: newsEditForm.author || null,
        source: newsEditForm.source || null,
        read_time: newsEditForm.read_time ? Number(newsEditForm.read_time) : null,
        published_at: newsEditForm.published_at || null,
        is_published: newsEditForm.is_published,
      }
      const res = await fetch(`${medusaUrl}/admin/news/${activeNews.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar notícia")
      }
      const json = await res.json()
      if (json?.news) {
        setNews((prev) => prev.map((item) => (item.id === activeNews.id ? json.news : item)))
      }
      navigate("/noticias")
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao atualizar notícia")
    } finally {
      setNewsSaving(false)
    }
  }

  async function deleteNews(id: string) {
    setNewsDeletingId(id)
    setNewsError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/news/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Nao foi possivel excluir a noticia")
      }
      setNews((prev) => prev.filter((item) => item.id !== id))
      pushToast({
        title: "Noticia excluida",
        description: "A noticia foi removida com sucesso.",
        variant: "success",
      })
      return true
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao excluir noticia")
      pushToast({
        title: "Erro ao excluir noticia",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
      return false
    } finally {
      setNewsDeletingId(null)
    }
  }

  if (isDeleteMode) {
    if (!activeNews) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir notícia</h1>
            <p className="page-subtitle">Notícia não encontrada.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/noticias")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir notícia</h1>
          <p className="page-subtitle">{activeNews.title || "Notícia"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/noticias")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            disabled={newsDeletingId === activeNews.id}
            onClick={async () => {
              const ok = await deleteNews(activeNews.id)
              if (ok) navigate("/noticias")
            }}
          >
            {newsDeletingId === activeNews.id ? "Removendo..." : "Confirmar exclusão"}
          </button>
        </div>

        {newsError && <div className="panel muted">Erro: {newsError}</div>}

        <section className="panel" style={{ maxWidth: "820px" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Categoria</span>
              <span>{activeNews.category || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Autor</span>
              <span>{activeNews.author || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Publicado</span>
              <span>{activeNews.is_published ? "Sim" : "Não"}</span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (isCreateMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Nova notícia</h1>
          <p className="page-subtitle">Crie comunicados, campanhas e novidades.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/noticias")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="news-create-form" disabled={newsSaving}>
              {newsSaving ? "Salvando..." : "Publicar notícia"}
            </button>
          </div>
        </div>

        {newsError && <div className="muted">Erro: {newsError}</div>}

        <form id="news-create-form" className="panel grid" onSubmit={createNews} style={{ gap: "0.85rem" }}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Título</span>
            <input
              value={newsForm.title}
              onChange={(e) => handleNewsChange("title", e.target.value)}
              required
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Resumo</span>
            <textarea
              value={newsForm.summary}
              onChange={(e) => handleNewsChange("summary", e.target.value)}
              rows={3}
              required
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Conteúdo</span>
            <textarea
              value={newsForm.content}
              onChange={(e) => handleNewsChange("content", e.target.value)}
              rows={5}
              required
              className="field-input"
            />
          </label>

          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Categoria</span>
              <input
                value={newsForm.category}
                onChange={(e) => handleNewsChange("category", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Autor</span>
              <input
                value={newsForm.author}
                onChange={(e) => handleNewsChange("author", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Fonte</span>
              <input
                value={newsForm.source}
                onChange={(e) => handleNewsChange("source", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Tempo de leitura (min)</span>
              <input
                type="number"
                min={0}
                value={newsForm.read_time}
                onChange={(e) => handleNewsChange("read_time", e.target.value)}
                className="field-input"
              />
            </label>
          </div>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Imagem (URL)</span>
            <input
              value={newsForm.image_url}
              onChange={(e) => handleNewsChange("image_url", e.target.value)}
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Data de publicação</span>
            <input
              type="datetime-local"
              value={newsForm.published_at}
              onChange={(e) => handleNewsChange("published_at", e.target.value)}
              className="field-input"
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={newsForm.is_published}
              onChange={(e) => handleNewsChange("is_published", e.target.checked)}
              className="checkbox"
            />
            <span className="muted">Publicar imediatamente</span>
          </label>

          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Revise o conteúdo antes de publicar.
          </div>
        </form>
      </div>
    )
  }

  if (isEditMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar notícia</h1>
          <p className="page-subtitle">{activeNews?.title || "Notícia"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/noticias")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="button" disabled={newsSaving} onClick={saveNewsEdit}>
              {newsSaving ? "Salvando..." : "Salvar notícia"}
            </button>
          </div>
        </div>

        {newsError && <div className="muted">Erro: {newsError}</div>}

        {!activeNews ? (
          <div className="panel muted">Notícia não encontrada.</div>
        ) : (
          <div className="panel grid" style={{ gap: "0.85rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Título</span>
              <input
                value={newsEditForm.title}
                onChange={(e) => handleNewsEditChange("title", e.target.value)}
                required
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Resumo</span>
              <textarea
                value={newsEditForm.summary}
                onChange={(e) => handleNewsEditChange("summary", e.target.value)}
                rows={3}
                required
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Conteúdo</span>
              <textarea
                value={newsEditForm.content}
                onChange={(e) => handleNewsEditChange("content", e.target.value)}
                rows={5}
                required
                className="field-input"
              />
            </label>

            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Categoria</span>
                <input
                  value={newsEditForm.category}
                  onChange={(e) => handleNewsEditChange("category", e.target.value)}
                  className="field-input"
                />
              </label>

              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Autor</span>
                <input
                  value={newsEditForm.author}
                  onChange={(e) => handleNewsEditChange("author", e.target.value)}
                  className="field-input"
                />
              </label>

              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Fonte</span>
                <input
                  value={newsEditForm.source}
                  onChange={(e) => handleNewsEditChange("source", e.target.value)}
                  className="field-input"
                />
              </label>

              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Tempo de leitura (min)</span>
                <input
                  type="number"
                  min={0}
                  value={newsEditForm.read_time}
                  onChange={(e) => handleNewsEditChange("read_time", e.target.value)}
                  className="field-input"
                />
              </label>
            </div>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Imagem (URL)</span>
              <input
                value={newsEditForm.image_url}
                onChange={(e) => handleNewsEditChange("image_url", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Data de publicação</span>
              <input
                type="datetime-local"
                value={newsEditForm.published_at}
                onChange={(e) => handleNewsEditChange("published_at", e.target.value)}
                className="field-input"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={newsEditForm.is_published}
                onChange={(e) => handleNewsEditChange("is_published", e.target.checked)}
                className="checkbox"
              />
              <span className="muted">Publicar imediatamente</span>
            </label>

            <div className="muted" style={{ fontSize: "0.85rem" }}>
              Atualize o conteúdo e salve para publicar as mudanças.
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Notícias</h1>
        <p className="muted">Crie e acompanhe as notícias exibidas no app e no front-store.</p>
      </header>

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
            <h3>Publicações</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Organize comunicados, campanhas e novidades do marketplace.
            </p>
          </div>
          <span className="pill">{news.length} registros</span>
        </div>

        {newsError && <div className="muted">Erro: {newsError}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/noticias/nova")}>
            Nova notícia
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Publicado</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {news.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    Nenhuma notícia cadastrada.
                  </td>
                </tr>
              ) : (
                news.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.category || "Geral"}</td>
                    <td>
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td>{item.is_published ? "Ativa" : "Rascunho"}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => navigate(`/noticias/${item.id}`)}
                        title="Editar"
                        aria-label="Editar"
                        style={{ marginRight: "0.5rem" }}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => navigate(`/noticias/${item.id}/excluir`)}
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <FontAwesomeIcon icon={faTrash} />
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
