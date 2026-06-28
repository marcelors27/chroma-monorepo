import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ProductReviews } from "@/components/ProductReviews";
import { ArrowLeft, Minus, Plus, ShoppingCart, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { getProductImageSrc, handleProductImageError } from "@/lib/product-image-fallback";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  formatMoney,
  resolveMediaUrl,
  retrieveProduct,
} from "@/lib/medusa";

type MediaItem = {
  type: "image" | "video" | "youtube" | "vimeo";
  src: string;
};

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => {
      if (!id) throw new Error("Produto não encontrado");
      return retrieveProduct(id);
    },
    enabled: Boolean(id),
  });

  const product = data?.product;
  const variant = useMemo(() => {
    const variants = product?.variants || [];
    if (!variants.length) return undefined;
    const selected =
      selectedVariantId && variants.find((item) => item.id === selectedVariantId);
    return selected || variants[0];
  }, [product, selectedVariantId]);
  const pricing = useMemo(() => getVariantPricing(variant), [variant]);
  const price = pricing.finalPrice;
  const category = useMemo(() => getProductCategory(product), [product]);

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    const seen = new Set<string>();
    const pushItem = (type: MediaItem["type"], src?: string | null) => {
      if (!src) return;
      const trimmed = src.trim();
      if (!trimmed) return;
      const resolved =
        type === "youtube" || type === "vimeo" ? trimmed : resolveMediaUrl(trimmed);
      if (!resolved || seen.has(`${type}:${resolved}`)) return;
      items.push({ type, src: resolved });
      seen.add(`${type}:${resolved}`);
    };
    const normalizeList = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        return value
          .split(/\n|,/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return [];
    };
    const toYoutubeEmbed = (url: string) => {
      const match =
        url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/i) ||
        [];
      const id = match[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    };

    const variantImage =
      typeof variant?.metadata === "object"
        ? (variant.metadata as Record<string, unknown>)?.image
        : undefined;

    if (variantImage && typeof variantImage === "string") {
      pushItem("image", variantImage);
    }
    if (product?.thumbnail) {
      pushItem("image", product.thumbnail);
    }
    const images = (product as any)?.images as any[];
    if (Array.isArray(images)) {
      images.forEach((img) => {
        const url = img?.url || img?.thumbnail || img;
        if (url && typeof url === "string") {
          pushItem("image", url);
        }
      });
    }

    const metadata = (product as any)?.metadata as Record<string, unknown> | undefined;
    const media = (metadata?.media || metadata?.midia || metadata?.media_assets) as
      | Record<string, unknown>
      | undefined;
    const extraImages = normalizeList(media?.images || metadata?.media_images);
    const extraVideos = normalizeList(media?.videos || metadata?.media_videos);
    const extraYoutube = normalizeList(media?.youtube || metadata?.media_youtube);

    extraImages.forEach((url) => pushItem("image", url));
    extraVideos.forEach((url) => pushItem("video", url));
    extraYoutube.forEach((url) => {
      const embed = toYoutubeEmbed(url);
      if (embed) {
        pushItem("youtube", embed);
      }
    });

    if (!items.length) {
      items.push({ type: "image", src: getProductImage(product) });
    }
    return items;
  }, [product, variant]);

  useEffect(() => {
    if (product?.variants?.length && !selectedVariantId) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product, selectedVariantId]);

  const specifications = useMemo(() => {
    const specs: string[] = [];
    const normalizeValue = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      if (Array.isArray(value)) {
        const parts = value
          .map((item) => normalizeValue(item))
          .filter((item): item is string => Boolean(item));
        return parts.length ? parts.join(", ") : null;
      }
      return null;
    };
    const addSpec = (label: string, value: unknown) => {
      const formatted = normalizeValue(value);
      if (!formatted) return;
      specs.push(label ? `${label}: ${formatted}` : formatted);
    };
    const addFromObject = (obj: Record<string, unknown>) => {
      Object.entries(obj).forEach(([key, value]) => {
        addSpec(key, value);
      });
    };

    const metadata = (product as any)?.metadata as Record<string, unknown> | undefined;
    const specSource =
      metadata?.specifications ?? metadata?.specs ?? metadata?.spec;

    if (specSource) {
      if (Array.isArray(specSource)) {
        specSource.forEach((item) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (trimmed) specs.push(trimmed);
            return;
          }
          if (item && typeof item === "object") {
            const entry = item as Record<string, unknown>;
            const label =
              (entry.label as string) ||
              (entry.title as string) ||
              (entry.name as string) ||
              (entry.key as string);
            if (label && "value" in entry) {
              addSpec(label, entry.value);
              return;
            }
            addFromObject(entry);
          }
        });
      } else if (specSource && typeof specSource === "object") {
        addFromObject(specSource as Record<string, unknown>);
      } else {
        addSpec("Especificação", specSource);
      }
    }

    if (!specs.length) {
      const productOptions = (product as any)?.options as
        | { id?: string; title?: string }[]
        | undefined;
      const optionTitleById = new Map(
        (productOptions || [])
          .filter((option) => option?.id && option?.title)
          .map((option) => [option.id as string, option.title as string])
      );

      const variantOptions = (variant as any)?.options as
        | Record<string, unknown>
        | {
            id?: string;
            option_id?: string;
            value?: string;
            option?: { id?: string; title?: string };
            title?: string;
          }[]
        | undefined;

      if (Array.isArray(variantOptions)) {
        variantOptions.forEach((opt) => {
          const optionId = opt?.option_id || opt?.option?.id || opt?.id;
          const label =
            opt?.option?.title ||
            (optionId ? optionTitleById.get(optionId) : undefined) ||
            opt?.title ||
            "Opção";
          addSpec(label, opt?.value);
        });
      } else if (variantOptions && typeof variantOptions === "object") {
        addFromObject(variantOptions as Record<string, unknown>);
      }
    }

    return specs;
  }, [product, variant]);

  const handleAddToCart = () => {
    if (!product || !variant?.id) {
      toast({
        title: "Produto indisponível",
        description: "Não conseguimos adicionar este item ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: variant.title ? `${product.title} • ${variant.title}` : product.title,
      price,
      category,
      image: mediaItems[0]?.src || getProductImage(product),
      quantity,
    });
    toast({
      title: "Adicionado ao carrinho",
      description: `${product.title} foi adicionado ao carrinho.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded" />
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-10 bg-muted rounded w-1/2" />
              <div className="h-24 bg-muted rounded" />
              <div className="h-10 bg-muted rounded w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-3xl mx-auto border-2 border-border p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <p className="text-muted-foreground">
            Não localizamos este item. Ele pode ter sido removido ou está temporariamente indisponível.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button asChild>
              <Link to="/dashboard">Ver catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const media = mediaItems;
  const mainMedia = media[currentImageIndex];
  const relatedProducts = [] as any[];
  const variants = product?.variants || [];

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="border-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{category}</p>
            <h1 className="text-2xl font-bold">{product.title}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative border-2 border-border bg-card aspect-square overflow-hidden">
              {mainMedia?.type === "image" && (
                <img
                  src={getProductImageSrc(mainMedia.src)}
                  alt={product.title}
                  onError={handleProductImageError}
                  className="w-full h-full object-cover"
                />
              )}
              {mainMedia?.type === "video" && (
                <video src={mainMedia.src} controls className="w-full h-full object-cover" />
              )}
              {mainMedia?.type === "youtube" && (
                <div className="relative w-full pt-[56.25%]">
                  <iframe
                    src={mainMedia.src}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Vídeo do produto"
                  />
                </div>
              )}
              {media.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-between px-3">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9"
                    onClick={() =>
                      setCurrentImageIndex((prev) => (prev - 1 + media.length) % media.length)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9"
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % media.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {media.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {media.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`border-2 overflow-hidden aspect-square ${
                      currentImageIndex === index ? "border-primary" : "border-border"
                    }`}
                  >
                    {item.type === "image" ? (
                      <img
                        src={getProductImageSrc(item.src)}
                        alt={`${product.title} ${index + 1}`}
                        onError={handleProductImageError}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-secondary">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{category}</Badge>
            </div>

            {variants.length > 1 && (
              <div className="space-y-2">
                <p className="font-semibold">Variação</p>
                <select
                  className="w-full border-2 border-border bg-background px-3 py-2 rounded-md"
                  value={variant?.id || ""}
                  onChange={(e) => {
                    setSelectedVariantId(e.target.value);
                    setCurrentImageIndex(0);
                  }}
                >
                  {variants.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title || "Variação"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-1">A partir de</p>
              <p className="text-3xl font-bold text-primary">
                {formatMoney(price)}
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {product.description || "Descrição não disponível para este produto."}
            </p>

            <div className="space-y-2">
              <p className="font-semibold">Quantidade</p>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="border-2"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-10 text-center">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-2"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 h-12 text-lg gap-2"
                onClick={handleAddToCart}
                data-testid="product-add-to-cart"
              >
                <ShoppingCart className="h-5 w-5" />
                Adicionar ao carrinho
              </Button>
              <Button variant="outline" className="flex-1 h-12 text-lg" asChild>
                <Link to="/cart" data-testid="product-checkout">
                  Finalizar compra
                </Link>
              </Button>
            </div>

            <div className="border-2 border-border p-4 bg-card">
              <h3 className="font-semibold mb-3">Especificações</h3>
              {specifications.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {specifications.map((spec) => (
                    <li key={spec}>• {spec}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma especificação adicional disponível.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <ProductReviews productId={product.id} />
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4">Produtos relacionados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {relatedProducts.map((item) => (
                <Link key={item.id} to={`/product/${item.id}`} className="border-2 border-border p-3 hover:border-primary transition-colors">
                  <img
                    src={getProductImageSrc(getProductImage(item))}
                    alt={item.name}
                    onError={handleProductImageError}
                    className="aspect-square object-cover mb-2"
                  />
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-primary font-bold">{formatMoney(item.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
