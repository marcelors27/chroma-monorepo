const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => normalize(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[|,;/]+/)
      .map((item) => normalize(item))
      .filter(Boolean);
  }
  return [];
};

const collectCandidates = (metadata?: Record<string, unknown> | null, category?: unknown) => {
  if (!metadata) return toArray(category);
  const keys = [
    "business_type",
    "businessType",
    "business_types",
    "businessTypes",
    "segment",
    "segments",
    "segmento",
    "segmentos",
    "target_business_type",
    "targetBusinessType",
  ];
  const values = keys.flatMap((key) => toArray((metadata as Record<string, unknown>)[key]));
  return [...values, ...toArray(category)];
};

export const matchesBusinessType = (
  businessType?: string | null,
  metadata?: Record<string, unknown> | null,
  category?: unknown
) => {
  const normalizedType = normalize(businessType);
  if (!normalizedType) return true;

  const targets = collectCandidates(metadata, category);
  if (!targets.length) return true;

  return targets.some((target) => target === normalizedType || target.includes(normalizedType));
};
