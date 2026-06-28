import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBroom,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faFileImport,
  faFloppyDisk,
  faPen,
  faPlus,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons"
import type { Dispatch, SetStateAction } from "react"

import {
  Manufacturer,
  MediaPayload,
  Product,
  SalesChannel,
  ShippingOption,
  ShippingProfile,
  StockLocation,
} from "../types"
import { formatMoney } from "../utils/format"

type VariantLocation = { id: string; name: string; stocked?: number | null }
const PRODUCT_PAGE_SIZE = 50

type ProductsSectionProps = {
  medusaUrl: string
  token: string | null
  headers: Record<string, string>
  products: Product[]
  productCount: number
  setProducts: Dispatch<SetStateAction<Product[]>>
  setProductsCount: Dispatch<SetStateAction<number>>
  salesChannels: SalesChannel[]
  shippingOptions: ShippingOption[]
  shippingProfiles: ShippingProfile[]
  manufacturers: Manufacturer[]
  stockLocations: StockLocation[]
  openOrders: number
  mode?: "list" | "create" | "edit" | "delete"
  productId?: string
}

export default function ProductsSection({
  medusaUrl,
  token,
  headers,
  products,
  productCount,
  setProducts,
  setProductsCount,
  salesChannels,
  shippingOptions,
  shippingProfiles,
  manufacturers,
  stockLocations,
  openOrders,
  mode = "list",
  productId,
}: ProductsSectionProps) {
  const navigate = useNavigate()
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const isDeleteMode = mode === "delete"
  const activeProduct =
    (isEditMode || isDeleteMode) && productId ? products.find((p) => p.id === productId) : null
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
  const [shippingOptionsFallback, setShippingOptionsFallback] = useState<ShippingOption[]>([])
  const [shippingOptionsLoading, setShippingOptionsLoading] = useState(false)
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)
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
    featured: false,
    stock_location_id: "",
    stock_quantity: "",
    allowed_shipping_option_ids: [] as string[],
    shipping_profile_id: "",
    manufacturer_id: "",
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
    featured: false,
    allowed_shipping_option_ids: [] as string[],
    shipping_profile_id: "",
    manufacturer_id: "",
  })
  const [manufacturerFilter, setManufacturerFilter] = useState("")
  const [productsLoadingMore, setProductsLoadingMore] = useState(false)
  const productsLoadingMoreRef = useRef(false)
  const [catalogImportFile, setCatalogImportFile] = useState<File | null>(null)
  const [catalogImportForm, setCatalogImportForm] = useState({
    shipping_profile_id: "",
    sales_channel_id: "",
    default_price: "0",
  })
  const [catalogImportSaving, setCatalogImportSaving] = useState(false)
  const [catalogImportResult, setCatalogImportResult] = useState<{
    created: number
    updated: number
    skipped: number
    failed: number
  } | null>(null)

  const totalInventory = useMemo(() => {
    return products.reduce((acc, p) => {
      const inv = p.variants?.[0]?.inventory_quantity ?? 0
      return acc + inv
    }, 0)
  }, [products])

  const effectiveShippingOptions = shippingOptions.length ? shippingOptions : shippingOptionsFallback
  const allShippingOptionIds = useMemo(
    () => effectiveShippingOptions.map((option) => option.id).filter(Boolean),
    [effectiveShippingOptions]
  )
  const shippingOptionsByProfile = useMemo(() => {
    const map = new Map<string, ShippingOption[]>()
    effectiveShippingOptions.forEach((option) => {
      const profileId =
        option.shipping_profile?.id || (option as any).shipping_profile_id || "unknown"
      if (profileId === "unknown") return
      if (!map.has(profileId)) map.set(profileId, [])
      map.get(profileId)?.push(option)
    })
    return map
  }, [effectiveShippingOptions])
  const selectedProfileOptions = useMemo(() => {
    if (!productForm.shipping_profile_id) return []
    return shippingOptionsByProfile.get(productForm.shipping_profile_id) || []
  }, [productForm.shipping_profile_id, effectiveShippingOptions, shippingOptionsByProfile])

  useEffect(() => {
    if (!isCreateMode && !editingProductId && !isEditMode) return
    if (shippingOptionsLoading) return
    if (effectiveShippingOptions.length) return
    const load = async () => {
      setShippingOptionsLoading(true)
      setShippingOptionsError(null)
      try {
        const res = await fetch(
          `${medusaUrl}/admin/shipping-options?limit=200&fields=${encodeURIComponent(
            "+name,+shipping_profile.name,+shipping_profile_id,+service_zone.name"
          )}`,
          { headers }
        )
        if (!res.ok) {
          const body = await res.text()
          setShippingOptionsError(body || "Não foi possível carregar as formas de entrega.")
          return
        }
        const json = await res.json()
        setShippingOptionsFallback(json.shipping_options ?? [])
      } catch {
        setShippingOptionsError("Não foi possível carregar as formas de entrega.")
      } finally {
        setShippingOptionsLoading(false)
      }
    }
    load()
  }, [
    isCreateMode,
    isEditMode,
    editingProductId,
    effectiveShippingOptions.length,
    medusaUrl,
    headers,
    shippingOptionsLoading,
  ])

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

  useEffect(() => {
    if (!isCreateMode) return
    if (!allShippingOptionIds.length) return
    setProductForm((prev) => {
      if (prev.allowed_shipping_option_ids?.length) return prev
      return { ...prev, allowed_shipping_option_ids: allShippingOptionIds }
    })
  }, [isCreateMode, allShippingOptionIds])

  useEffect(() => {
    if (!isCreateMode) return
    if (productForm.shipping_profile_id) return
    if (!shippingProfiles.length) return
    setProductForm((prev) => ({
      ...prev,
      shipping_profile_id: shippingProfiles[0]?.id || "",
    }))
  }, [isCreateMode, productForm.shipping_profile_id, shippingProfiles])

  useEffect(() => {
    if (!isCreateMode) return
    if (!productForm.shipping_profile_id) return
    setProductForm((prev) => {
      if (prev.allowed_shipping_option_ids?.length) return prev
      const ids = selectedProfileOptions.map((option) => option.id).filter(Boolean)
      return { ...prev, allowed_shipping_option_ids: ids }
    })
  }, [isCreateMode, productForm.shipping_profile_id, selectedProfileOptions])

  useEffect(() => {
    if (catalogImportForm.shipping_profile_id) return
    if (!shippingProfiles.length) return
    setCatalogImportForm((prev) => ({
      ...prev,
      shipping_profile_id: shippingProfiles[0]?.id || "",
    }))
  }, [catalogImportForm.shipping_profile_id, shippingProfiles])

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

  const toggleShippingOption = (optionId: string) => {
    setProductForm((prev) => {
      const current = prev.allowed_shipping_option_ids || []
      const exists = current.includes(optionId)
      const next = exists ? current.filter((id) => id !== optionId) : [...current, optionId]
      return { ...prev, allowed_shipping_option_ids: next }
    })
  }

  const selectAllShippingOptions = () => {
    const ids = selectedProfileOptions.map((option) => option.id).filter(Boolean)
    setProductForm((prev) => ({ ...prev, allowed_shipping_option_ids: ids }))
  }

  const clearShippingOptions = () => {
    setProductForm((prev) => ({ ...prev, allowed_shipping_option_ids: [] }))
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
      featured: false,
      stock_location_id: "",
      stock_quantity: "",
      allowed_shipping_option_ids: allShippingOptionIds,
      shipping_profile_id: shippingProfiles[0]?.id || "",
      manufacturer_id: "",
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
    const fields = encodeURIComponent(
      "+variants.inventory_quantity,+variants.prices,+variants.title,+metadata,+shipping_profile_id"
    )
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

  const deleteProduct = async (productId: string) => {
    setDeletingProductId(productId)
    try {
      const res = await fetch(`${medusaUrl}/admin/products/${productId}`, {
        method: "DELETE",
        headers,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível excluir o produto.")
      }
      setProducts((prev) => prev.filter((item) => item.id !== productId))
      setProductsCount((prev) => Math.max(0, prev - 1))
      return true
    } catch (err: any) {
      setProductEditError(err?.message || "Erro ao excluir produto.")
      return false
    } finally {
      setDeletingProductId(null)
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

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || "")
        resolve(result.includes(",") ? result.split(",").pop() || "" : result)
      }
      reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o arquivo."))
      reader.readAsDataURL(file)
    })

  const refreshProductsList = async () => {
    const productFields = encodeURIComponent(
      "+variants.inventory_quantity,+variants.prices,+variants.title,+variants.id,+variants.sku,+metadata,+shipping_profile_id"
    )
    const res = await fetch(
      `${medusaUrl}/admin/products?limit=${PRODUCT_PAGE_SIZE}&fields=${productFields}`,
      { headers }
    )
    if (!res.ok) return
    const json = await res.json()
    setProducts(json.products ?? [])
    setProductsCount(Number(json.count ?? json.products?.length ?? 0))
  }

  const importCatalogProducts = async (event: FormEvent) => {
    event.preventDefault()
    if (!catalogImportFile) {
      setProductError("Selecione o arquivo XLSX do catálogo.")
      return
    }
    if (!catalogImportForm.shipping_profile_id) {
      setProductError("Selecione um shipping profile para os produtos importados.")
      return
    }
    setCatalogImportSaving(true)
    setProductError(null)
    setCatalogImportResult(null)
    try {
      const fileBase64 = await fileToBase64(catalogImportFile)
      const res = await fetch(`${medusaUrl}/admin/catalog-products/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_base64: fileBase64,
          shipping_profile_id: catalogImportForm.shipping_profile_id,
          sales_channel_id: catalogImportForm.sales_channel_id || null,
          default_price: catalogImportForm.default_price || "0",
          currency_code: "brl",
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível importar o catálogo.")
      }
      const json = await res.json()
      setCatalogImportResult(json.summary || null)
      await refreshProductsList()
    } catch (err: any) {
      setProductError(err?.message || "Erro ao importar catálogo.")
    } finally {
      setCatalogImportSaving(false)
    }
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
      const selectedShippingOptions = productForm.allowed_shipping_option_ids || []
      if (!selectedShippingOptions.length) {
        setProductError("Selecione ao menos uma forma de entrega.")
        setProductSaving(false)
        return
      }
      if (!productForm.shipping_profile_id) {
        setProductError("Selecione um shipping profile.")
        setProductSaving(false)
        return
      }
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

      const metadata: Record<string, any> | undefined = (() => {
        const featured = productForm.featured === true
        const hasMedia = mediaImages.length || mediaVideos.length || mediaYoutube.length
        const selectedManufacturer = manufacturers.find((item) => item.id === productForm.manufacturer_id)
        const base: Record<string, any> = { allowed_shipping_option_ids: selectedShippingOptions }
        if (featured) {
          base.featured = true
        }
        if (selectedManufacturer) {
          base.manufacturer_id = selectedManufacturer.id
          base.manufacturer_slug = selectedManufacturer.slug
          base.manufacturer_name = selectedManufacturer.name
          base.manufacturer_image_url = selectedManufacturer.image_url || null
        }
        if (hasMedia) {
          base.media = {
            images: mediaImages,
            videos: mediaVideos,
            youtube: mediaYoutube,
          }
        }
        return base
      })()

      const payload: Record<string, any> = {
        title: productForm.title,
        description: productForm.description || null,
        status: "published",
        thumbnail: productForm.thumbnail || null,
        images: productForm.image_url ? [{ url: productForm.image_url }] : undefined,
        shipping_profile_id: productForm.shipping_profile_id,
        options: optionsPayload.map(({ title, values }) => ({
          title,
          values,
        })),
        metadata,
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
        setProductsCount((prev) => prev + 1)
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
      navigate("/produtos")
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
    const storedShippingOptions = Array.isArray(metadata?.allowed_shipping_option_ids)
      ? (metadata?.allowed_shipping_option_ids as string[])
      : []
    const storedProfileId =
      product.shipping_profile_id || (metadata?.shipping_profile_id as string | undefined) || ""
    const storedManufacturerId = String(metadata?.manufacturer_id || "")
    setEditingProductId(product.id)
    setProductEditMediaUploadError(null)
    setProductEditForm({
      media_images: formatMediaValue(media.images as string[] | undefined),
      media_videos: formatMediaValue(media.videos as string[] | undefined),
      media_youtube: formatMediaValue(media.youtube as string[] | undefined),
      featured: Boolean(metadata?.featured),
      allowed_shipping_option_ids: storedShippingOptions.length
        ? storedShippingOptions
        : allShippingOptionIds,
      shipping_profile_id: storedProfileId || shippingProfiles[0]?.id || "",
      manufacturer_id: storedManufacturerId,
    })
  }

  useEffect(() => {
    if (!editingProductId) return
    if (!productEditForm.shipping_profile_id) return
    setProductEditForm((prev) => {
      if (prev.allowed_shipping_option_ids?.length) return prev
      const options = shippingOptionsByProfile.get(productEditForm.shipping_profile_id) || []
      const ids = options.map((option) => option.id).filter(Boolean)
      return { ...prev, allowed_shipping_option_ids: ids }
    })
  }, [editingProductId, productEditForm.shipping_profile_id, shippingOptionsByProfile])

  useEffect(() => {
    if (!isEditMode) return
    if (!activeProduct) return
    startEditProductMedia(activeProduct)
  }, [isEditMode, activeProduct?.id])

  const cancelEditProductMedia = () => {
    setEditingProductId(null)
    setProductEditError(null)
    setProductEditMediaUploadError(null)
  }

  const updateProductEditField = (
    field: keyof typeof productEditForm,
    value: string | boolean
  ) => {
    setProductEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleEditShippingOption = (optionId: string) => {
    setProductEditForm((prev) => {
      const current = prev.allowed_shipping_option_ids || []
      const exists = current.includes(optionId)
      const next = exists ? current.filter((id) => id !== optionId) : [...current, optionId]
      return { ...prev, allowed_shipping_option_ids: next }
    })
  }

  const selectAllEditShippingOptions = () => {
    const options = productEditForm.shipping_profile_id
      ? shippingOptionsByProfile.get(productEditForm.shipping_profile_id) || []
      : effectiveShippingOptions
    const ids = options.map((option) => option.id).filter(Boolean)
    setProductEditForm((prev) => ({ ...prev, allowed_shipping_option_ids: ids }))
  }

  const clearEditShippingOptions = () => {
    setProductEditForm((prev) => ({ ...prev, allowed_shipping_option_ids: [] }))
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
    if (!productEditForm.allowed_shipping_option_ids?.length) {
      setProductEditError("Selecione ao menos uma forma de entrega.")
      return
    }
    if (!productEditForm.shipping_profile_id) {
      setProductEditError("Selecione um shipping profile.")
      return
    }
    setProductEditSaving(true)
    setProductEditError(null)
    try {
      const selectedManufacturer = manufacturers.find((item) => item.id === productEditForm.manufacturer_id)
      const payload = {
        shipping_profile_id: productEditForm.shipping_profile_id,
        metadata: {
          ...(product.metadata || {}),
          featured: productEditForm.featured === true,
          manufacturer_id: selectedManufacturer?.id || null,
          manufacturer_slug: selectedManufacturer?.slug || null,
          manufacturer_name: selectedManufacturer?.name || null,
          manufacturer_image_url: selectedManufacturer?.image_url || null,
          allowed_shipping_option_ids: productEditForm.allowed_shipping_option_ids,
          shipping_profile_id: productEditForm.shipping_profile_id,
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

  const filteredCatalogProducts = useMemo(() => {
    if (!manufacturerFilter) return products
    return products.filter((product) => {
      const metadata = (product.metadata || {}) as Record<string, any>
      return String(metadata.manufacturer_id || "") === manufacturerFilter
    })
  }, [products, manufacturerFilter])

  const loadMoreProducts = async () => {
    if (mode !== "list") return
    if (productsLoadingMoreRef.current) return
    if (products.length >= productCount) return

    productsLoadingMoreRef.current = true
    setProductsLoadingMore(true)
    setProductError(null)
    try {
      const productFields = encodeURIComponent(
        "+variants.inventory_quantity,+variants.prices,+variants.title,+variants.id,+variants.sku,+metadata,+shipping_profile_id"
      )
      const res = await fetch(
        `${medusaUrl}/admin/products?limit=${PRODUCT_PAGE_SIZE}&offset=${products.length}&fields=${productFields}`,
        { headers }
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Não foi possível carregar mais produtos.")
      }
      const json = await res.json()
      const nextProducts = json.products ?? []
      setProducts((prev) => {
        const seen = new Set(prev.map((item) => item.id))
        const uniqueNext = nextProducts.filter((item: Product) => !seen.has(item.id))
        return [...prev, ...uniqueNext]
      })
      setProductsCount(Number(json.count ?? productCount))
    } catch (err: any) {
      setProductError(err?.message || "Erro ao carregar mais produtos.")
    } finally {
      productsLoadingMoreRef.current = false
      setProductsLoadingMore(false)
    }
  }

  useEffect(() => {
    if (mode !== "list") return
    const onScroll = () => {
      const distanceToBottom =
        document.documentElement.scrollHeight - (window.innerHeight + window.scrollY)
      if (distanceToBottom < 480) {
        loadMoreProducts()
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [mode, products.length, productCount, medusaUrl, headers])

  if (isDeleteMode) {
    if (!activeProduct) {
      return (
        <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir produto</h1>
          <p className="page-subtitle">Produto não encontrado.</p>
        </header>
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/produtos")}>
            Voltar
          </button>
        </div>
      )
    }

    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Excluir produto</h1>
          <p className="page-subtitle">{activeProduct.title || "Produto"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/produtos")}>
            Voltar
          </button>
          <button
            className="btn"
            type="button"
            disabled={deletingProductId === activeProduct.id}
            onClick={async () => {
              const ok = await deleteProduct(activeProduct.id)
              if (ok) navigate("/produtos")
            }}
          >
            {deletingProductId === activeProduct.id ? "Excluindo..." : "Confirmar exclusão"}
          </button>
        </div>

        {productEditError && <div className="panel muted">Erro: {productEditError}</div>}

        <section className="panel" style={{ maxWidth: "820px" }}>
          <h3>Resumo</h3>
          <div className="grid" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Status</span>
              <span>{activeProduct.status || "—"}</span>
            </div>
            <div className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Variações</span>
              <span>{activeProduct.variants?.length || 0}</span>
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
          <h1 className="page-title">Adicionar produto</h1>
          <p className="page-subtitle">Cadastre os dados, variações e estoque inicial.</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/produtos")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button className="btn" type="submit" form="product-create-form" disabled={productSaving}>
              {productSaving ? "Criando..." : "Adicionar produto"}
            </button>
          </div>
        </div>

        {productError && <div className="panel muted">Erro: {productError}</div>}

        <form id="product-create-form" className="grid" onSubmit={createProduct} style={{ gap: "0.85rem" }}>
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

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Shipping profile</span>
              <select
                value={productForm.shipping_profile_id}
                onChange={(e) => {
                  handleProductChange("shipping_profile_id", e.target.value)
                  setProductForm((prev) => ({
                    ...prev,
                    allowed_shipping_option_ids: [],
                  }))
                }}
                className="field-input"
              >
                <option value="">Selecionar</option>
                {shippingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name || profile.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Fabricante</span>
              <select
                value={productForm.manufacturer_id}
                onChange={(e) => handleProductChange("manufacturer_id", e.target.value)}
                className="field-input"
              >
                <option value="">Selecionar</option>
                {manufacturers
                  .filter((item) => item.is_active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
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
                <h4>Formas de entrega permitidas</h4>
                <p className="muted" style={{ marginTop: "0.25rem" }}>
                  Defina quais opções de envio podem ser usadas para este produto.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={selectAllShippingOptions}
                  disabled={!effectiveShippingOptions.length}
                >
                  Selecionar tudo
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={clearShippingOptions}
                  disabled={!effectiveShippingOptions.length}
                >
                  Limpar
                </button>
              </div>
            </div>

            {effectiveShippingOptions.length === 0 ? (
              <p className="muted">
                {shippingOptionsLoading
                  ? "Carregando formas de entrega..."
                  : shippingOptionsError || "Nenhuma forma de entrega cadastrada."}
              </p>
            ) : !productForm.shipping_profile_id ? (
              <p className="muted">Selecione um shipping profile para listar as opções.</p>
            ) : selectedProfileOptions.length === 0 ? (
              <p className="muted" style={{ color: "#F87171" }}>
                Este shipping profile não possui formas de entrega vinculadas.
              </p>
            ) : (
              <div
                className="grid"
                style={{
                  gap: "0.5rem",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {selectedProfileOptions.map((option) => {
                  const checked = productForm.allowed_shipping_option_ids.includes(option.id)
                  const region =
                    option.region?.name ||
                    option.service_zone?.region?.name ||
                    option.service_zone?.name
                  const profile = option.shipping_profile?.name
                  const meta = [region ? `Região: ${region}` : null, profile ? `Perfil: ${profile}` : null]
                    .filter(Boolean)
                    .join(" · ")
                  return (
                    <label
                      key={option.id}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "flex-start",
                        padding: "0.5rem 0.65rem",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleShippingOption(option.id)}
                        className="checkbox"
                      />
                      <div className="grid" style={{ gap: "0.2rem" }}>
                        <span>{option.name || option.id}</span>
                        {meta && <span className="muted">{meta}</span>}
                      </div>
                    </label>
                  )
                })}
              </div>
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
              checked={productForm.featured}
              onChange={(e) => handleProductChange("featured", e.target.checked)}
              className="checkbox"
            />
            <span className="muted">Produto em destaque</span>
          </label>

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
    )
  }

  if (isEditMode) {
    return (
      <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
        <header className="page-header">
          <h1 className="page-title">Editar produto</h1>
          <p className="page-subtitle">{activeProduct?.title || "Produto"}</p>
        </header>

        <div className="action-bar">
          <button className="btn btn-secondary" type="button" onClick={() => navigate("/produtos")}>
            Voltar
          </button>
          <div className="action-bar-group">
            <button
              className="btn"
              type="button"
              disabled={productEditSaving}
              onClick={() => activeProduct && saveProductMedia(activeProduct)}
            >
              {productEditSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>

        {productEditError && <div className="panel muted">Erro: {productEditError}</div>}

        {!activeProduct ? (
          <div className="panel muted">Produto não encontrado.</div>
        ) : (
          <div className="panel grid" style={{ gap: "0.75rem", maxWidth: "980px" }}>
            <textarea
              value={productEditForm.media_images}
              onChange={(e) => updateProductEditField("media_images", e.target.value)}
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
              onChange={(e) => updateProductEditField("media_videos", e.target.value)}
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
              onChange={(e) => updateProductEditField("media_youtube", e.target.value)}
              rows={2}
              placeholder="YouTube (links)"
              className="field-input"
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={productEditForm.featured}
                onChange={(e) => updateProductEditField("featured", e.target.checked)}
                className="checkbox"
              />
              <span className="muted">Produto em destaque</span>
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Shipping profile</span>
              <select
                value={productEditForm.shipping_profile_id}
                onChange={(e) => {
                  updateProductEditField("shipping_profile_id", e.target.value)
                  setProductEditForm((prev) => ({
                    ...prev,
                    allowed_shipping_option_ids: [],
                  }))
                }}
                className="field-input"
              >
                <option value="">Selecionar</option>
                {shippingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name || profile.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Fabricante</span>
              <select
                value={productEditForm.manufacturer_id}
                onChange={(e) => updateProductEditField("manufacturer_id", e.target.value)}
                className="field-input"
              >
                <option value="">Sem fabricante</option>
                {manufacturers
                  .filter((item) => item.is_active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="panel grid" style={{ gap: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span className="muted">Formas de entrega permitidas</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={selectAllEditShippingOptions}
                    disabled={!effectiveShippingOptions.length}
                  >
                    Selecionar tudo
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={clearEditShippingOptions}
                    disabled={!effectiveShippingOptions.length}
                  >
                    Limpar
                  </button>
                </div>
              </div>
              {effectiveShippingOptions.length === 0 ? (
                <span className="muted">
                  {shippingOptionsLoading
                    ? "Carregando formas de entrega..."
                    : shippingOptionsError || "Nenhuma forma de entrega cadastrada."}
                </span>
              ) : !productEditForm.shipping_profile_id ? (
                <span className="muted">
                  Selecione um shipping profile para listar as opções.
                </span>
              ) : (() => {
                  const options =
                    shippingOptionsByProfile.get(productEditForm.shipping_profile_id) || []
                  if (!options.length) {
                    return (
                      <span className="muted" style={{ color: "#F87171" }}>
                        Este shipping profile não possui formas de entrega vinculadas.
                      </span>
                    )
                  }
                  return (
                    <div
                      className="grid"
                      style={{
                        gap: "0.5rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      }}
                    >
                      {options.map((option) => {
                        const checked = productEditForm.allowed_shipping_option_ids.includes(
                          option.id
                        )
                        const region =
                          option.region?.name ||
                          option.service_zone?.region?.name ||
                          option.service_zone?.name
                        const profile = option.shipping_profile?.name
                        const meta = [
                          region ? `Região: ${region}` : null,
                          profile ? `Perfil: ${profile}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                        return (
                          <label
                            key={option.id}
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "flex-start",
                              padding: "0.4rem 0.55rem",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "0.5rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEditShippingOption(option.id)}
                              className="checkbox"
                            />
                            <div className="grid" style={{ gap: "0.2rem" }}>
                              <span>{option.name || option.id}</span>
                              {meta && <span className="muted">{meta}</span>}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )
                })()}
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                Atualize mídias e formas de entrega e salve as alterações.
              </div>
              {productEditMediaUploading && <span className="muted">Enviando midia...</span>}
              {productEditMediaUploadError && (
                <span className="muted">Erro no upload: {productEditMediaUploadError}</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="layout" style={{ width: "100%", margin: 0, padding: 0 }}>
      <header className="grid" style={{ gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Produtos</h1>
        <p className="muted">Acompanhe catálogo, estoque e preços médios.</p>
      </header>

      {productError && <div className="panel muted">Erro: {productError}</div>}

      <section className="grid grid-3">
        <div className="panel grid" style={{ gap: "0.35rem" }}>
          <span className="muted">Produtos</span>
          <strong style={{ fontSize: "1.6rem" }}>{productCount}</strong>
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
        <form className="grid" style={{ gap: "0.75rem" }} onSubmit={importCatalogProducts}>
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
              <h3>Importar catálogo de condomínios</h3>
              <p className="muted" style={{ marginTop: "0.25rem" }}>
                Atualiza produtos existentes pelo SKU e cria os SKUs novos da planilha.
              </p>
            </div>
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={catalogImportSaving || !catalogImportFile}
            >
              <FontAwesomeIcon icon={faFileImport} />
              {catalogImportSaving ? "Importando..." : "Importar"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Arquivo XLSX</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="field-input"
                onChange={(event) => setCatalogImportFile(event.target.files?.[0] || null)}
              />
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Shipping profile</span>
              <select
                className="field-input"
                value={catalogImportForm.shipping_profile_id}
                onChange={(event) =>
                  setCatalogImportForm((prev) => ({
                    ...prev,
                    shipping_profile_id: event.target.value,
                  }))
                }
              >
                <option value="">Selecionar</option>
                {shippingProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name || profile.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Sales Channel (opcional)</span>
              <select
                className="field-input"
                value={catalogImportForm.sales_channel_id}
                onChange={(event) =>
                  setCatalogImportForm((prev) => ({
                    ...prev,
                    sales_channel_id: event.target.value,
                  }))
                }
              >
                <option value="">Selecionar</option>
                {salesChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name || channel.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid" style={{ gap: "0.35rem" }}>
              <span className="muted">Preço padrão (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="field-input"
                value={catalogImportForm.default_price}
                onChange={(event) =>
                  setCatalogImportForm((prev) => ({
                    ...prev,
                    default_price: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          {catalogImportResult && (
            <div className="muted">
              Criados: {catalogImportResult.created} · Atualizados: {catalogImportResult.updated} ·
              Ignorados: {catalogImportResult.skipped} · Falhas: {catalogImportResult.failed}
            </div>
          )}
        </form>
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
            <span className="pill">
              {manufacturerFilter
                ? `${filteredCatalogProducts.length} filtrados`
                : `${products.length} de ${productCount}`}
            </span>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              type="button"
              onClick={() => navigate("/produtos/novo")}
              title="Adicionar produto"
              aria-label="Adicionar produto"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
        <div className="filters-grid" style={{ marginBottom: "0.75rem" }}>
          <select
            className="field-input"
            value={manufacturerFilter}
            onChange={(e) => setManufacturerFilter(e.target.value)}
          >
            <option value="">Fabricante (todos)</option>
            {manufacturers
              .filter((item) => item.is_active !== false)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setManufacturerFilter("")}
            disabled={!manufacturerFilter}
          >
            Limpar filtro
          </button>
        </div>
        {productEditError && <div className="muted">Erro: {productEditError}</div>}
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Título</th>
                <th>Fabricante</th>
                <th>Estoque</th>
                <th>Preço</th>
                <th>Mídias</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalogProducts.map((p) => {
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
                      <td>
                        {p.title}
                        {p.metadata?.featured && <span className="pill" style={{ marginLeft: "0.5rem" }}>Destaque</span>}
                      </td>
                      <td>{String((p.metadata as Record<string, any> | undefined)?.manufacturer_name || "—")}</td>
                      <td>{hasStockData ? totalStock : "—"}</td>
                      <td>{formatMoney(price?.amount, price?.currency_code)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm btn-icon"
                          type="button"
                          onClick={() => navigate(`/produtos/${p.id}`)}
                          title="Editar produto"
                          aria-label="Editar produto"
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm btn-icon"
                          type="button"
                          onClick={() => navigate(`/produtos/${p.id}/excluir`)}
                          title="Excluir produto"
                          aria-label="Excluir produto"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7}>
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
              {productsLoadingMore && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Carregando mais produtos...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!productsLoadingMore && products.length < productCount && (
          <div className="muted" style={{ marginTop: "0.75rem", textAlign: "center" }}>
            Role para carregar mais produtos.
          </div>
        )}
      </section>
    </div>
  )
}
