import { FormEvent, useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faImage, faPenToSquare, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons"

import type { MarketingBanner } from "../types"

type ToastInput = { title: string; description?: string; variant?: "success" | "error" }

type MarketingSectionProps = {
  medusaUrl: string
  token: string
  headers: Record<string, string>
  banners: MarketingBanner[]
  setBanners: Dispatch<SetStateAction<MarketingBanner[]>>
  bannersError: string | null
  setBannersError: Dispatch<SetStateAction<string | null>>
  pushToast: (toast: ToastInput) => void
}

const areaOptions = [
  { value: "home", label: "Home" },
  { value: "catalog", label: "Catálogo" },
  { value: "orders", label: "Pedidos" },
  { value: "condos", label: "Condomínios" },
  { value: "recurrences", label: "Recorrências" },
  { value: "checkout", label: "Checkout/Carrinho" },
  { value: "settings", label: "Configurações" },
]

const initialForm = {
  title: "",
  subtitle: "",
  image_url: "",
  image_mobile_url: "",
  animation_url: "",
  animation_mobile_url: "",
  link_type: "",
  link_value: "",
  sort_order: "0",
  active_from: "",
  active_until: "",
  is_active: true,
}

const formatDateInput = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 16)
}

const isVideo = (url?: string | null) => {
  if (!url) return false
  return /\.(mp4|webm|mov)$/i.test(url)
}

