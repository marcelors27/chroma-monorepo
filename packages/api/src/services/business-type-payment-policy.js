const DEFAULT_PAYMENT_POLICY = {
  methods: {
    credit: true,
    pix: true,
    boleto: true,
  },
  boleto: {
    allowed_days: [1, 3, 15, 30],
    default_day: 3,
  },
  pix: {
    allowed_days: [15, 30],
    default_day: 15,
  },
}

const toBool = (value, fallback) => {
  if (typeof value === "boolean") return value
  return fallback
}

const normalizeDays = (value, fallback) => {
  const list = Array.isArray(value) ? value : fallback
  const normalized = list
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
  const unique = [...new Set(normalized)]
  return unique.length ? unique.sort((a, b) => a - b) : [...fallback]
}

const resolveDefaultDay = (value, allowed, fallback) => {
  const parsed = Number(value)
  if (Number.isInteger(parsed) && allowed.includes(parsed)) return parsed
  if (allowed.includes(fallback)) return fallback
  return allowed[0] || null
}

const parsePaymentPolicyFromTerms = (terms) => {
  const source = terms?.payment_policy || {}
  const methods = {
    credit: toBool(source?.methods?.credit, DEFAULT_PAYMENT_POLICY.methods.credit),
    pix: toBool(source?.methods?.pix, DEFAULT_PAYMENT_POLICY.methods.pix),
    boleto: toBool(source?.methods?.boleto, DEFAULT_PAYMENT_POLICY.methods.boleto),
  }
  const boletoAllowed = normalizeDays(
    source?.boleto?.allowed_days,
    DEFAULT_PAYMENT_POLICY.boleto.allowed_days
  )
  const pixAllowed = normalizeDays(
    source?.pix?.allowed_days,
    DEFAULT_PAYMENT_POLICY.pix.allowed_days
  )
  const boletoDefault = resolveDefaultDay(
    source?.boleto?.default_day,
    boletoAllowed,
    DEFAULT_PAYMENT_POLICY.boleto.default_day
  )
  const pixDefault = resolveDefaultDay(
    source?.pix?.default_day,
    pixAllowed,
    DEFAULT_PAYMENT_POLICY.pix.default_day
  )

  return {
    methods,
    boleto: {
      allowed_days: boletoAllowed,
      default_day: boletoDefault,
    },
    pix: {
      allowed_days: pixAllowed,
      default_day: pixDefault,
    },
  }
}

const normalizeComparable = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

const resolveBusinessTypeFromValue = (businessTypes, value) => {
  if (!value) return null
  const raw = String(value)
  const normalized = normalizeComparable(raw)
  return (
    businessTypes.find((item) => String(item?.id || "") === raw) ||
    businessTypes.find((item) => String(item?.key || "") === raw) ||
    businessTypes.find((item) => normalizeComparable(item?.key) === normalized) ||
    businessTypes.find((item) => normalizeComparable(item?.label) === normalized) ||
    null
  )
}

module.exports = {
  DEFAULT_PAYMENT_POLICY,
  parsePaymentPolicyFromTerms,
  resolveBusinessTypeFromValue,
}
