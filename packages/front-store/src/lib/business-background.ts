import authBg from "@/assets/auth-bg.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import segmentCondominioBg from "@/assets/backgrounds/segment-condominio.svg";
import segmentLojaBg from "@/assets/backgrounds/segment-loja.svg";

const normalize = (value?: string | null) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasAnyKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

export const resolveBusinessBackground = (
  businessTypeKey?: string | null,
  termsLabel?: string | null
) => {
  const key = normalize(businessTypeKey);
  const label = normalize(termsLabel);
  const source = `${key} ${label}`;

  if (hasAnyKeyword(source, ["condominio", "residencial", "predio", "edificio"])) {
    return segmentCondominioBg;
  }

  if (hasAnyKeyword(source, ["loja", "varejo", "retail", "conveniencia", "mercado"])) {
    return segmentLojaBg;
  }

  if (hasAnyKeyword(source, ["posto", "gasolina", "combustivel"])) {
    return segmentLojaBg;
  }

  if (hasAnyKeyword(source, ["auth", "acesso", "cadastro"])) {
    return authBg;
  }

  return heroBg;
};