export default function MarketingSection({
  medusaUrl,
  token,
  headers,
  banners,
  setBanners,
  bannersError,
  setBannersError,
  pushToast,
}: MarketingSectionProps) {
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  const linkType = form.link_type

  const activeBanners = useMemo(
    () => banners.filter((banner) => banner.is_active !== false),
    [banners]
  )

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const applyBannerToForm = (banner: MarketingBanner) => {
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      image_url: banner.image_url || "",
      image_mobile_url: banner.image_mobile_url || "",
      animation_url: banner.animation_url || "",
      animation_mobile_url: banner.animation_mobile_url || "",
      link_type: banner.link_type || "",
      link_value: banner.link_value || "",
      sort_order: banner.sort_order ? String(banner.sort_order) : "0",
      active_from: formatDateInput(banner.active_from),
      active_until: formatDateInput(banner.active_until),
      is_active: banner.is_active !== false,
    })
    setEditingId(banner.id)
  }

  const uploadAsset = async (files: FileList | null, field: keyof typeof form) => {
    if (!files?.length) return
    if (!token) {
      setBannersError("Faça login para enviar arquivos.")
      return
    }

    const file = files[0]
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setBannersError("Envie apenas imagens ou vídeos.")
      return
    }

    setUploadingField(field)
    setBannersError(null)
    try {
      const formData = new FormData()
      formData.append("files", file, file.name)
      const res = await fetch(`${medusaUrl}/admin/uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Falha ao enviar arquivo.")
      }
      const json = await res.json()
      const url = (json?.files || [])[0]?.url
      if (!url) {
        throw new Error("Upload concluído, mas sem URL retornada.")
      }
      handleChange(field, url)
    } catch (err: any) {
      setBannersError(err?.message || "Erro ao enviar arquivo.")
    } finally {
      setUploadingField(null)
    }
  }

  const saveBanner = async (e: FormEvent) => {
    e.preventDefault()
    setBannersError(null)
    if (!form.title) {
      setBannersError("Título é obrigatório.")
      return
    }
    if (!form.image_url && !form.image_mobile_url && !form.animation_url && !form.animation_mobile_url) {
      setBannersError("Informe ao menos uma imagem ou animação.")
      return
    }
    if (form.link_type === "url" && !form.link_value) {
      setBannersError("Informe a URL de destino.")
      return
    }
    if ((form.link_type === "product" || form.link_type === "area") && !form.link_value) {
      setBannersError("Informe o destino do banner.")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        image_url: form.image_url || null,
        image_mobile_url: form.image_mobile_url || null,
        animation_url: form.animation_url || null,
        animation_mobile_url: form.animation_mobile_url || null,
        link_type: form.link_type || null,
        link_value: form.link_value || null,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        active_from: form.active_from || null,
        active_until: form.active_until || null,
        is_active: form.is_active,
      }

      const isEditing = Boolean(editingId)
      const res = await fetch(
        isEditing
          ? `${medusaUrl}/admin/marketing-banners/${editingId}`
          : `${medusaUrl}/admin/marketing-banners`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível salvar o banner.")
      }
      const json = await res.json()
      const banner = json?.banner
      if (banner) {
        if (isEditing) {
          setBanners((prev) => prev.map((item) => (item.id === banner.id ? banner : item)))
        } else {
          setBanners((prev) => [banner, ...prev])
        }
      }
      resetForm()
      pushToast({
        title: isEditing ? "Banner atualizado" : "Banner criado",
        description: "Campanha salva com sucesso.",
        variant: "success",
      })
    } catch (err: any) {
      setBannersError(err?.message || "Erro ao salvar banner.")
      pushToast({
        title: "Erro ao salvar banner",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteBanner = async (id: string) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir este banner?")
    if (!confirmed) return
    setDeletingId(id)
    setBannersError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/marketing-banners/${id}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível excluir o banner")
      }
      setBanners((prev) => prev.filter((item) => item.id !== id))
      pushToast({
        title: "Banner excluído",
        description: "O banner foi removido com sucesso.",
        variant: "success",
      })
    } catch (err: any) {
      setBannersError(err?.message || "Erro ao excluir banner")
      pushToast({
        title: "Erro ao excluir banner",
        description: err?.message || "Tente novamente.",
        variant: "error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Marketing (Banners)</h1>
        <p className="muted">Campanhas que aparecem apenas na Home (web e mobile).</p>
      </header>

      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.8rem" }}>{editingId ? "Editar banner" : "Novo banner"}</h2>
        <form className="grid" style={{ gap: "1rem" }} onSubmit={saveBanner}>
          <div className="grid" style={{ gap: "0.6rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Título</span>
              <input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="field-input"
                required
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Subtítulo</span>
              <input
                value={form.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                className="field-input"
              />
            </label>
          </div>

          <div className="grid" style={{ gap: "0.8rem" }}>
            <div className="grid" style={{ gap: "0.4rem" }}>
              <strong>Imagens</strong>
              <span className="muted">
                Desktop recomendado: 1440 x 420px (min 1200 x 360). Mobile recomendado: 720 x
                420px.
              </span>
            </div>
            <div className="grid" style={{ gap: "0.6rem" }}>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Imagem desktop</span>
                <input
                  value={form.image_url}
                  onChange={(e) => handleChange("image_url", e.target.value)}
                  className="field-input"
                  placeholder="https://..."
                />
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadAsset(e.target.files, "image_url")}
              />
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Imagem mobile</span>
                <input
                  value={form.image_mobile_url}
                  onChange={(e) => handleChange("image_mobile_url", e.target.value)}
                  className="field-input"
                  placeholder="https://..."
                />
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadAsset(e.target.files, "image_mobile_url")}
              />
            </div>
          </div>

          <div className="grid" style={{ gap: "0.8rem" }}>
            <div className="grid" style={{ gap: "0.4rem" }}>
              <strong>Animações</strong>
              <span className="muted">
                Aceita GIF ou vídeo (MP4/WebM). Use o mesmo tamanho das imagens para manter o
                layout consistente.
              </span>
            </div>
            <div className="grid" style={{ gap: "0.6rem" }}>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Animação desktop</span>
                <input
                  value={form.animation_url}
                  onChange={(e) => handleChange("animation_url", e.target.value)}
                  className="field-input"
                  placeholder="https://..."
                />
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => uploadAsset(e.target.files, "animation_url")}
              />
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Animação mobile</span>
                <input
                  value={form.animation_mobile_url}
                  onChange={(e) => handleChange("animation_mobile_url", e.target.value)}
                  className="field-input"
                  placeholder="https://..."
                />
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => uploadAsset(e.target.files, "animation_mobile_url")}
              />
            </div>
          </div>

          <div className="grid" style={{ gap: "0.6rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Tipo de link</span>
              <select
                className="field-input"
                value={form.link_type}
                onChange={(e) => handleChange("link_type", e.target.value)}
              >
                <option value="">Sem link</option>
                <option value="url">URL externa</option>
                <option value="product">Produto (ID)</option>
                <option value="area">Área do sistema</option>
              </select>
            </label>

            {linkType === "area" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Destino</span>
                <select
                  className="field-input"
                  value={form.link_value}
                  onChange={(e) => handleChange("link_value", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {areaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {linkType === "product" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">ID do produto</span>
                <input
                  value={form.link_value}
                  onChange={(e) => handleChange("link_value", e.target.value)}
                  className="field-input"
                  placeholder="prod_..."
                />
              </label>
            )}

            {linkType === "url" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">URL externa</span>
                <input
                  value={form.link_value}
                  onChange={(e) => handleChange("link_value", e.target.value)}
                  className="field-input"
                  placeholder="https://..."
                />
              </label>
            )}
          </div>

          <div className="grid" style={{ gap: "0.6rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Ordem de destaque (maior primeiro)</span>
              <input
                value={form.sort_order}
                onChange={(e) => handleChange("sort_order", e.target.value)}
                className="field-input"
                type="number"
              />
            </label>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Período de campanha</span>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
                <input
                  type="datetime-local"
                  value={form.active_from}
                  onChange={(e) => handleChange("active_from", e.target.value)}
                  className="field-input"
                />
                <input
                  type="datetime-local"
                  value={form.active_until}
                  onChange={(e) => handleChange("active_until", e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Ativo</span>
              <select
                className="field-input"
                value={form.is_active ? "true" : "false"}
                onChange={(e) => handleChange("is_active", e.target.value === "true")}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
          </div>

          {bannersError && <div className="muted">Erro: {bannersError}</div>}

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
            <button className="btn" type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Salvando...
                </>
              ) : editingId ? (
                "Salvar alterações"
              ) : (
                "Cadastrar banner"
              )}
            </button>
            {(editingId || form.title) && (
              <button type="button" className="btn ghost" onClick={resetForm}>
                Limpar
              </button>
            )}
          </div>
          {uploadingField && <p className="muted">Enviando arquivo...</p>}
        </form>
      </section>

      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.8rem" }}>
          Banners ativos ({activeBanners.length})
        </h2>
        {banners.length === 0 ? (
          <p className="muted">Nenhum banner cadastrado ainda.</p>
        ) : (
          <div className="grid" style={{ gap: "1rem" }}>
            {banners.map((banner) => (
              <div key={banner.id} className="panel" style={{ padding: "1rem" }}>
                <div className="grid" style={{ gap: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <strong>{banner.title}</strong>
                      {banner.subtitle && <div className="muted">{banner.subtitle}</div>}
                      <div className="muted" style={{ marginTop: "0.2rem" }}>
                        {banner.is_active === false ? "Inativo" : "Ativo"} • Ordem{" "}
                        {banner.sort_order ?? 0}
                      </div>
                      {(banner.active_from || banner.active_until) && (
                        <div className="muted">
                          Vigência:{" "}
                          {banner.active_from ? new Date(banner.active_from).toLocaleString("pt-BR") : "imediato"}{" "}
                          →{" "}
                          {banner.active_until ? new Date(banner.active_until).toLocaleString("pt-BR") : "sem fim"}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => applyBannerToForm(banner)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={deletingId === banner.id}
                        onClick={() => deleteBanner(banner.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />{" "}
                        {deletingId === banner.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "0.8rem",
                    }}
                  >
                    <div className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">
                        <FontAwesomeIcon icon={faImage} /> Desktop
                      </span>
                      {banner.animation_url && isVideo(banner.animation_url) ? (
                        <video src={banner.animation_url} controls width="100%" />
                      ) : (
                        <img
                          src={banner.animation_url || banner.image_url || ""}
                          alt={banner.title}
                          style={{ width: "100%", borderRadius: "12px" }}
                        />
                      )}
                    </div>
                    <div className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">
                        <FontAwesomeIcon icon={faImage} /> Mobile
                      </span>
                      {banner.animation_mobile_url && isVideo(banner.animation_mobile_url) ? (
                        <video src={banner.animation_mobile_url} controls width="100%" />
                      ) : (
                        <img
                          src={banner.animation_mobile_url || banner.image_mobile_url || ""}
                          alt={banner.title}
                          style={{ width: "100%", borderRadius: "12px" }}
                        />
                      )}
                    </div>
                  </div>

                  {banner.link_type && (
                    <div className="muted">
                      Link: {banner.link_type} {banner.link_value ? `(${banner.link_value})` : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
