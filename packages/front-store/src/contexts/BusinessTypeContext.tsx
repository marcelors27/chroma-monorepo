import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { BusinessType, listBusinessTypes } from "@/lib/medusa"

type BusinessTerms = {
  label: string
  labelPlural: string
  labelLower: string
  labelPluralLower: string
  articleSingular: string
  articlePlural: string
  responsibleLabel: string
  responsibleLabelPlural: string
  responsibleLabelLower: string
  responsibleLabelPluralLower: string
  unitLabel: string
  unitLabelPlural: string
  unitLabelLower: string
  unitLabelPluralLower: string
  blockLabel: string
  blockLabelPlural: string
  blockLabelLower: string
  blockLabelPluralLower: string
  floorLabel: string
  floorLabelPlural: string
  floorLabelLower: string
  floorLabelPluralLower: string
  parkingLabel: string
  parkingLabelPlural: string
  parkingLabelLower: string
  parkingLabelPluralLower: string
  pointsLabel: string
  pointsLabelLower: string
}

type BusinessTypeContextValue = {
  businessTypes: BusinessType[]
  activeBusinessTypeKey: string | null
  activeBusinessType: BusinessType | null
  setActiveBusinessTypeKey: (key: string | null) => void
  resolveTerms: (key?: string | null) => BusinessTerms
  resolvePaymentPolicy: (key?: string | null) => {
    methods: { credit: boolean; pix: boolean; boleto: boolean }
    boleto: { allowedDays: number[]; defaultDay: number }
    pix: { allowedDays: number[]; defaultDay: number }
  }
}

const DEFAULT_TERMS: BusinessTerms = {
  label: "Estabelecimento",
  labelPlural: "Estabelecimentos",
  labelLower: "estabelecimento",
  labelPluralLower: "estabelecimentos",
  articleSingular: "do",
  articlePlural: "dos",
  responsibleLabel: "Responsável",
  responsibleLabelPlural: "Responsáveis",
  responsibleLabelLower: "responsável",
  responsibleLabelPluralLower: "responsáveis",
  unitLabel: "Unidade",
  unitLabelPlural: "Unidades",
  unitLabelLower: "unidade",
  unitLabelPluralLower: "unidades",
  blockLabel: "Bloco",
  blockLabelPlural: "Blocos",
  blockLabelLower: "bloco",
  blockLabelPluralLower: "blocos",
  floorLabel: "Andar",
  floorLabelPlural: "Andares",
  floorLabelLower: "andar",
  floorLabelPluralLower: "andares",
  parkingLabel: "Vaga",
  parkingLabelPlural: "Vagas",
  parkingLabelLower: "vaga",
  parkingLabelPluralLower: "vagas",
  pointsLabel: "Pontos",
  pointsLabelLower: "pontos",
}

const BusinessTypeContext = createContext<BusinessTypeContextValue | undefined>(undefined)

const lowerFirst = (value: string) => (value ? value.charAt(0).toLowerCase() + value.slice(1) : value)
const DEFAULT_PAYMENT_POLICY = {
  methods: { credit: true, pix: true, boleto: true },
  boleto: { allowedDays: [1, 3, 15, 30], defaultDay: 3 },
  pix: { allowedDays: [15, 30], defaultDay: 15 },
}

const normalizeDays = (value: unknown, fallback: number[]) => {
  const list = Array.isArray(value) ? value : fallback
  const parsed = list
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
  const unique = [...new Set(parsed)].sort((a, b) => a - b)
  return unique.length ? unique : fallback
}

