import { useEffect, useMemo, useState } from "react"

import { Region, ServiceZone, ShippingOption, ShippingProfile } from "../types"

type DeliveryMethodsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  regions: Region[]
  onCountChange?: (count: number) => void
}

type FormState = {
  name: string
  price: string
  serviceZoneId: string
  profileId: string
  providerId: string
  currencyCode: string
}

const DEFAULT_PROVIDER = "manual"

export default function DeliveryMethodsSection({
  medusaUrl,
  headers,
  regions,
  onCountChange,
}: DeliveryMethodsSectionProps) {
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [profiles, setProfiles] = useState<ShippingProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    price: "",
    serviceZoneId: "",
    profileId: "",
    providerId: DEFAULT_PROVIDER,
    currencyCode: "",
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([])

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

  useEffect(() => {
    loadOptions()
    loadProfiles()
    loadServiceZones()
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
      if (!form.serviceZoneId) {
        throw new Error("Selecione a zona de serviço.")
      }
      if (!form.profileId) {
        throw new Error("Selecione o shipping profile.")
      }
      const zoneCurrency =
        serviceZoneById.get(form.serviceZoneId)?.region?.currency_code || null
      const currency =
        zoneCurrency || form.currencyCode || regions[0]?.currency_code || "brl"
      const amountValue = Number(form.price.replace(",", "."))
      if (Number.isNaN(amountValue) || amountValue < 0) {
        throw new Error("Preço inválido.")
      }
      const payload = {
        name: form.name.trim(),
        service_zone_id: form.serviceZoneId,
        shipping_profile_id: form.profileId,
        provider_id: form.providerId || DEFAULT_PROVIDER,
        price_type: "flat",
        prices: [
          {
            currency_code: currency,
            amount: Math.round(amountValue * 100),
          },
        ],
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
    } catch (err: any) {
      setError(err?.message || "Erro ao remover opção.")
    } finally {
      setSaving(false)
    }
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
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Provider</span>
              <input
                className="field-input"
                value={form.providerId}
                onChange={(e) => setFormField("providerId", e.target.value)}
                placeholder={DEFAULT_PROVIDER}
              />
            </label>
          </div>
          <button className="btn" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? "Salvando..." : "Adicionar opção"}
          </button>
          {error && <span className="muted">Erro: {error}</span>}
          {success && <span className="muted">{success}</span>}
        </div>
      </section>

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
                    onClick={() => handleDelete(option.id)}
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
