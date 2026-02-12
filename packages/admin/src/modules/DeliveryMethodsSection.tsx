import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Region, ServiceZone, ShippingOption, ShippingProfile } from "../types"

type DeliveryMethodsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  regions: Region[]
  onCountChange?: (count: number) => void
  mode?: "list" | "create" | "delete"
  optionId?: string
}

type FormState = {
  name: string
  price: string
  serviceZoneId: string
  profileId: string
  currencyCode: string
}

type StockLocationWithSets = {
  id: string
  name?: string
  fulfillment_sets?: { id: string; name?: string; type?: string }[]
}

const DEFAULT_PROVIDER = "manual"
const slugifyTypeCode = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default"

export default function DeliveryMethodsSection({
  medusaUrl,
  headers,
  regions,
  onCountChange,
  mode = "list",
  optionId,
}: DeliveryMethodsSectionProps) {
  const navigate = useNavigate()
  const params = useParams()
  const resolvedOptionId = params.optionId || optionId
  const isCreateMode = mode === "create"
  const isDeleteMode = mode === "delete"
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [profiles, setProfiles] = useState<ShippingProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    price: "",
    serviceZoneId: "",
    profileId: "",
    currencyCode: "",
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([])
  const [fulfillmentSetLocations, setFulfillmentSetLocations] = useState<
    Map<string, { locationId: string; locationName?: string }>
  >(new Map())
  const [fulfillmentProviders, setFulfillmentProviders] = useState<{ id: string }[]>([])
  const [salesChannels, setSalesChannels] = useState<{ id: string }[]>([])

  const serviceZoneById = useMemo(() => {
    const map = new Map<string, ServiceZone>()
    serviceZones.forEach((zone) => {
      if (zone.id) {
        map.set(zone.id, zone)
      }
    })
    return map
  }, [serviceZones])

  const setFormField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const loadOptions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${medusaUrl}/admin/shipping-options?limit=200&fields=${encodeURIComponent(
          "+prices,+region,+service_zone,+service_zone.fulfillment_set,+service_zone.fulfillment_set.location,+shipping_profile,+provider_id,+price_type"
        )}`,
        { headers }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível carregar opções de entrega.")
      }
      const json = await res.json()
      const list = json?.shipping_options || []
      setOptions(list)
      onCountChange?.(list.length)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar opções de entrega.")
    } finally {
      setLoading(false)
    }
  }

  const loadProfiles = async () => {
    try {
      const res = await fetch(`${medusaUrl}/admin/shipping-profiles?limit=200`, { headers })
      if (!res.ok) return
      const json = await res.json()
      setProfiles(json?.shipping_profiles || [])
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadServiceZones = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/service-zones?limit=200&fields=${encodeURIComponent(
          "+name,+region,+fulfillment_set,+fulfillment_set.location"
        )}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      setServiceZones(json?.service_zones || [])
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadFulfillmentProviders = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/fulfillment-providers?limit=200&fields=${encodeURIComponent("+id")}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      setFulfillmentProviders(json?.fulfillment_providers || [])
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadFulfillmentSetLocations = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent(
          "+name,+fulfillment_sets,+fulfillment_sets.name,+fulfillment_sets.type"
        )}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      const locations: StockLocationWithSets[] = json?.stock_locations || []
      const map = new Map<string, { locationId: string; locationName?: string }>()
      locations.forEach((location) => {
        location.fulfillment_sets?.forEach((set) => {
          if (set?.id) {
            map.set(set.id, { locationId: location.id, locationName: location.name })
          }
        })
      })
      setFulfillmentSetLocations(map)
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadSalesChannels = async () => {
    try {
      const res = await fetch(
        `${medusaUrl}/admin/sales-channels?limit=200&fields=${encodeURIComponent("+id")}`,
        { headers }
      )
      if (!res.ok) return
      const json = await res.json()
      setSalesChannels(json?.sales_channels || [])
    } catch {
      // Ignore; handled in UI
    }
  }

  const loadStockLocationsWithSets = async () => {
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent(
        "+name,+fulfillment_sets,+fulfillment_sets.name,+fulfillment_sets.type"
      )}`,
      { headers }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível carregar locais de estoque.")
    }
    const json = await res.json().catch(() => null)
    return (json?.stock_locations || []) as StockLocationWithSets[]
  }

  const createFulfillmentSet = async (
    locationId: string,
    locationName: string | undefined,
    type: "shipping" | "pickup"
  ) => {
    const name = `${locationName || "Local"} ${type}`
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations/${locationId}/fulfillment-sets`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name, type }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível criar o conjunto de fulfillment.")
    }
    const json = await res.json().catch(() => null)
    return json?.fulfillment_set?.id as string | undefined
  }

  const createServiceZone = async (fulfillmentSetId: string) => {
    const payload = {
      name: "Zona principal",
      fulfillment_set_id: fulfillmentSetId,
      geo_zones: [{ type: "country", country_code: "br" }],
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
  }

  const ensureServiceZone = async () => {
    if (form.serviceZoneId) return form.serviceZoneId

    const zonesRes = await fetch(
      `${medusaUrl}/admin/service-zones?limit=200&fields=${encodeURIComponent(
        "+name,+region,+fulfillment_set,+fulfillment_set.location"
      )}`,
      { headers }
    )
    if (zonesRes.ok) {
      const json = await zonesRes.json().catch(() => null)
      const list = json?.service_zones || []
      if (list.length) {
        const id = list[0].id as string
        setFormField("serviceZoneId", id)
        setServiceZones(list)
        return id
      }
    }

    const locations = await loadStockLocationsWithSets()
    if (!locations.length) {
      throw new Error("Nenhum local de estoque encontrado. Cadastre um local primeiro.")
    }
    const location = locations[0]
    const existingSet =
      location.fulfillment_sets?.find((set) => set.type === "shipping") ||
      location.fulfillment_sets?.[0]
    let setId = existingSet?.id
    if (!setId) {
      setId = await createFulfillmentSet(location.id, location.name, "shipping")
    }
    if (!setId) {
      throw new Error("Não foi possível identificar o conjunto de fulfillment criado.")
    }

    await createServiceZone(setId)
    await Promise.all([loadServiceZones(), loadFulfillmentSetLocations()])

    const updatedZonesRes = await fetch(
      `${medusaUrl}/admin/service-zones?limit=200&fields=${encodeURIComponent(
        "+name,+region,+fulfillment_set,+fulfillment_set.location"
      )}`,
      { headers }
    )
    if (!updatedZonesRes.ok) {
      throw new Error("Não foi possível recarregar zonas de serviço.")
    }
    const updated = await updatedZonesRes.json().catch(() => null)
    const createdList = updated?.service_zones || []
    if (!createdList.length) {
      throw new Error("Nenhuma zona de serviço encontrada após a criação automática.")
    }
    const createdId = createdList[0].id as string
    setFormField("serviceZoneId", createdId)
    setServiceZones(createdList)
    return createdId
  }

  const ensureProviderEnabled = async (locationId: string, providerId: string) => {
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations/${locationId}/fulfillment-providers`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ add: [providerId] }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível habilitar o provider no local.")
    }
  }

  const ensureProviderEnabledForAll = async (providerId: string) => {
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent("+id")}`,
      { headers }
    )
    if (!res.ok) return
    const json = await res.json()
    const locations: { id: string }[] = json?.stock_locations || []
    for (const location of locations) {
      if (!location?.id) continue
      await ensureProviderEnabled(location.id, providerId)
    }
  }

  const ensureSalesChannelEnabled = async (locationId: string, salesChannelId: string) => {
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations/${locationId}/sales-channels`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ add: [salesChannelId] }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível vincular o sales channel ao local.")
    }
  }

  const ensureSalesChannelEnabledForAll = async (salesChannelId: string) => {
    const res = await fetch(
      `${medusaUrl}/admin/stock-locations?limit=200&fields=${encodeURIComponent("+id")}`,
      { headers }
    )
    if (!res.ok) return
    const json = await res.json()
    const locations: { id: string }[] = json?.stock_locations || []
    for (const location of locations) {
      if (!location?.id) continue
      await ensureSalesChannelEnabled(location.id, salesChannelId)
    }
  }

  useEffect(() => {
    loadOptions()
    loadProfiles()
    loadServiceZones()
    loadFulfillmentSetLocations()
    loadFulfillmentProviders()
    loadSalesChannels()
  }, [])

  useEffect(() => {
    if (!form.currencyCode && regions.length) {
      const first = regions[0]?.currency_code || "brl"
      setFormField("currencyCode", first)
    }
  }, [regions, form.currencyCode])

  useEffect(() => {
    if (!form.profileId && profiles.length) {
      setFormField("profileId", profiles[0].id)
    }
  }, [profiles, form.profileId])

  useEffect(() => {
    if (!form.serviceZoneId && serviceZones.length) {
      setFormField("serviceZoneId", serviceZones[0].id)
    }
  }, [serviceZones, form.serviceZoneId])

  useEffect(() => {
    const zone = serviceZoneById.get(form.serviceZoneId)
    const zoneCurrency = zone?.region?.currency_code
    if (zoneCurrency) {
      setFormField("currencyCode", zoneCurrency)
    }
  }, [form.serviceZoneId, serviceZoneById])

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!form.name.trim()) {
        throw new Error("Informe o nome da forma de entrega.")
      }
      const resolvedServiceZoneId = await ensureServiceZone()
      if (!form.profileId) {
        throw new Error("Selecione o shipping profile.")
      }
      const zoneCurrency =
        serviceZoneById.get(resolvedServiceZoneId)?.region?.currency_code || null
      const currency =
        zoneCurrency || form.currencyCode || regions[0]?.currency_code || "brl"
      const amountValue = Number(form.price.replace(",", "."))
      if (Number.isNaN(amountValue) || amountValue < 0) {
        throw new Error("Preço inválido.")
      }
      const payload = {
        name: form.name.trim(),
        service_zone_id: resolvedServiceZoneId,
        shipping_profile_id: form.profileId,
        provider_id: fulfillmentProviders[0]?.id || DEFAULT_PROVIDER,
        price_type: "flat",
        type: {
          label: form.name.trim(),
          code: slugifyTypeCode(form.name),
        },
        prices: [
          {
            currency_code: currency,
            amount: Math.round(amountValue * 100),
          },
        ],
      }
      const zone = serviceZoneById.get(resolvedServiceZoneId)
      const setId = zone?.fulfillment_set?.id
      const locationInfo = setId ? fulfillmentSetLocations.get(setId) : null
      const salesChannelId = salesChannels[0]?.id
      if (locationInfo?.locationId) {
        await ensureProviderEnabled(locationInfo.locationId, payload.provider_id)
        if (salesChannelId) {
          await ensureSalesChannelEnabled(locationInfo.locationId, salesChannelId)
        }
      } else {
        await ensureProviderEnabledForAll(payload.provider_id)
        if (salesChannelId) {
          await ensureSalesChannelEnabledForAll(salesChannelId)
        }
      }
      const res = await fetch(`${medusaUrl}/admin/shipping-options`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar a opção de entrega.")
      }
      setSuccess("Opção criada com sucesso.")
      setForm((prev) => ({ ...prev, name: "", price: "" }))
      await loadOptions()
      navigate("/entregas")
    } catch (err: any) {
      setError(err?.message || "Erro ao criar opção de entrega.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (optionId: string) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/shipping-options/${optionId}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível remover a opção.")
      }
      setSuccess("Opção removida.")
      await loadOptions()
      return true
    } catch (err: any) {
      setError(err?.message || "Erro ao remover opção.")
      return false
    } finally {
      setSaving(false)
    }
  }

  if (isDeleteMode) {
    const option = options.find((item) => item.id === resolvedOptionId) || null

    if (loading && !option) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir forma de entrega</h1>
            <p className="page-subtitle">Carregando opção...</p>
          </header>
        </div>
      )
    }

    if (!option) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
          <header className="page-header">
            <h1 className="page-title">Excluir forma de entrega</h1>
            <p className="page-subtitle">Opção não encontrada.</p>
          </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/entregas")}>
            Voltar
          </button>
        </div>
      )
    }

    const price = option.prices?.[0]
    const amount = price?.amount ?? 0
    const formatted = (amount / 100).toFixed(2).replace(".", ",")

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir forma de entrega</h1>
          <p className="page-subtitle">{option.name || "Entrega"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/entregas")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const ok = await handleDelete(option.id)
              if (ok) navigate("/entregas")
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
              <span className="muted">Zona de serviço</span>
              <span>
                {option.service_zone?.name ||
                  option.service_zone?.fulfillment_set?.location?.name ||
                  option.service_zone?.id ||
                  "—"}
              </span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Perfil</span>
              <span>{option.shipping_profile?.name || option.shipping_profile?.id || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Preço</span>
              <span>R$ {formatted}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Provider</span>
              <span>{option.provider_id || DEFAULT_PROVIDER}</span>
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
          <h1 className="page-title">Nova forma de entrega</h1>
          <p className="page-subtitle">Cadastre opções como “Receber em um dia”.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/entregas")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="button" onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar opção"}
            </button>
          </div>
        </div>

        <section className="panel grid" style={{ gap: "1rem" }}>
          <div className="grid" style={{ gap: "0.5rem" }}>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Nome da opção</span>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => setFormField("name", e.target.value)}
                placeholder="Receber em um dia"
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Preço (R$)</span>
              <input
                className="field-input"
                value={form.price}
                onChange={(e) => setFormField("price", e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </label>
            <div className="grid grid-3">
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Zona de serviço</span>
                <select
                  className="field-input"
                  value={form.serviceZoneId}
                  onChange={(e) => setFormField("serviceZoneId", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {serviceZones.map((zone) => {
                    const locationName = zone.fulfillment_set?.location?.name
                    const label = zone.name || locationName || zone.id
                    return (
                      <option key={zone.id} value={zone.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Shipping profile</span>
                <select
                  className="field-input"
                  value={form.profileId}
                  onChange={(e) => setFormField("profileId", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || profile.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Moeda</span>
                <select
                  className="field-input"
                  value={form.currencyCode}
                  onChange={(e) => setFormField("currencyCode", e.target.value)}
                >
                  {regions.map((region) => (
                    <option key={region.id} value={region.currency_code || "brl"}>
                      {(region.currency_code || "brl").toUpperCase()}
                    </option>
                  ))}
                  {!regions.length && <option value="brl">BRL</option>}
                </select>
              </label>
            </div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              Revise a zona e o profile antes de salvar.
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
        <h1 style={{ fontSize: "2rem" }}>Formas de entrega</h1>
        <p className="muted">
          Cadastre opções como “Receber em um dia” ou “Buscar na loja”. Esses nomes
          aparecem no checkout.
        </p>
      </header>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/entregas/nova")}>
          Nova forma de entrega
        </button>
      </div>

      <section className="grid" style={{ gap: "1rem" }}>
        <div className="panel grid" style={{ gap: "0.5rem" }}>
          <h3>Opções cadastradas</h3>
          {loading && <span className="muted">Carregando...</span>}
          {!loading && options.length === 0 && <span className="muted">Nenhuma opção cadastrada.</span>}
          <div className="grid" style={{ gap: "0.75rem" }}>
            {options.map((option) => {
              const price = option.prices?.[0]
              const amount = price?.amount ?? 0
              const formatted = (amount / 100).toFixed(2).replace(".", ",")
              return (
                <div key={option.id} className="panel grid" style={{ gap: "0.35rem" }}>
                  <strong>{option.name || "Entrega"}</strong>
                  <span className="muted">
                    Zona de serviço:{" "}
                    {option.service_zone?.name ||
                      option.service_zone?.fulfillment_set?.location?.name ||
                      option.service_zone?.id ||
                      "—"}
                  </span>
                  <span className="muted">
                    Perfil: {option.shipping_profile?.name || option.shipping_profile?.id || "—"}
                  </span>
                  <span className="muted">Preço: R$ {formatted}</span>
                  <span className="muted">Provider: {option.provider_id || DEFAULT_PROVIDER}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => navigate(`/entregas/${option.id}/excluir`)}
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