export function BusinessTypeProvider({ children }: { children: React.ReactNode }) {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [activeBusinessTypeKey, setActiveBusinessTypeKey] = useState<string | null>(null)

  useEffect(() => {
    listBusinessTypes()
      .then((data) => setBusinessTypes(data?.business_types || []))
      .catch(() => setBusinessTypes([]))
  }, [])

  const resolveTerms = (key?: string | null): BusinessTerms => {
    if (!key) return DEFAULT_TERMS
    const normalizedKey = String(key).toLowerCase()
    const found = businessTypes.find(
      (type) =>
        type.key === key ||
        type.id === key ||
        String(type.label || "").toLowerCase() === normalizedKey
    )
    if (!found) return DEFAULT_TERMS
    const label = found.label || DEFAULT_TERMS.label
    const labelPlural = found.label_plural || `${label}s`
    const foundTerms = found.terms || {}
    const take = (termKey: string, fallback: string) =>
      typeof foundTerms[termKey] === "string" && foundTerms[termKey]
        ? String(foundTerms[termKey])
        : fallback
    const responsibleLabel = take("responsible_label", DEFAULT_TERMS.responsibleLabel)
    const responsibleLabelPlural = take("responsible_label_plural", DEFAULT_TERMS.responsibleLabelPlural)
    const unitLabel = take("unit_label", DEFAULT_TERMS.unitLabel)
    const unitLabelPlural = take("unit_label_plural", DEFAULT_TERMS.unitLabelPlural)
    const blockLabel = take("block_label", DEFAULT_TERMS.blockLabel)
    const blockLabelPlural = take("block_label_plural", DEFAULT_TERMS.blockLabelPlural)
    const floorLabel = take("floor_label", DEFAULT_TERMS.floorLabel)
    const floorLabelPlural = take("floor_label_plural", DEFAULT_TERMS.floorLabelPlural)
    const parkingLabel = take("parking_label", DEFAULT_TERMS.parkingLabel)
    const parkingLabelPlural = take("parking_label_plural", DEFAULT_TERMS.parkingLabelPlural)
    const pointsLabel = take("points_label", DEFAULT_TERMS.pointsLabel)
    return {
      label,
      labelPlural,
      labelLower: lowerFirst(label),
      labelPluralLower: lowerFirst(labelPlural),
      articleSingular: found.article_singular || DEFAULT_TERMS.articleSingular,
      articlePlural: found.article_plural || DEFAULT_TERMS.articlePlural,
      responsibleLabel,
      responsibleLabelPlural,
      responsibleLabelLower: lowerFirst(responsibleLabel),
      responsibleLabelPluralLower: lowerFirst(responsibleLabelPlural),
      unitLabel,
      unitLabelPlural,
      unitLabelLower: lowerFirst(unitLabel),
      unitLabelPluralLower: lowerFirst(unitLabelPlural),
      blockLabel,
      blockLabelPlural,
      blockLabelLower: lowerFirst(blockLabel),
      blockLabelPluralLower: lowerFirst(blockLabelPlural),
      floorLabel,
      floorLabelPlural,
      floorLabelLower: lowerFirst(floorLabel),
      floorLabelPluralLower: lowerFirst(floorLabelPlural),
      parkingLabel,
      parkingLabelPlural,
      parkingLabelLower: lowerFirst(parkingLabel),
      parkingLabelPluralLower: lowerFirst(parkingLabelPlural),
      pointsLabel,
      pointsLabelLower: lowerFirst(pointsLabel),
    }
  }

  const resolvePaymentPolicy = (key?: string | null) => {
    if (!key) return DEFAULT_PAYMENT_POLICY
    const found = businessTypes.find(
      (type) => type.key === key || type.id === key || String(type.label || "").toLowerCase() === String(key).toLowerCase()
    )
    if (!found) return DEFAULT_PAYMENT_POLICY
    const policy = (found.terms as any)?.payment_policy || {}
    const boletoAllowedDays = normalizeDays(
      policy?.boleto?.allowed_days,
      DEFAULT_PAYMENT_POLICY.boleto.allowedDays
    )
    const pixAllowedDays = normalizeDays(
      policy?.pix?.allowed_days,
      DEFAULT_PAYMENT_POLICY.pix.allowedDays
    )
    const boletoDefaultCandidate = Number(policy?.boleto?.default_day)
    const pixDefaultCandidate = Number(policy?.pix?.default_day)
    return {
      methods: {
        credit:
          typeof policy?.methods?.credit === "boolean"
            ? policy.methods.credit
            : DEFAULT_PAYMENT_POLICY.methods.credit,
        pix:
          typeof policy?.methods?.pix === "boolean"
            ? policy.methods.pix
            : DEFAULT_PAYMENT_POLICY.methods.pix,
        boleto:
          typeof policy?.methods?.boleto === "boolean"
            ? policy.methods.boleto
            : DEFAULT_PAYMENT_POLICY.methods.boleto,
      },
      boleto: {
        allowedDays: boletoAllowedDays,
        defaultDay: boletoAllowedDays.includes(boletoDefaultCandidate)
          ? boletoDefaultCandidate
          : boletoAllowedDays[0],
      },
      pix: {
        allowedDays: pixAllowedDays,
        defaultDay: pixAllowedDays.includes(pixDefaultCandidate)
          ? pixDefaultCandidate
          : pixAllowedDays[0],
      },
    }
  }

  const value = useMemo(
    () => {
      const activeBusinessType = businessTypes.find(
        (item) =>
          item.key === activeBusinessTypeKey ||
          item.id === activeBusinessTypeKey ||
          String(item.label || "").toLowerCase() === String(activeBusinessTypeKey || "").toLowerCase()
      ) || null
      return {
        businessTypes,
        activeBusinessTypeKey,
        activeBusinessType,
        setActiveBusinessTypeKey,
        resolveTerms,
        resolvePaymentPolicy,
      }
    },
    [businessTypes, activeBusinessTypeKey]
  )

  return <BusinessTypeContext.Provider value={value}>{children}</BusinessTypeContext.Provider>
}

export function useBusinessTerms() {
  const context = useContext(BusinessTypeContext)
  if (!context) {
    return {
      terms: DEFAULT_TERMS,
      businessTypes: [],
      activeBusinessTypeKey: null,
      activeBusinessType: null,
      setActiveBusinessTypeKey: (_key: string | null) => undefined,
      resolvePaymentPolicy: (_key?: string | null) => DEFAULT_PAYMENT_POLICY,
    }
  }
  const terms = context.resolveTerms(context.activeBusinessTypeKey)
  return {
    terms,
    businessTypes: context.businessTypes,
    activeBusinessTypeKey: context.activeBusinessTypeKey,
    activeBusinessType: context.activeBusinessType,
    setActiveBusinessTypeKey: context.setActiveBusinessTypeKey,
    resolveTerms: context.resolveTerms,
    resolvePaymentPolicy: context.resolvePaymentPolicy,
  }
}
