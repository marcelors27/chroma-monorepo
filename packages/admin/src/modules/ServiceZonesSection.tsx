import { useEffect, useMemo, useState } from "react"

import { FulfillmentSet, ServiceZone, StockLocation } from "../types"

type ServiceZonesSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  onCountChange?: (count: number) => void
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
}: ServiceZonesSectionProps) {
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
    } catch (err: any) {
      setError(err?.message || "Erro ao remover zona de serviço.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Zonas de serviço</h1>
        <p className="muted">
          Defina onde cada tipo de entrega está disponível. Use códigos ISO-2 (ex.: BR, US).
        </p>
      </header>

      <section className="panel grid" style={{ gap: "1rem" }}>
        <div className="grid" style={{ gap: "0.75rem" }}>
          <h3>Novo conjunto de fulfillment</h3>
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
          {hasFulfillmentSetForSelection ? (
            <span className="muted">
              Já existe um conjunto para este local e tipo selecionados.
            </span>
          ) : (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleCreateFulfillmentSet}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Criar conjunto"}
            </button>
          )}
        </div>

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
          <button className="btn" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? "Salvando..." : "Adicionar zona"}
          </button>
          {error && <span className="muted">Erro: {error}</span>}
          {success && <span className="muted">{success}</span>}
        </div>
      </section>

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
                    onClick={() => handleDelete(zone.id)}
                    disabled={saving}
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
