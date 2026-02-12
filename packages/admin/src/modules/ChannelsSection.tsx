import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Dispatch, SetStateAction } from "react"

import { SalesChannel } from "../types"

type ChannelsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  salesChannels: SalesChannel[]
  setSalesChannels: Dispatch<SetStateAction<SalesChannel[]>>
  mode?: "list" | "create" | "edit"
  channelId?: string
}

export default function ChannelsSection({
  medusaUrl,
  headers,
  salesChannels,
  setSalesChannels,
  mode = "list",
}: ChannelsSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const routeChannelId = params.channelId
  const [channelError, setChannelError] = useState<string | null>(null)
  const [channelSaving, setChannelSaving] = useState(false)
  const [channelSavingId, setChannelSavingId] = useState<string | null>(null)
  const [channelForm, setChannelForm] = useState({
    name: "",
    description: "",
    is_disabled: false,
  })
  const [channelEdits, setChannelEdits] = useState<Record<string, typeof channelForm>>({})
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const resolvedChannelId = routeChannelId || channelId
  const activeChannel =
    isEditMode && resolvedChannelId ? salesChannels.find((c) => c.id === resolvedChannelId) : null

  useEffect(() => {
    if (!isEditMode) return
    if (!activeChannel) return
    setChannelEdits((prev) => ({
      ...prev,
      [activeChannel.id]: {
        name: activeChannel.name || "",
        description: activeChannel.description || "",
        is_disabled: Boolean(activeChannel.is_disabled),
      },
    }))
  }, [isEditMode, activeChannel?.id])

  const handleChannelChange = (
    field: keyof typeof channelForm,
    value: string | boolean
  ) => {
    setChannelForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetChannelForm = () => {
    setChannelForm({
      name: "",
      description: "",
      is_disabled: false,
    })
  }

  async function createSalesChannel(e: FormEvent) {
    e.preventDefault()
    if (!channelForm.name) {
      setChannelError("Informe o nome do canal.")
      return
    }
    setChannelSaving(true)
    setChannelError(null)
    try {
      const payload = {
        name: channelForm.name,
        description: channelForm.description || null,
        is_disabled: channelForm.is_disabled,
      }
      const res = await fetch(`${medusaUrl}/admin/sales-channels`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar o canal")
      }
      const json = await res.json()
      if (json?.sales_channel) {
        setSalesChannels((prev) => [json.sales_channel, ...prev])
      }
      resetChannelForm()
      navigate("/canais")
    } catch (err: any) {
      setChannelError(err?.message || "Erro ao criar canal")
    } finally {
      setChannelSaving(false)
    }
  }

  const updateChannelEdit = (
    channelId: string,
    field: keyof typeof channelForm,
    value: string | boolean
  ) => {
    setChannelEdits((prev) => ({
      ...prev,
      [channelId]: {
        ...(prev[channelId] || { name: "", description: "", is_disabled: false }),
        [field]: value,
      },
    }))
  }

  const saveChannelEdit = async (channelId: string) => {
    const payload = channelEdits[channelId]
    if (!payload?.name) {
      setChannelError("Informe o nome do canal.")
      return
    }
    setChannelSavingId(channelId)
    setChannelError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/sales-channels/${channelId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: payload.name,
          description: payload.description || null,
          is_disabled: payload.is_disabled,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar o canal")
      }
      const json = await res.json()
      if (json?.sales_channel) {
        setSalesChannels((prev) =>
          prev.map((item) => (item.id === channelId ? json.sales_channel : item))
        )
      }
      navigate("/canais")
    } catch (err: any) {
      setChannelError(err?.message || "Erro ao atualizar canal")
    } finally {
      setChannelSavingId(null)
    }
  }

  if (isCreateMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Novo canal</h1>
          <p className="page-subtitle">Use canais para segmentar preços e disponibilidade.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/canais")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="channel-form" disabled={channelSaving}>
              {channelSaving ? "Criando..." : "Criar canal"}
            </button>
          </div>
        </div>

        {channelError && <div className="muted">Erro: {channelError}</div>}

        <form id="channel-form" className="panel grid" onSubmit={createSalesChannel} style={{ gap: "0.85rem" }}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Nome</span>
            <input
              value={channelForm.name}
              onChange={(e) => handleChannelChange("name", e.target.value)}
              required
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Descrição</span>
            <input
              value={channelForm.description}
              onChange={(e) => handleChannelChange("description", e.target.value)}
              className="field-input"
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={channelForm.is_disabled}
              onChange={(e) => handleChannelChange("is_disabled", e.target.checked)}
              className="checkbox"
            />
            <span className="muted">Canal desativado</span>
          </label>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" type="button" onClick={resetChannelForm}>
              Limpar
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (isEditMode) {
    const edit = activeChannel ? channelEdits[activeChannel.id] : null
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar canal</h1>
          <p className="page-subtitle">{activeChannel?.name || "Canal"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/canais")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button
              className="btn"
              type="button"
              disabled={channelSavingId === activeChannel?.id}
              onClick={() => activeChannel && saveChannelEdit(activeChannel.id)}
            >
              {channelSavingId === activeChannel?.id ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {channelError && <div className="muted">Erro: {channelError}</div>}

        {!activeChannel ? (
          <div className="panel muted">Canal não encontrado.</div>
        ) : (
          <div className="panel grid" style={{ gap: "0.85rem", maxWidth: "720px" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Nome</span>
              <input
                value={edit?.name || ""}
                onChange={(e) => updateChannelEdit(activeChannel.id, "name", e.target.value)}
                className="field-input"
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Descrição</span>
              <input
                value={edit?.description || ""}
                onChange={(e) =>
                  updateChannelEdit(activeChannel.id, "description", e.target.value)
                }
                className="field-input"
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={edit?.is_disabled || false}
                onChange={(e) =>
                  updateChannelEdit(activeChannel.id, "is_disabled", e.target.checked)
                }
              />
              <span className="muted">Canal desativado</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" type="button" onClick={() => navigate("/canais")}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Canais de vendas</h1>
        <p className="muted">Crie e organize canais para separar vitrines e promoções.</p>
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
          <h3>Canais existentes</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="pill">{salesChannels.length} registros</span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => navigate("/canais/novo")}
            >
              Novo canal
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {salesChannels.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center" }}>
                    Nenhum canal cadastrado.
                  </td>
                </tr>
              ) : (
                salesChannels.map((channel) => (
                  <tr key={channel.id}>
                    <td>{channel.name || channel.id}</td>
                    <td>{channel.description || "—"}</td>
                    <td>
                      <span
                        className={`status-chip ${channel.is_disabled ? "default" : "active"}`}
                      >
                        {channel.is_disabled ? "Desativado" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => navigate(`/canais/${channel.id}`)}
                      >
                        Editar
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
