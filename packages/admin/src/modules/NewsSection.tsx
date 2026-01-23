import { FormEvent, useState } from "react"
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
}

export default function NewsSection({
  medusaUrl,
  headers,
  news,
  setNews,
  newsError,
  setNewsError,
  pushToast,
}: NewsSectionProps) {
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

  const handleNewsChange = (field: keyof typeof newsForm, value: string | boolean) => {
    setNewsForm((prev) => ({ ...prev, [field]: value }))
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
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao criar notícia")
    } finally {
      setNewsSaving(false)
    }
  }

  async function deleteNews(id: string) {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta noticia?")
    if (!confirmed) return
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
    } catch (err: any) {
      setNewsError(err?.message || "Erro ao excluir noticia")
      pushToast({
        title: "Erro ao excluir noticia",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setNewsDeletingId(null)
    }
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

        <form
          className="panel grid"
          onSubmit={createNews}
          style={{ gap: "0.85rem", marginBottom: "1rem" }}
        >
          <h4 style={{ marginBottom: "0.35rem" }}>Adicionar notícia</h4>
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

          <button
            className="btn"
            type="submit"
            disabled={newsSaving}
            title={newsSaving ? "Salvando..." : "Publicar notícia"}
            aria-label={newsSaving ? "Salvando..." : "Publicar notícia"}
          >
            {newsSaving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Salvando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} /> Publicar notícia
              </>
            )}
          </button>
        </form>

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
                        onClick={() => deleteNews(item.id)}
                        disabled={newsDeletingId === item.id}
                        title={newsDeletingId === item.id ? "Excluindo..." : "Excluir"}
                        aria-label={newsDeletingId === item.id ? "Excluindo..." : "Excluir"}
                      >
                        {newsDeletingId === item.id ? (
                          <FontAwesomeIcon icon={faSpinner} spin />
                        ) : (
                          <FontAwesomeIcon icon={faTrash} />
                        )}
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
