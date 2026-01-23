import { useEffect, useMemo, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowsRotate,
  faMinus,
  faPlus,
  faRightLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons"

import { Product, StockLocation } from "../types"

type StockSectionProps = {
  medusaUrl: string
  headers: Record<string, string>
  products: Product[]
  stockLocations: StockLocation[]
}

type VariantOption = { sku: string; label: string; title: string }
type InventoryItem = {
  id: string
  sku?: string | null
  title?: string | null
  location_levels?: {
    id: string
    location_id: string
    stocked_quantity?: number | null
    reserved_quantity?: number | null
    available_quantity?: number | null
  }[]
}

export default function StockSection({
  medusaUrl,
  headers,
  products,
  stockLocations,
}: StockSectionProps) {
  const [modal, setModal] = useState<{
    type: "add" | "remove" | "transfer" | "delete"
    sku: string
    locationId: string
  } | null>(null)
  const [modalQuantity, setModalQuantity] = useState("")
  const [modalToLocationId, setModalToLocationId] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [stockFilter, setStockFilter] = useState("")
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const updateModal = (updates: Partial<NonNullable<typeof modal>>) => {
    setModal((current) => (current ? { ...current, ...updates } : current))
  }

  const variantOptions = useMemo<VariantOption[]>(() => {
    return products
      .flatMap((product) =>
        (product.variants || [])
          .map((variant, idx) => ({
            sku: variant.sku || "",
            title: product.title || "Produto",
            label: `${product.title || "Produto"} • ${variant.title || `Variante ${idx + 1}`}`,
          }))
          .filter((variant) => Boolean(variant.sku))
      )
      .filter(Boolean)
  }, [products])

  const productTitleBySku = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach((product) => {
      (product.variants || []).forEach((variant) => {
        if (variant.sku) {
          map.set(variant.sku, product.title || "Produto")
        }
      })
    })
    return map
  }, [products])

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>()
    stockLocations.forEach((location) => {
      map.set(location.id, location.name || location.id)
    })
    return map
  }, [stockLocations])

  const stockRows = useMemo(() => {
    const rows = inventoryItems.flatMap((item) =>
      (item.location_levels || []).map((level) => ({
        sku: item.sku || "",
        productTitle:
          (item.title || "").trim().toLowerCase() === "padrão"
            ? productTitleBySku.get(item.sku || "") || "Produto"
            : item.title || productTitleBySku.get(item.sku || "") || "Produto",
        locationId: level.location_id,
        locationName: locationNameById.get(level.location_id) || level.location_id,
        stocked: level.stocked_quantity ?? 0,
        reserved: level.reserved_quantity ?? 0,
        available: level.available_quantity ?? null,
      }))
    )
    const filter = stockFilter.trim().toLowerCase()
    if (!filter) return rows
    return rows.filter((row) =>
      [row.sku, row.productTitle, row.locationName].some((value) =>
        value.toLowerCase().includes(filter)
      )
    )
  }, [inventoryItems, locationNameById, productTitleBySku, stockFilter])

  const parseQuantity = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed) || parsed < 0) return null
    return Math.floor(parsed)
  }

  const getInventoryItemBySku = async (sku: string) => {
    const res = await fetch(`${medusaUrl}/admin/inventory-items?sku=${encodeURIComponent(sku)}`, {
      headers,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível buscar inventory item.")
    }
    const json = await res.json()
    return json?.inventory_items?.[0] as InventoryItem | undefined
  }

  const getInventoryLevelQuantity = async (inventoryItemId: string, locationId: string) => {
    const res = await fetch(
      `${medusaUrl}/admin/inventory-items/${inventoryItemId}/location-levels?location_id=${encodeURIComponent(
        locationId
      )}`,
      { headers }
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível buscar nível de estoque.")
    }
    const json = await res.json()
    return (json?.inventory_levels?.[0]?.stocked_quantity as number | undefined) ?? 0
  }

  const ensureInventoryLevel = async (
    inventoryItemId: string,
    locationId: string,
    quantity: number
  ) => {
    const updateRes = await fetch(
      `${medusaUrl}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ stocked_quantity: quantity }),
      }
    )
    if (updateRes.ok) return

    const createRes = await fetch(
      `${medusaUrl}/admin/inventory-items/${inventoryItemId}/location-levels`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ location_id: locationId, stocked_quantity: quantity }),
      }
    )
    if (!createRes.ok) {
      const body = await createRes.text()
      throw new Error(body || "Não foi possível atualizar nível de estoque.")
    }
  }

  const createInventoryItem = async (sku: string, title: string, locationId: string, quantity: number) => {
    const res = await fetch(`${medusaUrl}/admin/inventory-items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku,
        title,
        location_levels: [
          {
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível criar inventory item.")
    }
    const json = await res.json()
    return json?.inventory_item?.id as string | undefined
  }

  const updateInventoryItemTitle = async (inventoryItemId: string, title: string) => {
    const res = await fetch(`${medusaUrl}/admin/inventory-items/${inventoryItemId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível atualizar o título do estoque.")
    }
  }

  const loadInventory = async () => {
    setInventoryLoading(true)
    setInventoryError(null)
    try {
      const res = await fetch(`${medusaUrl}/admin/inventory-items?limit=200`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível carregar estoque.")
      }
      const json = await res.json()
      setInventoryItems(json?.inventory_items || [])
    } catch (err: any) {
      setInventoryError(err?.message || "Erro ao carregar estoque.")
    } finally {
      setInventoryLoading(false)
    }
  }

  const runAction = async (
    action: () => Promise<void>,
    successMessage: string,
    onSuccess?: () => void
  ) => {
    setActionError(null)
    setActionSuccess(null)
    setActionLoading(true)
    try {
      await action()
      setActionSuccess(successMessage)
      await loadInventory()
      onSuccess?.()
    } catch (err: any) {
      setActionError(err?.message || "Erro ao atualizar estoque.")
    } finally {
      setActionLoading(false)
    }
  }

  const addStock = async (sku: string, locationId: string, quantity: number) => {
    const option = variantOptions.find((item) => item.sku === sku)
    if (!option) {
      throw new Error("SKU inválido.")
    }
    const existingItem = await getInventoryItemBySku(sku)
    let inventoryItemId = existingItem?.id
    if (!inventoryItemId) {
      await createInventoryItem(sku, option.title, locationId, quantity)
      return
    }
    const normalizedTitle = (existingItem?.title || "").trim()
    if (!normalizedTitle || normalizedTitle.toLowerCase() === "padrão") {
      const desiredTitle = productTitleBySku.get(sku)
      if (desiredTitle) {
        await updateInventoryItemTitle(inventoryItemId, desiredTitle)
      }
    }
    const current = await getInventoryLevelQuantity(inventoryItemId, locationId)
    await ensureInventoryLevel(inventoryItemId, locationId, current + quantity)
  }

  const removeStock = async (sku: string, locationId: string, quantity: number) => {
    const inventoryItemId = (await getInventoryItemBySku(sku))?.id
    if (!inventoryItemId) {
      throw new Error("Inventory item não encontrado para este SKU.")
    }
    const current = await getInventoryLevelQuantity(inventoryItemId, locationId)
    if (current < quantity) {
      throw new Error("Quantidade insuficiente no estoque selecionado.")
    }
    await ensureInventoryLevel(inventoryItemId, locationId, current - quantity)
  }

  const transferStock = async (
    sku: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => {
    if (fromLocationId === toLocationId) {
      throw new Error("Selecione locais diferentes para transferência.")
    }
    const inventoryItemId = (await getInventoryItemBySku(sku))?.id
    if (!inventoryItemId) {
      throw new Error("Inventory item não encontrado para este SKU.")
    }
    const fromQty = await getInventoryLevelQuantity(inventoryItemId, fromLocationId)
    const toQty = await getInventoryLevelQuantity(inventoryItemId, toLocationId)
    if (fromQty < quantity) {
      throw new Error("Quantidade insuficiente no estoque de origem.")
    }
    await ensureInventoryLevel(inventoryItemId, fromLocationId, fromQty - quantity)
    await ensureInventoryLevel(inventoryItemId, toLocationId, toQty + quantity)
  }

  const deleteInventoryItem = async (sku: string) => {
    const inventoryItemId = (await getInventoryItemBySku(sku))?.id
    if (!inventoryItemId) {
      throw new Error("Inventory item não encontrado para este SKU.")
    }
    const res = await fetch(`${medusaUrl}/admin/inventory-items/${inventoryItemId}`, {
      method: "DELETE",
      headers,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível remover o item de estoque.")
    }
  }

  const openModal = (
    type: "add" | "remove" | "transfer" | "delete",
    sku: string,
    locationId: string
  ) => {
    setActionError(null)
    setActionSuccess(null)
    setModal({ type, sku, locationId })
    setModalQuantity("")
    setModalToLocationId("")
  }

  const closeModal = () => {
    setModal(null)
  }

  const submitModal = () => {
    if (!modal) return
    const quantity = parseQuantity(modalQuantity)
    if (modal.type !== "delete" && (!modal.sku || !modal.locationId)) {
      setActionError("Selecione o SKU e o local de estoque.")
      return
    }
    if (modal.type === "delete" && !modal.sku) {
      setActionError("Selecione o SKU.")
      return
    }
    if (modal.type !== "delete" && (!quantity || quantity <= 0)) {
      setActionError("Informe uma quantidade válida.")
      return
    }
    if (modal.type === "add") {
      runAction(
        () => addStock(modal.sku, modal.locationId, quantity ?? 0),
        "Estoque adicionado com sucesso.",
        closeModal
      )
      return
    }
    if (modal.type === "remove") {
      runAction(
        () => removeStock(modal.sku, modal.locationId, quantity ?? 0),
        "Estoque removido com sucesso.",
        closeModal
      )
      return
    }
    if (modal.type === "transfer") {
      if (!modalToLocationId) {
        setActionError("Selecione o local de destino.")
        return
      }
      if (modalToLocationId === modal.locationId) {
        setActionError("Selecione um local diferente para o destino.")
        return
      }
      runAction(
        () => transferStock(modal.sku, modal.locationId, modalToLocationId, quantity ?? 0),
        "Transferência concluída.",
        closeModal
      )
      return
    }
    if (modal.type === "delete") {
      runAction(() => deleteInventoryItem(modal.sku), "Item removido do estoque.", closeModal)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Estoque</h1>
        <p className="muted">Adicione, remova ou transfira quantidades entre locais.</p>
      </header>

      {actionError && <div className="panel muted">Erro: {actionError}</div>}
      {actionSuccess && <div className="panel muted">{actionSuccess}</div>}

      {modal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3>
                  {modal.type === "add" && "Adicionar estoque"}
                  {modal.type === "remove" && "Remover estoque"}
                  {modal.type === "transfer" && "Transferir estoque"}
                  {modal.type === "delete" && "Remover produto do estoque"}
                </h3>
                {(modal.sku || modal.locationId) && (
                  <p className="muted" style={{ marginTop: "0.25rem" }}>
                    {modal.sku ? `SKU: ${modal.sku}` : "SKU: selecione"}{" "}
                    {modal.type !== "delete" && (
                      <>
                        • Local:{" "}
                        {modal.locationId
                          ? locationNameById.get(modal.locationId) || modal.locationId
                          : "selecione"}
                      </>
                    )}
                  </p>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={closeModal}>
                Fechar
              </button>
            </div>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">SKU</span>
              <select
                className="field-input"
                value={modal.sku}
                onChange={(e) => updateModal({ sku: e.target.value })}
              >
                <option value="">Selecionar</option>
                {variantOptions.map((option) => (
                  <option key={option.sku} value={option.sku}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {modal.type !== "delete" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">{modal.type === "transfer" ? "Origem" : "Local"}</span>
                <select
                  className="field-input"
                  value={modal.locationId}
                  onChange={(e) => updateModal({ locationId: e.target.value })}
                >
                  <option value="">Selecionar</option>
                  {stockLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name || location.id}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {modal.type !== "delete" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Quantidade</span>
                <input
                  type="number"
                  min={0}
                  className="field-input"
                  value={modalQuantity}
                  onChange={(e) => setModalQuantity(e.target.value)}
                />
              </label>
            )}

            {modal.type === "transfer" && (
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Destino</span>
                <select
                  className="field-input"
                  value={modalToLocationId}
                  onChange={(e) => setModalToLocationId(e.target.value)}
                >
                  <option value="">Selecionar</option>
                  {stockLocations
                    .filter((location) => location.id !== modal.locationId)
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name || location.id}
                      </option>
                    ))}
                </select>
              </label>
            )}

            {modal.type === "delete" && (
              <p className="muted">
                Essa ação remove o item de estoque e seus níveis. Não afeta o produto,
                mas o SKU não terá mais saldo.
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn" type="button" disabled={actionLoading} onClick={submitModal}>
                {actionLoading ? "Salvando..." : "Confirmar"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel" style={{ marginTop: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3>Estoque atual</h3>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              Quantidade por local de estoque.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              className="field-input"
              placeholder="Filtrar por SKU, produto ou local"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              style={{ minWidth: "240px" }}
            />
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              title="Adicionar estoque"
              aria-label="Adicionar estoque"
              onClick={() => openModal("add", "", "")}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={loadInventory}
              title="Atualizar"
              aria-label="Atualizar"
            >
              {inventoryLoading ? "…" : <FontAwesomeIcon icon={faArrowsRotate} />}
            </button>
          </div>
        </div>

        {inventoryError && <div className="muted">Erro: {inventoryError}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Local</th>
                <th>Disponível</th>
                <th>Reservado</th>
                <th>Quantidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Carregando...
                  </td>
                </tr>
              ) : stockRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Nenhum SKU encontrado.
                  </td>
                </tr>
              ) : (
                stockRows.map((row) => (
                  <tr key={`${row.sku}-${row.locationId}`}>
                    <td>{row.productTitle}</td>
                    <td>{row.sku || "—"}</td>
                    <td>{row.locationName}</td>
                    <td>{row.available ?? "—"}</td>
                    <td>{row.reserved ?? "—"}</td>
                    <td>{row.stocked}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button
                          className="btn btn-sm"
                          type="button"
                          disabled={!row.sku}
                          onClick={() => openModal("add", row.sku, row.locationId)}
                          title="Adicionar"
                          aria-label="Adicionar"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={!row.sku}
                          onClick={() => openModal("remove", row.sku, row.locationId)}
                          title="Remover"
                          aria-label="Remover"
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={!row.sku}
                          onClick={() => openModal("transfer", row.sku, row.locationId)}
                          title="Transferir"
                          aria-label="Transferir"
                        >
                          <FontAwesomeIcon icon={faRightLeft} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={!row.sku}
                          onClick={() => openModal("delete", row.sku, row.locationId)}
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
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
