import type { SyntheticEvent } from "react";

export const PRODUCT_IMAGE_FALLBACK_SRC = "/placeholder.svg";

export const getProductImageSrc = (value?: string | null) => {
  return typeof value === "string" && value.trim() ? value : PRODUCT_IMAGE_FALLBACK_SRC;
};

export const handleProductImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (image.getAttribute("src") !== PRODUCT_IMAGE_FALLBACK_SRC) {
    image.src = PRODUCT_IMAGE_FALLBACK_SRC;
  }
};
