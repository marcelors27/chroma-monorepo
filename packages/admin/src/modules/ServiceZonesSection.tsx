import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { FulfillmentSet, ServiceZone, StockLocation } from "../types"

type ServiceZonesSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  onCountChange?: (count: number) => void
  mode?: "list" | "zone" | "fulfillment" | "delete"
  zoneId?: string
}

type FormState = {
  name: string
  fulfillmentSetId: string
}

type FulfillmentFormState = {
  locationId: string
  type: "shipping" | "pickup"
}

export default function ServiceZonesSection({
  medusaUrl,
  headers,
  onCountChange,
  mode = "list",
  zoneId,
}: ServiceZonesSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedZoneId = params.zoneId || zoneId
  const isZoneMode = mode === "zone"
  const isFulfillmentMode = mode === "fulfillment"
  const isDeleteMode = mode === "delete"
  const [zones, setZones] = useState<ServiceZone[]>([])
  const [fulfillmentSets, setFulfillmentSets] = useState<FulfillmentSet[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    fulfillmentSetId: "",
  })
  const [fulfillmentForm, setFulfillmentForm] = useState<FulfillmentFormState>({
    locationId: "",
    type: "shipping",
  })

  const fulfillmentSetById = useMemo(() => {
    const map = new Map<string, FulfillmentSet>()
    fulfillmentSets.forEach((set) => {
      if (set.id) map.set(set.id, set)
    })
    return map
  }, [fulfillmentSets])

  const hasFulfillmentSetForSelection = useMemo(() => {
    if (!fulfillmentForm.locationId) return false
    return fulfillmentSets.some(
      (set) =>
        set.location?.id === fulfillmentForm.locationId &&
        set.type === fulfillmentForm.type
    )
  }, [fulfillmentForm.locationId, fulfillmentForm.type, fulfillmentSets])

  const loadServiceZones = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${medusaUrl}/admin/service-zones?limit=200&fields=${encodeURIComponent(
          "+name,+geo_zones,+fulfillment_set,+fulfillment_set.location,+fulfillment_set.type"
        )}`,
        { headers }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível carregar zonas de serviço.")
      }
      const json = await res.json()
      const raw = json?.service_zones
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : []
      setZones(list)
      onCountChange?.(list.length)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar zonas de serviço.")
    } finally {
      setLoading(false)
    }
  }

  const loadFulfillmentSets = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent(
          "+name,+fulfillment_sets,+fulfillment_sets.name,+fulfillment_sets.type"
        )}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      const locations = json?.stock_locations || []
      const sets: FulfillmentSet[] = []
      locations.forEach((location: StockLocation & { fulfillment_sets?: FulfillmentSet[] }) => {
        location.fulfillment_sets?.forEach((set) => {
          sets.push({
            ...set,
            location: { id: location.id, name: location.name },
          })
        })
      })
      setFulfillmentSets(sets)
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadStockLocations = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent("+name")}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      setStockLocations(json?.stock_locations || [])
    } catch {
      // Ignore; handled in UI
    }
  }

  useEffect(() => {
    loadServiceZones()
    loadFulfillmentSets()
    loadStockLocations()
  }, [])

  useEffect(() => {
    if (!form.fulfillmentSetId && fulfillmentSets.length) {
      setForm((prev) => ({ ...prev, fulfillmentSetId: fulfillmentSets[0].id }))
    }
  }, [fulfillmentSets, form.fulfillmentSetId])

  useEffect(() => {
    if (!fulfillmentForm.locationId && stockLocations.length) {
      setFulfillmentForm((prev) => ({
        ...prev,
        locationId: stockLocations[0].id,
      }))
    }
  }, [stockLocations, fulfillmentForm.locationId])

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateFulfillmentForm = (field: keyof FulfillmentFormState, value: string) => {
    setFulfillmentForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateFulfillmentSet = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!fulfillmentForm.locationId) {
        throw new Error("Selecione o local de estoque.")
      }
      const location = stockLocations.find(
        (item) => item.id === fulfillmentForm.locationId
      )
      const name = `${location?.name || "Local"} ${
        fulfillmentForm.type === "pickup" ? "pickup" : "shipping"
      }`
      const res = await fetch(
        `${medusaUrl}/admin/stock-locations/${fulfillmentForm.locationId}/fulfillment-sets`,
        {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          type: fulfillmentForm.type,
        }),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar o conjunto de fulfillment.")
      }
      setSuccess("Conjunto de fulfillment criado com sucesso.")
      await loadFulfillmentSets()
      if (!form.fulfillmentSetId) {
        const json = await res.json().catch(() => null)
        const created = json?.fulfillment_set
        if (created?.id) {
          setForm((prev) => ({ ...prev, fulfillmentSetId: created.id }))
        }
      }
      navigate("/zonas-servico")
    } catch (err: any) {
      setError(err?.message || "Erro ao criar conjunto de fulfillment.")
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!form.name.trim()) {
        throw new Error("Informe o nome da zona de serviço.")
      }
      if (!form.fulfillmentSetId) {
        throw new Error("Selecione o conjunto de fulfillment.")
      }
      const countryCodes = ["br"]
      const payload = {
        name: form.name.trim(),
        fulfillment_set_id: form.fulfillmentSetId,
        geo_zones: countryCodes.map((code) => ({
          type: "country",
          country_code: code.toLowerCase(),
        })),
      }
      const res = await fetch(`${medusaUrl}/admin/service-zones`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar a zona de serviço.")
      }
      setSuccess("Zona de serviço criada com sucesso.")
      setForm((prev) => ({ ...prev, name: "" }))
      await loadServiceZones()
      navigate("/zonas-servico")
    } catch (err: any) {
      setError(err?.message || "Erro ao criar zona de serviço.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (zoneId: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/service-zones/${zoneId}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível remover a zona de serviço.")
      }
      setSuccess("Zona de serviço removida.")
      await loadServiceZones()
      return true
    } catch (err: any) {
      setError(err?.message || "Erro ao remover zona de serviço.")
      return false
    } finally {
      setSaving(false)
    }
  }

  if (isDeleteMode) {
    const zone = zones.find((item) => item.id === resolvedZoneId) || null

    if (loading && !zone) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir zona de serviço</h1>
            <p className="page-subtitle">Carregando zona...</p>
          </header>
        </div>
      )
    }

    if (!zone) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir zona de serviço</h1>
            <p className="page-subtitle">Zona não encontrada.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico")}>
            Voltar
          </button>
        </div>
      )
    }

    const set = zone.fulfillment_set
    const locationName = set?.location?.name || set?.location?.id
    const typeLabel = set?.type || "shipping"
    const countries =
      zone.geo_zones
        ?.filter((geo) => geo.type === "country" && geo.country_code)
        .map((geo) => geo.country_code?.toUpperCase())
        .filter(Boolean) || []

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir zona de serviço</h1>
          <p className="page-subtitle">{zone.name || "Zona"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const ok = await handleDelete(zone.id)
              if (ok) navigate("/zonas-servico")
            }}
            disabled={saving}
          >
            {saving ? "Removendo..." : "Confirmar exclusão"}
          </button>
        </div>

        {error && <div className="panel muted">Erro: {error}</div>}
        {success && <div className="panel muted">{success}</div>}

        <section className="panel" style={{ maxWidth: "820px" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Fulfillment</span>
              <span>{locationName || "Local"} · {typeLabel}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Países</span>
              <span>{countries.length ? countries.join(", ") : "—"}</span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (isFulfillmentMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Novo conjunto de fulfillment</h1>
          <p className="page-subtitle">Crie conjuntos por local e tipo.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button
              className="btn"
              type="button"
              onClick={handleCreateFulfillmentSet}
              disabled={saving || hasFulfillmentSetForSelection}
            >
              {saving ? "Salvando..." : "Criar conjunto"}
            </button>
          </div>
        </div>

        <section className="panel grid" style={{ gap: "1rem" }}>
          <div className="grid" style={{ gap: "0.75rem" }}>
            <div className="grid grid-3">
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Local de estoque</span>
                <select
                  className="field-input"
                  value={fulfillmentForm.locationId}
                  onChange={(e) => updateFulfillmentForm("locationId", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {stockLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name || location.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Tipo</span>
                <select
                  className="field-input"
                  value={fulfillmentForm.type}
                  onChange={(e) =>
                    updateFulfillmentForm("type", e.target.value as FulfillmentFormState["type"])
                  }
                >
                  <option value="shipping">Shipping</option>
                  <option value="pickup">Pickup</option>
                </select>
              </label>
              <div className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Nome automático</span>
                <span>
                  {(() => {
                    const location = stockLocations.find(
                      (item) => item.id === fulfillmentForm.locationId
                    )
                    return `${location?.name || "Local"} ${
                      fulfillmentForm.type === "pickup" ? "pickup" : "shipping"
                    }`
                  })()}
                </span>
              </div>
            </div>
            {hasFulfillmentSetForSelection && (
              <span className="muted">
                Já existe um conjunto para este local e tipo selecionados.
              </span>
            )}
            {error && <span className="muted">Erro: {error}</span>}
            {success && <span className="muted">{success}</span>}
          </div>
        </section>
      </div>
    )
  }

  if (isZoneMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Nova zona de serviço</h1>
          <p className="page-subtitle">Defina a zona e seu conjunto de fulfillment.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="button" onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar zona"}
            </button>
          </div>
        </div>

        <section className="panel grid" style={{ gap: "1rem" }}>
          <div className="grid" style={{ gap: "0.5rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Nome</span>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="Zona principal"
              />
            </label>
            <div className="grid grid-2">
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Conjunto de fulfillment</span>
                <select
                  className="field-input"
                  value={form.fulfillmentSetId}
                  onChange={(e) => updateForm("fulfillmentSetId", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {fulfillmentSets.map((set) => {
                    const location = set.location?.name || set.location?.id
                    const label = `${location || "Local"} · ${set.type || "shipping"}`
                    return (
                      <option key={set.id} value={set.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </label>
              <div className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">País fixo: Brasil (BR)</span>
              </div>
            </div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              Revise o nome e o fulfillment set antes de salvar.
            </div>
            {error && <span className="muted">Erro: {error}</span>}
            {success && <span className="muted">{success}</span>}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Zonas de serviço</h1>
        <p className="muted">
          Defina onde cada tipo de entrega está disponível. Use códigos ISO-2 (ex.: BR, US).
        </p>
      </header>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico/nova")}>
          Nova zona
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/zonas-servico/fulfillment")}>
          Novo fulfillment set
        </button>
      </div>

      <section className="grid" style={{ gap: "1rem" }}>
        <div className="panel grid" style={{ gap: "0.5rem" }}>
          <h3>Zonas cadastradas</h3>
          {loading && <span className="muted">Carregando...</span>}
          {!loading && zones.length === 0 && (
            <span className="muted">Nenhuma zona cadastrada.</span>
          )}
          <div className="grid" style={{ gap: "0.75rem" }}>
            {zones.map((zone) => {
              const set = zone.fulfillment_set
              const locationName = set?.location?.name || set?.location?.id
              const typeLabel = set?.type || "shipping"
              const countries =
                zone.geo_zones
                  ?.filter((geo) => geo.type === "country" && geo.country_code)
                  .map((geo) => geo.country_code?.toUpperCase())
                  .filter(Boolean) || []
              return (
                <div key={zone.id} className="panel grid" style={{ gap: "0.35rem" }}>
                  <strong>{zone.name || "Zona"}</strong>
                  <span className="muted">
                    Fulfillment: {locationName || "Local"} · {typeLabel}
                  </span>
                  <span className="muted">
                    Países: {countries.length ? countries.join(", ") : "—"}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => navigate(`/zonas-servico/${zone.id}/excluir`)}
                  >
                    Remover
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
