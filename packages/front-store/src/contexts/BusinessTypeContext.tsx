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
  setActiveBusinessTypeKey: (key: string | null) => void
  resolveTerms: (key?: string | null) => BusinessTerms
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
    const found = businessTypes.find((type) => type.key === key)
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

  const value = useMemo(
    () => ({
      businessTypes,
      activeBusinessTypeKey,
      setActiveBusinessTypeKey,
      resolveTerms,
    }),
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
      setActiveBusinessTypeKey: (_key: string | null) => undefined,
    }
  }
  const terms = context.resolveTerms(context.activeBusinessTypeKey)
  return {
    terms,
    businessTypes: context.businessTypes,
    setActiveBusinessTypeKey: context.setActiveBusinessTypeKey,
    resolveTerms: context.resolveTerms,
  }
}
