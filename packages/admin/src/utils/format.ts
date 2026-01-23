export function formatMoney(amount?: number, currency?: string) {
  if (!amount || !currency) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export function formatCnpj(cnpj?: string) {
  if (!cnpj) return "—"
  const digits = cnpj.replace(/\\D/g, "")
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14),
  ]
  let formatted = ""
  if (parts[0]) formatted += parts[0]
  if (parts[1]) formatted += `.${parts[1]}`
  if (parts[2]) formatted += `.${parts[2]}`
  if (parts[3]) formatted += `/${parts[3]}`
  if (parts[4]) formatted += `-${parts[4]}`
  return formatted || "—"
}
