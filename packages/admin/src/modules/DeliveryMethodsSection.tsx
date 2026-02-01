import { useEffect, useMemo, useState } from "react"

import { Region, ShippingOption, ShippingProfile } from "../types"

type DeliveryMethodsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  regions: Region[]
  onCountChange?: (count: number) => void
}

type FormState = {
  name: string
  price: string
  regionId: string
  profileId: string
  providerId: string
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
    regionId: "",
    profileId: "",
    providerId: DEFAULT_PROVIDER,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const currencyByRegion = useMemo(() => {
    const map = new Map<string, string>()
    regions.forEach((region) => {
      if (region.id && region.currency_code) {
        map.set(region.id, region.currency_code)
      }
    })
    return map
  }, [regions])

  const setFormField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const loadOptions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${medusaUrl}/admin/shipping-options?limit=200&fields=${encodeURIComponent(
          "+prices,+region,+shipping_profile,+provider_id,+price_type"
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

  useEffect(() => {
    loadOptions()
    loadProfiles()
  }, [])

  useEffect(() => {
    if (!form.regionId && regions.length) {
      setFormField("regionId", regions[0].id)
    }
  }, [regions, form.regionId])

  useEffect(() => {
    if (!form.profileId && profiles.length) {
      setFormField("profileId", profiles[0].id)
    }
  }, [profiles, form.profileId])

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!form.name.trim()) {
        throw new Error("Informe o nome da forma de entrega.")
      }
      if (!form.regionId) {
        throw new Error("Selecione a região.")
      }
      if (!form.profileId) {
        throw new Error("Selecione o shipping profile.")
      }
      const currency = currencyByRegion.get(form.regionId) || "brl"
      const amountValue = Number(form.price.replace(",", "."))
      if (Number.isNaN(amountValue) || amountValue < 0) {
        throw new Error("Preço inválido.")
      }
      const payload = {
        name: form.name.trim(),
        region_id: form.regionId,
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
              <span className="muted">Região</span>
              <select
                className="field-input"
                value={form.regionId}
                onChange={(e) => setFormField("regionId", e.target.value)}
              >
                <option value="">Selecione</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name || region.id}
                  </option>
                ))}
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
                    Região: {option.region?.name || option.region?.id || "—"}
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
