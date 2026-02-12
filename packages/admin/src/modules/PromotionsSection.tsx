import { FormEvent, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Dispatch, SetStateAction } from "react"

import { PriceList, Product, Region, SalesChannel, StockLocation } from "../types"

type PromotionsSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  products: Product[]
  salesChannels: SalesChannel[]
  regions: Region[]
  priceLists: PriceList[]
  priceListsError: string | null
  setPriceLists: Dispatch<SetStateAction<PriceList[]>>
  stockLocations: StockLocation[]
  setStockLocations: Dispatch<SetStateAction<StockLocation[]>>
  mode?: "list" | "create" | "link"
}

export default function PromotionsSection({
  medusaUrl,
  headers,
  products,
  salesChannels,
  regions,
  priceLists,
  priceListsError,
  setPriceLists,
  stockLocations,
  setStockLocations,
  mode = "list",
}: PromotionsSectionProps) {
  const navigate = useNavigate()
  const isCreateMode = mode === "create"
  const isLinkMode = mode === "link"
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSaving, setPromoSaving] = useState(false)
  const [promoForm, setPromoForm] = useState({
    title: "",
    description: "Promoção criada no admin.",
    variant_id: "",
    sale_price: "",
    currency_code: "brl",
    starts_at: "",
    ends_at: "",
    sales_channel_id: "",
    region_id: "",
  })
  const [promoOnlyActive, setPromoOnlyActive] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkForm, setLinkForm] = useState({
    stock_location_id: "",
    sales_channel_id: "",
  })

  const now = new Date()
  const isScheduledPromo = (promo: PriceList) =>
    promo.starts_at ? new Date(promo.starts_at) > now : false

  const getPromoStatusLabel = (promo: PriceList) => {
    if (isScheduledPromo(promo)) return "Agendada"
    return promo.status || "—"
  }

  const getPromoStatusClass = (promo: PriceList) => {
    if (isScheduledPromo(promo)) return "scheduled"
    if (promo.status === "active") return "active"
    return "default"
  }

  const getPromoRules = (promo: PriceList) => {
    const rules = promo.rules || {}
    const entries = Object.entries(rules)
    if (!entries.length) return ["Todas"]
    return entries
      .flatMap(([key, values]) => {
        if (!values?.length) return null
        if (key === "sales_channel_id") {
          return values.map((value) => {
            const found = salesChannels.find((channel) => channel.id === value)
            return `Canal: ${found?.name || value}`
          })
        }
        if (key === "region_id") {
          return values.map((value) => {
            const found = regions.find((region) => region.id === value)
            return `Região: ${found?.name || value}`
          })
        }
        return values.map((value) => `${key}: ${value}`)
      })
      .filter(Boolean)
      .map((value) => String(value))
  }

  const filteredPromotions = useMemo(() => {
    return promoOnlyActive
      ? priceLists.filter(
          (promo) =>
            promo.type === "sale" && (promo.status === "active" || isScheduledPromo(promo))
        )
      : priceLists
  }, [priceLists, promoOnlyActive])

  const handlePromoChange = (field: keyof typeof promoForm, value: string) => {
    setPromoForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetPromoForm = () => {
    setPromoForm({
      title: "",
      description: "Promoção criada no admin.",
      variant_id: "",
      sale_price: "",
      currency_code: "brl",
      starts_at: "",
      ends_at: "",
      sales_channel_id: "",
      region_id: "",
    })
  }

  const toAmount = (value: string) => {
    const normalized = value.replace(",", ".")
    const parsed = Number(normalized)
    if (Number.isNaN(parsed)) return null
    return Math.round(parsed * 100)
  }

  async function createPromotion(e: FormEvent) {
    e.preventDefault()
    if (!promoForm.title || !promoForm.variant_id || !promoForm.sale_price) {
      setPromoError("Preencha título, variante e preço promocional.")
      return
    }
    const amount = toAmount(promoForm.sale_price)
    if (!amount || amount <= 0) {
      setPromoError("Preço promocional inválido.")
      return
    }
    setPromoSaving(true)
    setPromoError(null)
    try {
      const rules: Record<string, string[]> = {}
      if (promoForm.sales_channel_id) {
        rules.sales_channel_id = [promoForm.sales_channel_id]
      }
      if (promoForm.region_id) {
        rules.region_id = [promoForm.region_id]
      }
      const payload = {
        title: promoForm.title,
        description: promoForm.description || "",
        type: "sale",
        status: "active",
        starts_at: promoForm.starts_at || null,
        ends_at: promoForm.ends_at || null,
        rules: Object.keys(rules).length ? rules : undefined,
        prices: [
          {
            currency_code: promoForm.currency_code,
            amount,
            variant_id: promoForm.variant_id,
          },
        ],
      }
      const res = await fetch(`${medusaUrl}/admin/price-lists`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar a promoção")
      }
      const json = await res.json()
      if (json?.price_list) {
        setPriceLists((prev) => [json.price_list, ...prev])
      }
      resetPromoForm()
      navigate("/promocoes")
    } catch (err: any) {
      setPromoError(err?.message || "Erro ao criar promoção")
    } finally {
      setPromoSaving(false)
    }
  }

  const updateLinkForm = (field: keyof typeof linkForm, value: string) => {
    setLinkForm((prev) => ({ ...prev, [field]: value }))
  }

  const fetchStockLocations = async () => {
    const url =
      `${medusaUrl}/admin/stock-locations?limit=200&fields=` +
      encodeURIComponent("+sales_channels.id,+sales_channels.name")
    const res = await fetch(url, { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível buscar locais de estoque")
    }
    const json = await res.json()
    setStockLocations(json.stock_locations ?? [])
  }

  const linkSalesChannel = async (action: "add" | "remove") => {
    if (!linkForm.stock_location_id || !linkForm.sales_channel_id) {
      setLinkError("Selecione o canal e o local de estoque.")
      return
    }
    setLinkSaving(true)
    setLinkError(null)
    try {
      const payload = {
        add: action === "add" ? [linkForm.sales_channel_id] : [],
        remove: action === "remove" ? [linkForm.sales_channel_id] : [],
      }
      const res = await fetch(
        `${medusaUrl}/admin/stock-locations/${linkForm.stock_location_id}/sales-channels`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar a associação")
      }
      await fetchStockLocations()
    } catch (err: any) {
      setLinkError(err?.message || "Erro ao associar canal")
    } finally {
      setLinkSaving(false)
    }
  }

  if (isCreateMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Nova promoção</h1>
          <p className="page-subtitle">Informe a variante e o preço promocional.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/promocoes")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="promo-create-form" disabled={promoSaving}>
              {promoSaving ? "Criando..." : "Criar promoção"}
            </button>
          </div>
        </div>

        {promoError && <div className="muted">Erro: {promoError}</div>}

        <form id="promo-create-form" className="panel grid" onSubmit={createPromotion} style={{ gap: "0.85rem" }}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Título</span>
            <input
              value={promoForm.title}
              onChange={(e) => handlePromoChange("title", e.target.value)}
              required
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Descrição</span>
            <input
              value={promoForm.description}
              onChange={(e) => handlePromoChange("description", e.target.value)}
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
              <span className="muted">Variante</span>
              <select
                value={promoForm.variant_id}
                onChange={(e) => handlePromoChange("variant_id", e.target.value)}
                required
                className="field-input"
              >
                <option value="">Selecionar</option>
                {products
                  .flatMap((product) =>
                    (product.variants || []).map((variant, idx) => ({
                      id: variant.id,
                      label: `${product.title} • ${variant.title || `Variante ${idx + 1}`}`,
                    }))
                  )
                  .map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Preço promocional (R$)</span>
              <input
                type="number"
                value={promoForm.sale_price}
                onChange={(e) => handlePromoChange("sale_price", e.target.value)}
                min={0}
                step="0.01"
                required
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Moeda</span>
              <input
                value={promoForm.currency_code}
                onChange={(e) => handlePromoChange("currency_code", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Início</span>
              <input
                type="datetime-local"
                value={promoForm.starts_at}
                onChange={(e) => handlePromoChange("starts_at", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Fim</span>
              <input
                type="datetime-local"
                value={promoForm.ends_at}
                onChange={(e) => handlePromoChange("ends_at", e.target.value)}
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Sales Channel (opcional)</span>
              <select
                value={promoForm.sales_channel_id}
                onChange={(e) => handlePromoChange("sales_channel_id", e.target.value)}
                className="field-input"
              >
                <option value="">Todos</option>
                {salesChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name || channel.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Região (opcional)</span>
              <select
                value={promoForm.region_id}
                onChange={(e) => handlePromoChange("region_id", e.target.value)}
                className="field-input"
              >
                <option value="">Todas</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name || region.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" type="button" onClick={resetPromoForm}>
              Limpar
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (isLinkMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Vincular canais a estoques</h1>
          <p className="page-subtitle">Associe canais aos locais de estoque.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/promocoes")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button
              className="btn"
              type="button"
              disabled={linkSaving}
              onClick={() => linkSalesChannel("add")}
            >
              {linkSaving ? "Salvando..." : "Vincular"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={linkSaving}
              onClick={() => linkSalesChannel("remove")}
            >
              Remover vínculo
            </button>
          </div>
        </div>

        {linkError && <div className="muted">Erro: {linkError}</div>}

        <div className="panel grid" style={{ gap: "0.85rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Local de estoque</span>
              <select
                value={linkForm.stock_location_id}
                onChange={(e) => updateLinkForm("stock_location_id", e.target.value)}
                className="field-input"
              >
                <option value="">Selecionar</option>
                {stockLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name || location.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Canal</span>
              <select
                value={linkForm.sales_channel_id}
                onChange={(e) => updateLinkForm("sales_channel_id", e.target.value)}
                className="field-input"
              >
                <option value="">Selecionar</option>
                {salesChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name || channel.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Selecione o local e o canal para atualizar o vínculo.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Promoções</h1>
        <p className="muted">Crie preços promocionais simples para aparecerem como ofertas na vitrine.</p>
      </header>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/promocoes/nova")}>
          Nova promoção
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/promocoes/vinculos")}>
          Vincular canais
        </button>
      </div>

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
            <h3>Promoções recentes</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Visualize as promoções ativas e agendadas.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={promoOnlyActive}
                onChange={(e) => setPromoOnlyActive(e.target.checked)}
              />
              <span className="muted">Ativas ou agendadas</span>
            </label>
            <span className="pill">{filteredPromotions.length} registros</span>
          </div>
        </div>

        {priceListsError && <div className="muted">Erro: {priceListsError}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Regras</th>
                <th>Início</th>
                <th>Fim</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Nenhuma promoção cadastrada.
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promo) => (
                  <tr key={promo.id}>
                    <td>{promo.title || "Promoção"}</td>
                    <td>
                      <span className={`status-chip ${getPromoStatusClass(promo)}`}>
                        {getPromoStatusLabel(promo)}
                      </span>
                    </td>
                    <td>{promo.type || "sale"}</td>
                    <td>
                      <div className="rule-tags">
                        {getPromoRules(promo).map((rule) => (
                          <span key={`${promo.id}-${rule}`} className="rule-tag">
                            {rule}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td>
                      {promo.ends_at ? new Date(promo.ends_at).toLocaleDateString("pt-BR") : "—"}
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
