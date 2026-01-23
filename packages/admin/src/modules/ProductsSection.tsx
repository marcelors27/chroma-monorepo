import { FormEvent, Fragment, useEffect, useMemo, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBroom,
  faChevronDown,
  faChevronRight,
  faFloppyDisk,
  faPen,
  faPlus,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons"
import type { Dispatch, SetStateAction } from "react"

import { MediaPayload, Product, SalesChannel, StockLocation } from "../types"
import { formatMoney } from "../utils/format"

type VariantLocation = { id: string; name: string; stocked?: number | null }

type ProductsSectionProps = {
  medusaUrl: string
  token: string | null
  headers: Record<string, string>
  products: Product[]
  setProducts: Dispatch<SetStateAction<Product[]>>
  salesChannels: SalesChannel[]
  stockLocations: StockLocation[]
  openOrders: number
}

export default function ProductsSection({
  medusaUrl,
  token,
  headers,
  products,
  setProducts,
  salesChannels,
  stockLocations,
  openOrders,
}: ProductsSectionProps) {
  const [productError, setProductError] = useState<string | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productEditError, setProductEditError] = useState<string | null>(null)
  const [productEditSaving, setProductEditSaving] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productImageUploading, setProductImageUploading] = useState(false)
  const [productImageUploadError, setProductImageUploadError] = useState<string | null>(null)
  const [productMediaUploading, setProductMediaUploading] = useState(false)
  const [productMediaUploadError, setProductMediaUploadError] = useState<string | null>(null)
  const [productEditMediaUploading, setProductEditMediaUploading] = useState(false)
  const [productEditMediaUploadError, setProductEditMediaUploadError] = useState<string | null>(
    null
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [variantLocations, setVariantLocations] = useState<Record<string, VariantLocation[]>>({})
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    currency_code: "brl",
    thumbnail: "",
    image_url: "",
    media_images: "",
    media_videos: "",
    media_youtube: "",
    sales_channel_id: "",
    manage_inventory: false,
    stock_location_id: "",
    stock_quantity: "",
  })
  const [productOptions, setProductOptions] = useState<
    { id: string; title: string; values: string }[]
  >([])
  const [productVariants, setProductVariants] = useState<
    {
      id: string
      title: string
      sku: string
      price: string
      image_url: string
      optionValues: Record<string, string>
      stock_quantity: string
    }[]
  >([
    {
      id: `${Date.now()}-variant`,
      title: "",
      sku: "",
      price: "",
      image_url: "",
      optionValues: {},
      stock_quantity: "",
    },
  ])
  const [productEditForm, setProductEditForm] = useState({
    media_images: "",
    media_videos: "",
    media_youtube: "",
  })

  const totalInventory = useMemo(() => {
    return products.reduce((acc, p) => {
      const inv = p.variants?.[0]?.inventory_quantity ?? 0
      return acc + inv
    }, 0)
  }, [products])

  useEffect(() => {
    products.forEach((product) => {
      const variants = product.variants || []
      const hasStockData = variants.some(
        (item) => item.inventory_quantity !== undefined && item.inventory_quantity !== null
      )
      const totalStock = variants.reduce(
        (acc, item) => acc + (item.inventory_quantity ?? 0),
        0
      )
      if (hasStockData && totalStock === 0) {
        openProductExpanded(product)
      }
    })
  }, [products])

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const openProductExpanded = (product: Product) => {
    setExpandedProducts((prev) => {
      if (prev.has(product.id)) return prev
      const next = new Set(prev)
      next.add(product.id)
      return next
    })
    ;(product.variants || []).forEach((variant) => {
      if (variant?.id) {
        loadVariantLocations(variant.id)
      }
    })
  }

  const loadVariantLocations = async (variantId: string) => {
    if (variantLocations[variantId]) return
    try {
      const res = await fetch(
        `${medusaUrl}/admin/products/variants/${variantId}?fields=%2Binventory_items.location_levels.location_id,%2Binventory_items.location_levels.stocked_quantity`,
        { headers }
      )
      if (!res.ok) {
        return
      }
      const json = await res.json()
      const inventoryItems = json?.variant?.inventory_items || json?.variant?.inventory_items || []
      const locations: VariantLocation[] = []
      inventoryItems.forEach((item: any) => {
        const levels = item?.location_levels || []
        levels.forEach((level: any) => {
          const locationId = level?.location_id
          if (!locationId) return
          const locationName =
            stockLocations.find((location) => location.id === locationId)?.name || locationId
          locations.push({
            id: locationId,
            name: locationName,
            stocked: level?.stocked_quantity ?? null,
          })
        })
      })
      setVariantLocations((prev) => ({ ...prev, [variantId]: locations }))
    } catch {
      // ignore
    }
  }

  const handleProductChange = (field: keyof typeof productForm, value: string | boolean) => {
    setProductForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetProductForm = () => {
    setProductForm({
      title: "",
      description: "",
      price: "",
      currency_code: "brl",
      thumbnail: "",
      image_url: "",
      media_images: "",
      media_videos: "",
      media_youtube: "",
      sales_channel_id: "",
      manage_inventory: false,
      stock_location_id: "",
      stock_quantity: "",
    })
    setProductOptions([])
    setProductVariants([
      {
        id: `${Date.now()}-variant`,
        title: "",
        sku: "",
        price: "",
        image_url: "",
        optionValues: {},
        stock_quantity: "",
      },
    ])
    setProductImageUploadError(null)
    setProductMediaUploadError(null)
  }

  const toAmount = (value: string) => {
    const normalized = value.replace(",", ".")
    const parsed = Number(normalized)
    if (Number.isNaN(parsed)) return null
    return Math.round(parsed * 100)
  }

  const createSkuFromTitle = (title: string) => {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 32)
    const suffix = Math.random().toString(36).slice(2, 6)
    return `${base || "produto"}-${suffix}`
  }

  const parseMediaList = (value: string) => {
    return value
      .split(/\\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const parseOptionValues = (value: string) => {
    return value
      .split(/\\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const addProductOption = () => {
    setProductOptions((prev) => [
      ...prev,
      { id: `${Date.now()}-opt-${Math.random().toString(36).slice(2, 6)}`, title: "", values: "" },
    ])
  }

  const updateProductOption = (
    optionId: string,
    field: "title" | "values",
    value: string
  ) => {
    setProductOptions((prev) =>
      prev.map((option) => (option.id === optionId ? { ...option, [field]: value } : option))
    )
  }

  const removeProductOption = (optionId: string) => {
    setProductOptions((prev) => prev.filter((option) => option.id !== optionId))
    setProductVariants((prev) =>
      prev.map((variant) => {
        const nextValues = { ...variant.optionValues }
        delete nextValues[optionId]
        return { ...variant, optionValues: nextValues }
      })
    )
  }

  const addProductVariant = () => {
    setProductVariants((prev) => [
      ...prev,
      {
        id: `${Date.now()}-variant-${Math.random().toString(36).slice(2, 6)}`,
        title: "",
        sku: "",
        price: "",
        image_url: "",
        optionValues: {},
        stock_quantity: "",
      },
    ])
  }

  const updateProductVariant = (
    variantId: string,
    field: "title" | "sku" | "price" | "image_url" | "stock_quantity",
    value: string
  ) => {
    setProductVariants((prev) =>
      prev.map((variant) => (variant.id === variantId ? { ...variant, [field]: value } : variant))
    )
  }

  const updateVariantOptionValue = (
    variantId: string,
    optionId: string,
    value: string
  ) => {
    setProductVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? { ...variant, optionValues: { ...variant.optionValues, [optionId]: value } }
          : variant
      )
    )
  }

  const removeProductVariant = (variantId: string) => {
    setProductVariants((prev) => prev.filter((variant) => variant.id !== variantId))
  }

  const appendMediaUrls = (currentValue: string, urls: string[]) => {
    const merged = [...parseMediaList(currentValue), ...urls]
    return merged.join("\\n")
  }

  const toYoutubeEmbed = (url: string) => {
    const match =
      url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/i) ||
      []
    const id = match[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }

  const validateMedia = (media: MediaPayload) => {
    const invalidImages = media.images.filter((url) => !/^https?:\/\//i.test(url))
    const invalidVideos = media.videos.filter((url) => !/^https?:\/\//i.test(url))
    const invalidYoutube = media.youtube.filter((url) => !toYoutubeEmbed(url))
    if (invalidImages.length) return "Existem URLs de imagem inválidas."
    if (invalidVideos.length) return "Existem URLs de vídeo inválidas."
    if (invalidYoutube.length) return "Existem links do YouTube inválidos."
    return null
  }

  const uploadProductMedia = async (
    files: FileList | null,
    mediaType: "images" | "videos",
    target: "create" | "edit"
  ) => {
    if (!files?.length) return
    if (!token) {
      const message = "Faça login para enviar arquivos."
      if (target === "edit") {
        setProductEditMediaUploadError(message)
      } else {
        setProductMediaUploadError(message)
      }
      return
    }

    const fileArray = Array.from(files)
    const isValidType = (file: File) =>
      mediaType === "images" ? file.type.startsWith("image/") : file.type.startsWith("video/")
    const invalid = fileArray.filter((file) => !isValidType(file))
    if (invalid.length) {
      const message =
        mediaType === "images"
          ? "Envie apenas arquivos de imagem."
          : "Envie apenas arquivos de vídeo."
      if (target === "edit") {
        setProductEditMediaUploadError(message)
      } else {
        setProductMediaUploadError(message)
      }
      return
    }

    if (target === "edit") {
      setProductEditMediaUploading(true)
      setProductEditMediaUploadError(null)
    } else {
      setProductMediaUploading(true)
      setProductMediaUploadError(null)
    }

    try {
      const formData = new FormData()
      fileArray.forEach((file) => formData.append("files", file, file.name))
      const res = await fetch(`${medusaUrl}/admin/uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Falha ao enviar arquivos.")
      }
      const json = await res.json()
      const urls = (json?.files || [])
        .map((file: { url?: string }) => file.url)
        .filter(Boolean) as string[]
      if (!urls.length) {
        throw new Error("Upload concluido, mas sem URLs retornadas.")
      }

      if (target === "edit") {
        updateProductEditField(
          mediaType === "images" ? "media_images" : "media_videos",
          appendMediaUrls(
            mediaType === "images" ? productEditForm.media_images : productEditForm.media_videos,
            urls
          )
        )
      } else {
        handleProductChange(
          mediaType === "images" ? "media_images" : "media_videos",
          appendMediaUrls(
            mediaType === "images" ? productForm.media_images : productForm.media_videos,
            urls
          )
        )
      }
    } catch (err: any) {
      const message = err?.message || "Erro ao enviar arquivos."
      if (target === "edit") {
        setProductEditMediaUploadError(message)
      } else {
        setProductMediaUploadError(message)
      }
    } finally {
      if (target === "edit") {
        setProductEditMediaUploading(false)
      } else {
        setProductMediaUploading(false)
      }
    }
  }

  const uploadProductSingleImage = async (
    files: FileList | null,
    targetField: "thumbnail" | "image_url"
  ) => {
    if (!files?.length) return
    if (!token) {
      setProductImageUploadError("Faça login para enviar arquivos.")
      return
    }

    const file = files[0]
    if (!file.type.startsWith("image/")) {
      setProductImageUploadError("Envie apenas arquivos de imagem.")
      return
    }

    setProductImageUploading(true)
    setProductImageUploadError(null)

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
        throw new Error(body || "Falha ao enviar a imagem.")
      }
      const json = await res.json()
      const url = (json?.files || [])[0]?.url as string | undefined
      if (!url) {
        throw new Error("Upload concluido, mas sem URL retornada.")
      }
      handleProductChange(targetField, url)
    } catch (err: any) {
      setProductImageUploadError(err?.message || "Erro ao enviar a imagem.")
    } finally {
      setProductImageUploading(false)
    }
  }

  const uploadVariantImage = async (files: FileList | null, variantId: string) => {
    if (!files?.length) return
    if (!token) {
      setProductImageUploadError("Faça login para enviar arquivos.")
      return
    }

    const file = files[0]
    if (!file.type.startsWith("image/")) {
      setProductImageUploadError("Envie apenas arquivos de imagem.")
      return
    }

    setProductImageUploading(true)
    setProductImageUploadError(null)

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
        throw new Error(body || "Falha ao enviar a imagem.")
      }
      const json = await res.json()
      const url = (json?.files || [])[0]?.url as string | undefined
      if (!url) {
        throw new Error("Upload concluido, mas sem URL retornada.")
      }
      updateProductVariant(variantId, "image_url", url)
    } catch (err: any) {
      setProductImageUploadError(err?.message || "Erro ao enviar a imagem.")
    } finally {
      setProductImageUploading(false)
    }
  }

  const refreshProduct = async (productId: string) => {
    const fields = encodeURIComponent("+variants.inventory_quantity,+variants.prices,+variants.title")
    const res = await fetch(`${medusaUrl}/admin/products/${productId}?fields=${fields}`, {
      headers,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível atualizar o produto.")
    }
    const json = await res.json()
    if (json?.product) {
      setProducts((prev) => prev.map((item) => (item.id === productId ? json.product : item)))
    }
  }

  const findInventoryItemIdBySku = async (sku: string) => {
    const res = await fetch(`${medusaUrl}/admin/inventory-items?sku=${encodeURIComponent(sku)}`, {
      headers,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || "Não foi possível buscar inventory item.")
    }
    const json = await res.json()
    return json?.inventory_items?.[0]?.id as string | undefined
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault()
    if (!productForm.title || !productForm.price) {
      setProductError("Preencha título e preço.")
      return
    }
    if (productForm.manage_inventory) {
      if (!productForm.stock_location_id) {
        setProductError("Informe o local de estoque.")
        return
      }
    }
    const amount = toAmount(productForm.price)
    if (!amount || amount <= 0) {
      setProductError("Preço inválido.")
      return
    }
    setProductSaving(true)
    setProductError(null)
    try {
      const trimmedOptions = productOptions
        .map((option) => ({
          id: option.id,
          title: option.title.trim(),
          values: parseOptionValues(option.values),
        }))
        .filter((option) => option.title && option.values.length)

      if (!trimmedOptions.length && productVariants.length > 1) {
        setProductError("Adicione pelo menos uma opção para múltiplas variações.")
        setProductSaving(false)
        return
      }

      const optionsPayload = trimmedOptions.length
        ? trimmedOptions.map((option) => ({
            id: option.id,
            title: option.title,
            values: Array.from(new Set(option.values)),
          }))
        : [
            {
              id: "default",
              title: "Tipo",
              values: ["Única"],
            },
          ]

      const baseOptionId = optionsPayload[0]?.id
      const baseOptionTitle = optionsPayload[0]?.title || "Tipo"
      const mediaImages = parseMediaList(productForm.media_images)
      const mediaVideos = parseMediaList(productForm.media_videos)
      const mediaYoutube = parseMediaList(productForm.media_youtube)
      const mediaValidation = validateMedia({
        images: mediaImages,
        videos: mediaVideos,
        youtube: mediaYoutube,
      })
      if (mediaValidation) {
        setProductError(mediaValidation)
        setProductSaving(false)
        return
      }

      const buildVariantTitle = (variant: typeof productVariants[number]) => {
        const trimmedTitle = variant.title.trim()
        if (trimmedTitle) return trimmedTitle
        if (optionsPayload.length && baseOptionId) {
          const chosenValues = optionsPayload.map((option) => {
            const raw = variant.optionValues[option.id]
            return raw || option.values[0]
          })
          const joined = chosenValues.filter(Boolean).join(" / ")
          return joined || "Única"
        }
        return "Única"
      }

      const buildVariantSku = (variant: typeof productVariants[number]) => {
        const trimmedSku = variant.sku.trim()
        if (trimmedSku) return trimmedSku
        if (!productForm.manage_inventory) return null
        const base = buildVariantTitle(variant)
        return createSkuFromTitle(`${productForm.title} ${base}`)
      }

      const buildVariantPrice = (variant: typeof productVariants[number]) => {
        if (variant.price) return toAmount(variant.price)
        return amount
      }

      const variantsPayload = productVariants.map((variant) => {
        const variantPrice = buildVariantPrice(variant)
        if (!variantPrice || variantPrice <= 0) {
          throw new Error("Preço inválido em uma das variações.")
        }

        const optionValues: Record<string, string> = {}
        optionsPayload.forEach((option) => {
          const chosen = variant.optionValues[option.id] || option.values[0]
          if (!chosen) {
            throw new Error("Selecione os valores das opções nas variações.")
          }
          optionValues[option.title] = chosen
          if (!option.values.includes(chosen)) {
            option.values.push(chosen)
          }
        })

        return {
          title: buildVariantTitle(variant),
          sku: buildVariantSku(variant),
          allow_backorder: !productForm.manage_inventory,
          manage_inventory: productForm.manage_inventory,
          options: optionValues,
          metadata: variant.image_url ? { image: variant.image_url } : undefined,
          prices: [{ currency_code: productForm.currency_code, amount: variantPrice }],
        }
      })

      if (productForm.manage_inventory) {
        const hasInvalidQuantity = productVariants.some((variant) => {
          const quantity = Number(variant.stock_quantity)
          return Number.isNaN(quantity) || quantity < 0
        })
        if (hasInvalidQuantity) {
          setProductError("Quantidade de estoque inválida nas variações.")
          setProductSaving(false)
          return
        }
      }

      const payload: Record<string, any> = {
        title: productForm.title,
        description: productForm.description || null,
        status: "published",
        thumbnail: productForm.thumbnail || null,
        images: productForm.image_url ? [{ url: productForm.image_url }] : undefined,
        options: optionsPayload.map(({ title, values }) => ({
          title,
          values,
        })),
        metadata:
          mediaImages.length || mediaVideos.length || mediaYoutube.length
            ? {
                media: {
                  images: mediaImages,
                  videos: mediaVideos,
                  youtube: mediaYoutube,
                },
              }
            : undefined,
        variants: variantsPayload,
      }
      if (productForm.sales_channel_id) {
        payload.sales_channels = [{ id: productForm.sales_channel_id }]
      }
      const res = await fetch(`${medusaUrl}/admin/products`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível criar o produto")
      }
      const json = await res.json()
      if (json?.product) {
        setProducts((prev) => [json.product, ...prev])
      }

      if (json?.product?.id) {
        if (productForm.manage_inventory && productForm.stock_location_id) {
          const variantIdBySku = new Map<string, string>()
          json.product.variants?.forEach((variant: { id?: string; sku?: string }) => {
            if (variant?.id && variant?.sku) {
              variantIdBySku.set(variant.sku, variant.id)
            }
          })

          for (const variant of productVariants) {
            const sku = buildVariantSku(variant)
            const quantity = Number(variant.stock_quantity)
            if (!sku) continue
            const variantId = variantIdBySku.get(sku)
            if (!variantId) continue

            let inventoryItemId = await findInventoryItemIdBySku(sku)
            if (!inventoryItemId) {
              const inventoryRes = await fetch(`${medusaUrl}/admin/inventory-items`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  sku,
                  title: productForm.title,
                  location_levels: [
                    {
                      location_id: productForm.stock_location_id,
                      stocked_quantity: quantity,
                    },
                  ],
                }),
              })
              if (!inventoryRes.ok) {
                const body = await inventoryRes.text()
                throw new Error(body || "Produto criado, mas falhou ao criar estoque.")
              }
              const inventoryJson = await inventoryRes.json()
              inventoryItemId = inventoryJson?.inventory_item?.id
            } else {
              const levelRes = await fetch(
                `${medusaUrl}/admin/inventory-items/${inventoryItemId}/location-levels`,
                {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    location_id: productForm.stock_location_id,
                    stocked_quantity: quantity,
                  }),
                }
              )
              if (!levelRes.ok) {
                const body = await levelRes.text()
                if (!body?.includes("already exists")) {
                  throw new Error(body || "Produto criado, mas falhou ao atualizar estoque.")
                }
                const updateRes = await fetch(
                  `${medusaUrl}/admin/inventory-items/${inventoryItemId}/location-levels/${productForm.stock_location_id}`,
                  {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      stocked_quantity: quantity,
                    }),
                  }
                )
                if (!updateRes.ok) {
                  const updateBody = await updateRes.text()
                  throw new Error(updateBody || "Produto criado, mas falhou ao atualizar estoque.")
                }
              }
            }
            if (inventoryItemId) {
              const linkRes = await fetch(
                `${medusaUrl}/admin/products/${json.product.id}/variants/${variantId}/inventory-items`,
                {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    inventory_item_id: inventoryItemId,
                    required_quantity: 1,
                  }),
                }
              )
              if (!linkRes.ok) {
                const body = await linkRes.text()
                throw new Error(body || "Produto criado, mas falhou ao vincular o estoque.")
              }
            }
          }
          await refreshProduct(json.product.id)
        }
      }

      resetProductForm()
      setShowCreateModal(false)
    } catch (err: any) {
      setProductError(err?.message || "Erro ao criar produto")
    } finally {
      setProductSaving(false)
    }
  }

  const formatMediaValue = (value?: string[] | null) => {
    if (!value?.length) return ""
    return value.join("\\n")
  }

  const startEditProductMedia = (product: Product) => {
    const metadata = product.metadata as Record<string, unknown> | undefined
    const media = (metadata?.media || {}) as Record<string, unknown>
    setEditingProductId(product.id)
    setProductEditMediaUploadError(null)
    setProductEditForm({
      media_images: formatMediaValue(media.images as string[] | undefined),
      media_videos: formatMediaValue(media.videos as string[] | undefined),
      media_youtube: formatMediaValue(media.youtube as string[] | undefined),
    })
  }

  const cancelEditProductMedia = () => {
    setEditingProductId(null)
    setProductEditError(null)
    setProductEditMediaUploadError(null)
  }

  const updateProductEditField = (
    field: keyof typeof productEditForm,
    value: string
  ) => {
    setProductEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveProductMedia = async (product: Product) => {
    const mediaImages = parseMediaList(productEditForm.media_images)
    const mediaVideos = parseMediaList(productEditForm.media_videos)
    const mediaYoutube = parseMediaList(productEditForm.media_youtube)
    const mediaValidation = validateMedia({
      images: mediaImages,
      videos: mediaVideos,
      youtube: mediaYoutube,
    })
    if (mediaValidation) {
      setProductEditError(mediaValidation)
      return
    }
    setProductEditSaving(true)
    setProductEditError(null)
    try {
      const payload = {
        metadata: {
          ...(product.metadata || {}),
          media: {
            images: mediaImages,
            videos: mediaVideos,
            youtube: mediaYoutube,
          },
        },
      }
      const res = await fetch(`${medusaUrl}/admin/products/${product.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível atualizar a mídia")
      }
      const json = await res.json()
      if (json?.product) {
        setProducts((prev) => prev.map((item) => (item.id === product.id ? json.product : item)))
      }
      setEditingProductId(null)
    } catch (err: any) {
      setProductEditError(err?.message || "Erro ao atualizar mídia")
    } finally {
      setProductEditSaving(false)
    }
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Produtos</h1>
        <p className="muted">Acompanhe catálogo, estoque e preços médios.</p>
      </header>

      {productError && <div className="panel muted">Erro: {productError}</div>}

      {showCreateModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: "1120px" }}>
            <div className="modal-header">
              <div>
                <h3>Adicionar produto</h3>
                <p className="muted" style={{ marginTop: "0.25rem" }}>
                  Cadastre os dados, variações e estoque inicial.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm btn-icon"
                type="button"
                onClick={() => setShowCreateModal(false)}
                title="Fechar"
                aria-label="Fechar"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form className="grid" onSubmit={createProduct} style={{ gap: "0.85rem" }}>
          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Título</span>
            <input
              value={productForm.title}
              onChange={(e) => handleProductChange("title", e.target.value)}
              required
              className="field-input"
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Descrição</span>
            <textarea
              value={productForm.description}
              onChange={(e) => handleProductChange("description", e.target.value)}
              rows={3}
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
              <span className="muted">Preço (R$)</span>
              <input
                type="number"
                value={productForm.price}
                onChange={(e) => handleProductChange("price", e.target.value)}
                min={0}
                step="0.01"
                required
                className="field-input"
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Moeda</span>
              <input
                value={productForm.currency_code}
                onChange={(e) => handleProductChange("currency_code", e.target.value)}
                className="field-input"
                disabled
              />
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Sales Channel (opcional)</span>
              <select
                value={productForm.sales_channel_id}
                onChange={(e) => handleProductChange("sales_channel_id", e.target.value)}
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

          <div className="panel grid" style={{ gap: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h4>Opções de variação</h4>
                <p className="muted" style={{ marginTop: "0.25rem" }}>
                  Ex: Tamanho (P, M, G) ou Cor (Preto, Branco).
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm btn-icon"
                type="button"
                onClick={addProductOption}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            {productOptions.length === 0 ? (
              <p className="muted">Sem opções. O produto terá apenas uma variação.</p>
            ) : (
              productOptions.map((option) => (
                <div
                  key={option.id}
                  className="grid"
                  style={{
                    gap: "0.75rem",
                    gridTemplateColumns: "minmax(160px, 1fr) minmax(220px, 2fr) auto",
                    alignItems: "end",
                  }}
                >
                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Nome</span>
                    <input
                      value={option.title}
                      onChange={(e) => updateProductOption(option.id, "title", e.target.value)}
                      className="field-input"
                      placeholder="Ex: Tamanho"
                    />
                  </label>
                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Valores (separe por vírgula)</span>
                    <input
                      value={option.values}
                      onChange={(e) => updateProductOption(option.id, "values", e.target.value)}
                      className="field-input"
                      placeholder="Ex: P, M, G"
                    />
                  </label>
                  <button
                    className="btn btn-secondary btn-sm btn-icon"
                    type="button"
                    onClick={() => removeProductOption(option.id)}
                    title="Remover opção"
                    aria-label="Remover opção"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="panel grid" style={{ gap: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h4>Variações</h4>
                <p className="muted" style={{ marginTop: "0.25rem" }}>
                  Cadastre SKU, preço e opções por variação.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm btn-icon"
                type="button"
                onClick={addProductVariant}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            {productVariants.map((variant, index) => {
              const optionValues = productOptions.map((option) => ({
                id: option.id,
                title: option.title,
                values: parseOptionValues(option.values),
              }))
              return (
                <div
                  key={variant.id}
                  className="grid"
                  style={{
                    gap: "0.75rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    alignItems: "end",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "0.75rem",
                  }}
                >
                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Título</span>
                    <input
                      value={variant.title}
                      onChange={(e) => updateProductVariant(variant.id, "title", e.target.value)}
                      className="field-input"
                      placeholder={`Variação ${index + 1}`}
                    />
                  </label>
                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">SKU</span>
                    <input
                      value={variant.sku}
                      onChange={(e) => updateProductVariant(variant.id, "sku", e.target.value)}
                      className="field-input"
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Preço (R$)</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => updateProductVariant(variant.id, "price", e.target.value)}
                      className="field-input"
                      placeholder="Usa o preço base se vazio"
                    />
                  </label>

                  <label className="grid" style={{ gap: "0.35rem" }}>
                    <span className="muted">Imagem da variação (URL)</span>
                    <input
                      value={variant.image_url}
                      onChange={(e) => updateProductVariant(variant.id, "image_url", e.target.value)}
                      className="field-input"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      className="field-input"
                      disabled={productImageUploading}
                      onChange={(e) => {
                        const input = e.target
                        uploadVariantImage(input.files, variant.id)
                        input.value = ""
                      }}
                    />
                  </label>

                  {optionValues.map((option) => (
                    <label key={option.id} className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">{option.title || "Opção"}</span>
                      <select
                        className="field-input"
                        value={variant.optionValues[option.id] || ""}
                        onChange={(e) =>
                          updateVariantOptionValue(variant.id, option.id, e.target.value)
                        }
                      >
                        <option value="">Selecionar</option>
                        {option.values.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}

                  {productForm.manage_inventory && (
                    <label className="grid" style={{ gap: "0.35rem" }}>
                      <span className="muted">Quantidade inicial</span>
                      <input
                        type="number"
                        min={0}
                        value={variant.stock_quantity}
                        onChange={(e) =>
                          updateProductVariant(variant.id, "stock_quantity", e.target.value)
                        }
                        className="field-input"
                      />
                    </label>
                  )}

                  <button
                    className="btn btn-secondary btn-sm btn-icon"
                    type="button"
                    onClick={() => removeProductVariant(variant.id)}
                    disabled={productVariants.length === 1}
                    title="Remover variação"
                    aria-label="Remover variação"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )
            })}
          </div>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Thumbnail (URL)</span>
            <input
              value={productForm.thumbnail}
              onChange={(e) => handleProductChange("thumbnail", e.target.value)}
              className="field-input"
            />
            <input
              type="file"
              accept="image/*"
              className="field-input"
              disabled={productImageUploading}
              onChange={(e) => {
                const input = e.target
                uploadProductSingleImage(input.files, "thumbnail")
                input.value = ""
              }}
            />
          </label>

          <label className="grid" style={{ gap: "0.35rem" }}>
            <span className="muted">Imagem principal (URL)</span>
            <input
              value={productForm.image_url}
              onChange={(e) => handleProductChange("image_url", e.target.value)}
              className="field-input"
            />
            <input
              type="file"
              accept="image/*"
              className="field-input"
              disabled={productImageUploading}
              onChange={(e) => {
                const input = e.target
                uploadProductSingleImage(input.files, "image_url")
                input.value = ""
              }}
            />
          </label>

          <div className="grid" style={{ gap: "0.75rem" }}>
            {productImageUploading && <span className="muted">Enviando imagem...</span>}
            {productImageUploadError && (
              <span className="muted">Erro no upload: {productImageUploadError}</span>
            )}
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Imagens adicionais (URLs, uma por linha)</span>
              <textarea
                value={productForm.media_images}
                onChange={(e) => handleProductChange("media_images", e.target.value)}
                rows={3}
                className="field-input"
              />
              <input
                type="file"
                accept="image/*"
                multiple
                className="field-input"
                disabled={productMediaUploading}
                onChange={(e) => uploadProductMedia(e.target.files, "images", "create")}
              />
              {productMediaUploading && <span className="muted">Enviando imagens...</span>}
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Videos (URLs MP4, uma por linha)</span>
              <textarea
                value={productForm.media_videos}
                onChange={(e) => handleProductChange("media_videos", e.target.value)}
                rows={3}
                className="field-input"
              />
              <input
                type="file"
                accept="video/*"
                multiple
                className="field-input"
                disabled={productMediaUploading}
                onChange={(e) => uploadProductMedia(e.target.files, "videos", "create")}
              />
              {productMediaUploading && <span className="muted">Enviando videos...</span>}
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Links do YouTube (um por linha)</span>
              <textarea
                value={productForm.media_youtube}
                onChange={(e) => handleProductChange("media_youtube", e.target.value)}
                rows={3}
                className="field-input"
              />
            </label>
          </div>
          {productMediaUploadError && (
            <div className="muted">Erro no upload: {productMediaUploadError}</div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={productForm.manage_inventory}
              onChange={(e) => handleProductChange("manage_inventory", e.target.checked)}
              className="checkbox"
            />
            <span className="muted">Gerenciar estoque</span>
          </label>

          {productForm.manage_inventory && (
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <label className="grid" style={{ gap: "0.35rem" }}>
                <span className="muted">Local de estoque</span>
                <select
                  value={productForm.stock_location_id}
                  onChange={(e) => handleProductChange("stock_location_id", e.target.value)}
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
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-icon"
              type="submit"
              disabled={productSaving}
              title={productSaving ? "Criando..." : "Adicionar produto"}
              aria-label={productSaving ? "Criando..." : "Adicionar produto"}
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
            </button>
            <button
              className="btn btn-secondary btn-icon"
              type="button"
              onClick={resetProductForm}
              title="Limpar"
              aria-label="Limpar"
            >
              <FontAwesomeIcon icon={faBroom} />
            </button>
          </div>
            </form>
          </div>
        </div>
      )}

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Produtos</span>
          <strong style={{ fontSize: "1.6rem" }}>{products.length}</strong>
          <span className="muted">Em catálogo</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Estoque total</span>
          <strong style={{ fontSize: "1.6rem" }}>{totalInventory}</strong>
          <span className="muted">Unidades disponíveis</span>
        </div>
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Pedidos abertos</span>
          <strong style={{ fontSize: "1.6rem" }}>{openOrders}</strong>
          <span className="muted">Acompanhe a separação</span>
        </div>
      </section>

      <section className="panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3>Catálogo recente</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="pill">{products.length} itens</span>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              type="button"
              onClick={() => setShowCreateModal(true)}
              title="Adicionar produto"
              aria-label="Adicionar produto"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
        {productEditError && <div className="muted">Erro: {productEditError}</div>}
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Título</th>
                <th>Estoque</th>
                <th>Preço</th>
                <th>Mídias</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const variant = p.variants?.[0]
                const price = variant?.prices?.[0]
                const variants = p.variants || []
                const totalStock = variants.reduce(
                  (acc, item) => acc + (item.inventory_quantity ?? 0),
                  0
                )
                const hasStockData = variants.some(
                  (item) => item.inventory_quantity !== undefined && item.inventory_quantity !== null
                )
                const isExpanded = expandedProducts.has(p.id)
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm btn-icon"
                          type="button"
                          onClick={() =>
                            isExpanded ? toggleProductExpanded(p.id) : openProductExpanded(p)
                          }
                          title={isExpanded ? "Ocultar variações" : "Ver variações"}
                          aria-label={isExpanded ? "Ocultar variações" : "Ver variações"}
                        >
                          <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                        </button>
                      </td>
                      <td>{p.title}</td>
                      <td>{hasStockData ? totalStock : "—"}</td>
                      <td>{formatMoney(price?.amount, price?.currency_code)}</td>
                      <td>
                        {editingProductId === p.id ? (
                          <div className="grid" style={{ gap: "0.5rem", minWidth: "260px" }}>
                            <textarea
                              value={productEditForm.media_images}
                              onChange={(e) =>
                                updateProductEditField("media_images", e.target.value)
                              }
                              rows={2}
                              placeholder="Imagens (URLs)"
                              className="field-input"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="field-input"
                              disabled={productEditMediaUploading}
                              onChange={(e) => uploadProductMedia(e.target.files, "images", "edit")}
                            />
                            <textarea
                              value={productEditForm.media_videos}
                              onChange={(e) =>
                                updateProductEditField("media_videos", e.target.value)
                              }
                              rows={2}
                              placeholder="Vídeos (URLs MP4)"
                              className="field-input"
                            />
                            <input
                              type="file"
                              accept="video/*"
                              multiple
                              className="field-input"
                              disabled={productEditMediaUploading}
                              onChange={(e) => uploadProductMedia(e.target.files, "videos", "edit")}
                            />
                            <textarea
                              value={productEditForm.media_youtube}
                              onChange={(e) =>
                                updateProductEditField("media_youtube", e.target.value)
                              }
                              rows={2}
                              placeholder="YouTube (links)"
                              className="field-input"
                            />
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                className="btn btn-sm btn-icon"
                                type="button"
                                disabled={productEditSaving}
                                onClick={() => saveProductMedia(p)}
                                title={productEditSaving ? "Salvando..." : "Salvar"}
                                aria-label={productEditSaving ? "Salvando..." : "Salvar"}
                              >
                                <FontAwesomeIcon icon={faFloppyDisk} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm btn-icon"
                                type="button"
                                onClick={cancelEditProductMedia}
                                title="Cancelar"
                                aria-label="Cancelar"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                            {productEditMediaUploading && (
                              <span className="muted">Enviando midia...</span>
                            )}
                            {productEditMediaUploadError && (
                              <span className="muted">
                                Erro no upload: {productEditMediaUploadError}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            type="button"
                            onClick={() => startEditProductMedia(p)}
                            title="Editar mídias"
                            aria-label="Editar mídias"
                          >
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5}>
                          <div className="panel" style={{ marginTop: "0.5rem" }}>
                            <div className="muted" style={{ marginBottom: "0.5rem" }}>
                              Variações e estoque por SKU
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Variação</th>
                                    <th>SKU</th>
                                    <th>Estoque</th>
                                    <th>Preço</th>
                                    <th>Locais</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variants.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} style={{ textAlign: "center" }}>
                                        Nenhuma variação encontrada.
                                      </td>
                                    </tr>
                                  ) : (
                                    variants.map((item, index) => {
                                      const variantId = item.id
                                      const itemPrice = item.prices?.[0]
                                      const locations: VariantLocation[] = variantId
                                        ? variantLocations[variantId] || []
                                        : []
                                      return (
                                        <tr key={variantId ?? `variant-${index}`}>
                                          <td>{item.title || "—"}</td>
                                          <td>{item.sku || "—"}</td>
                                          <td>{item.inventory_quantity ?? "—"}</td>
                                          <td>
                                            {formatMoney(
                                              itemPrice?.amount,
                                              itemPrice?.currency_code
                                            )}
                                          </td>
                                          <td>
                                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                              <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                type="button"
                                                onClick={() => {
                                                  if (variantId) {
                                                    loadVariantLocations(variantId)
                                                  }
                                                }}
                                                title="Carregar locais"
                                                aria-label="Carregar locais"
                                              >
                                                <FontAwesomeIcon icon={faChevronDown} />
                                              </button>
                                              {locations.length ? (
                                                locations.map((location) => (
                                                  <span key={`${item.id}-${location.id}`} className="pill">
                                                    {location.name}: {location.stocked ?? "—"}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="muted">—</span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
