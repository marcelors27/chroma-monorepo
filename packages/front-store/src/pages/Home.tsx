import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tag, 
  Newspaper, 
  ArrowLeft,
  ArrowRight, 
  Percent, 
  Clock,
  ShoppingCart
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import homeBg from "@/assets/home-bg.jpg";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  getCustomerMe,
  getTokenValue,
  listNews,
  listMarketingBanners,
  listManufacturers,
  listProducts,
  MedusaMarketingBanner,
  MedusaManufacturer,
  MedusaNews,
  MedusaProduct,
  formatMoney,
} from "@/lib/medusa";

const PROMO_KEYWORDS = ["promo", "promoc", "sale", "oferta", "desconto"];

const isPromotionValue = (value: unknown) => {
  if (value === true || value === 1) return true;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (["true", "1", "yes", "sim", "on", "active", "ativo"].includes(normalized)) return true;
    if (PROMO_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  }
  return false;
};

const hasPromotionKeyword = (value: unknown) => {
  const text = String(value ?? "").toLowerCase();
  return PROMO_KEYWORDS.some((keyword) => text.includes(keyword));
};

const hasPromotionMetadata = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) return false;
  return Object.entries(metadata).some(([key, value]) => {
    if (hasPromotionKeyword(key)) return isPromotionValue(value);
    return false;
  });
};

const hasPromotionFlag = (product?: MedusaProduct) => {
  if (!product) return false;
  const variant = getVariant(product);
  const variantPrices = (variant?.prices || []) as Array<Record<string, unknown>>;
  const calculated = variant?.calculated_price as Record<string, unknown> | number | undefined;

  const metadataSignal =
    hasPromotionMetadata((product.metadata || null) as Record<string, unknown> | null) ||
    hasPromotionMetadata((variant?.metadata || null) as Record<string, unknown> | null);
  const tagsSignal = Array.isArray(product.tags) && product.tags.some((tag) => hasPromotionKeyword(tag?.value));
  const pricesSignal = variantPrices.some(
    (price) => hasPromotionKeyword(price?.price_list_type) || isPromotionValue(price?.price_list_id)
  );
  const calculatedSignal =
    typeof calculated === "object" &&
    calculated !== null &&
    (hasPromotionKeyword(calculated?.price_list_type) || isPromotionValue(calculated?.price_list_id));

  return metadataSignal || tagsSignal || pricesSignal || calculatedSignal;
};

const Home = () => {
  const { terms } = useBusinessTerms();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const authToken = getTokenValue();
  const { data, isLoading } = useQuery({ queryKey: ["home-products"], queryFn: listProducts });
  const { data: customerData } = useQuery({
    queryKey: ["customer-me"],
    queryFn: getCustomerMe,
    enabled: Boolean(authToken),
  });
  const { data: newsData, isLoading: isNewsLoading } = useQuery({
    queryKey: ["home-news"],
    queryFn: () => listNews({ limit: 4 }),
  });
  const { data: bannerData } = useQuery({
    queryKey: ["home-banners"],
    queryFn: () => listMarketingBanners({ limit: 4 }),
  });
  const { data: manufacturersData } = useQuery({
    queryKey: ["home-manufacturers"],
    queryFn: () => listManufacturers({ limit: 30 }),
  });

  const promotions = useMemo(() => {
    const items = data?.products || [];

    return items
      .map((product: MedusaProduct) => {
        const variant = getVariant(product);
        const pricing = getVariantPricing(variant);
        return {
          id: product.id,
          title: product.title,
          description: product.description || `Oferta especial para ${terms.labelPluralLower}.`,
          originalPrice: pricing.basePrice ?? undefined,
          salePrice: pricing.finalPrice,
          discount: pricing.discountPercent,
          onSale: pricing.onSale,
          isPromotion: pricing.onSale || hasPromotionFlag(product),
          image: getProductImage(product),
          validUntil: "",
          variantId: variant?.id,
          category: getProductCategory(product),
        };
      })
      .filter((product) => Boolean(product.isPromotion))
      .slice(0, 3);
  }, [data, terms.labelPluralLower]);

  const handleAddToCart = (promo: (typeof promotions)[0]) => {
    if (!promo?.variantId) {
      toast({
        title: "Produto indisponível",
        description: "Não foi possível adicionar esta oferta.",
        variant: "destructive",
      });
      return;
    }
    addItem({
      productId: promo.id,
      variantId: promo.variantId,
      name: promo.title,
      price: promo.salePrice,
      category: promo.category,
      image: promo.image,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const customer = customerData?.customer;
  const greetingName = [
    customer?.first_name,
    customer?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || ((customer?.metadata as any)?.nome ?? (customer?.metadata as any)?.name ?? "");
  const hasGreetingName = Boolean(greetingName?.trim());

  const newsItems = (newsData?.news || []) as MedusaNews[];
  const banners = (bannerData?.banners || []) as MedusaMarketingBanner[];
  const manufacturers = (manufacturersData?.manufacturers || []) as MedusaManufacturer[];
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [bannerColors, setBannerColors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const bannerTrackRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef(0);
  const dragDeltaRef = useRef(0);
  const dragActiveRef = useRef(false);
  const [prefersReducedData, setPrefersReducedData] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const connection = (navigator as any).connection;
    if (!connection) return;

    const evaluate = () => {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      const saveData = Boolean(connection.saveData);
      const slowType = ["slow-2g", "2g", "3g"].includes(effectiveType);
      const lowDownlink = typeof downlink === "number" && downlink > 0 && downlink < 1.5;
      setPrefersReducedData(saveData || slowType || lowDownlink);
    };

    evaluate();
    connection.addEventListener?.("change", evaluate);
    return () => {
      connection.removeEventListener?.("change", evaluate);
    };
  }, []);

  const resolveBannerHref = (banner: MedusaMarketingBanner) => {
    if (!banner?.link_type) return null;
    if (banner.link_type === "url") return banner.link_value || null;
    if (banner.link_type === "product" && banner.link_value) {
      return `/product/${banner.link_value}`;
    }
    if (banner.link_type === "manufacturer" && banner.link_value) {
      return `/dashboard?manufacturer=${encodeURIComponent(banner.link_value)}`;
    }
    if (banner.link_type === "area") {
      switch (banner.link_value) {
        case "home":
          return "/home";
        case "catalog":
          return "/dashboard";
        case "orders":
          return "/orders";
        case "condos":
          return "/condos";
        case "recurrences":
          return "/recurrences";
        case "checkout":
          return "/checkout";
        case "settings":
          return "/settings";
        default:
          return null;
      }
    }
    return null;
  };

  const isVideo = (url?: string | null) => {
    if (!url) return false;
    return /\.(mp4|webm|mov)$/i.test(url);
  };

  useEffect(() => {
    if (banners.length === 0) return;
    setBannerIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isBannerPaused) return;
    const interval = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [banners.length, isBannerPaused]);

  const goToPrevBanner = () => {
    if (banners.length <= 1) return;
    setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNextBanner = () => {
    if (banners.length <= 1) return;
    setBannerIndex((prev) => (prev + 1) % banners.length);
  };

  const extractAverageColor = (img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    const width = Math.min(img.naturalWidth || img.width || 1, 64);
    const height = Math.min(img.naturalHeight || img.height || 1, 64);
    canvas.width = width;
    canvas.height = height;

    try {
      context.drawImage(img, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count += 1;
      }
      if (!count) return null;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return null;
    }
  };

  const handleBannerImageLoad = (bannerId: string) => (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (bannerColors[bannerId]) return;
    const color = extractAverageColor(event.currentTarget);
    if (!color) return;
    setBannerColors((prev) => ({ ...prev, [bannerId]: color }));
  };

  const resolveNextIndex = (delta: number) => {
    if (banners.length <= 1) return bannerIndex;
    const width = bannerTrackRef.current?.clientWidth || 1;
    const threshold = width * 0.2;
    if (Math.abs(delta) < threshold) return bannerIndex;
    if (delta < 0) return (bannerIndex + 1) % banners.length;
    return (bannerIndex - 1 + banners.length) % banners.length;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (banners.length <= 1) return;
    if (event.pointerType === "mouse") return;
    dragActiveRef.current = true;
    dragStartXRef.current = event.clientX;
    dragDeltaRef.current = 0;
    setIsBannerPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    dragDeltaRef.current = event.clientX - dragStartXRef.current;
    if (!isDragging && Math.abs(dragDeltaRef.current) > 6) {
      setIsDragging(true);
    }
    const width = bannerTrackRef.current?.clientWidth || 1;
    const offsetPercent = (dragDeltaRef.current / width) * 100;
    if (bannerTrackRef.current) {
      bannerTrackRef.current.style.transform = `translateX(calc(-${bannerIndex * 100}% + ${offsetPercent}%))`;
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    const delta = dragDeltaRef.current;
    const nextIndex = resolveNextIndex(delta);
    setBannerIndex(nextIndex);
    setIsDragging(false);
    setIsBannerPaused(false);
    dragDeltaRef.current = 0;
    if (bannerTrackRef.current) {
      bannerTrackRef.current.style.transform = `translateX(-${nextIndex * 100}%)`;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${homeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          <span>Olá</span>
          {hasGreetingName && (
            <>
              <span>, </span>
              <span className="text-blue-500">{greetingName}</span>
            </>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          {`Confira as melhores ofertas e novidades para ${terms.articleSingular} ${terms.labelLower}`}
        </p>
      </div>

      {banners.length > 0 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div
              className="relative overflow-hidden rounded-2xl"
              onMouseEnter={() => setIsBannerPaused(true)}
              onMouseLeave={() => setIsBannerPaused(false)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              style={{ touchAction: "pan-y" }}
            >
              {banners.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
                    aria-label="Banner anterior"
                    onClick={goToPrevBanner}
                    onMouseEnter={() => setIsBannerPaused(true)}
                    onMouseLeave={() => setIsBannerPaused(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
                    aria-label="Próximo banner"
                    onClick={goToNextBanner}
                    onMouseEnter={() => setIsBannerPaused(true)}
                    onMouseLeave={() => setIsBannerPaused(false)}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div
                ref={bannerTrackRef}
                className={`flex transition-transform duration-700 ease-in-out ${
                  isDragging ? "transition-none" : ""
                }`}
                style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
              >
                {banners.map((banner) => {
                  const href = resolveBannerHref(banner);
                  const desktopAnimation = banner.animation_url || "";
                  const mobileAnimation = banner.animation_mobile_url || "";
                  const desktopIsVideo = isVideo(desktopAnimation);
                  const mobileIsVideo = isVideo(mobileAnimation);
                  const desktopFallback = banner.fallback_image_url || banner.image_url || "";
                  const mobileFallback =
                    banner.fallback_image_mobile_url || banner.image_mobile_url || desktopFallback;
                  const desktopImage = desktopIsVideo
                    ? banner.image_url || banner.fallback_image_url || ""
                    : desktopAnimation || banner.image_url || "";
                  const mobileImage = mobileIsVideo
                    ? banner.image_mobile_url || banner.fallback_image_mobile_url || desktopImage
                    : mobileAnimation || banner.image_mobile_url || desktopImage;
                  const showDesktopVideo = desktopIsVideo && !prefersReducedData;
                  const showMobileVideo = mobileIsVideo && !prefersReducedData;
                  const content = (
                    <div className="relative w-full shrink-0">
                      <div
                        className="relative w-full aspect-[1440/360]"
                        style={{ backgroundColor: bannerColors[banner.id] || "hsl(var(--card))" }}
                      >
                        {(desktopAnimation || desktopImage || desktopFallback) && (
                          <>
                            {showDesktopVideo ? (
                              <video
                                className="hidden md:block absolute inset-0 h-full w-full object-contain"
                                src={desktopAnimation}
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster={desktopFallback || undefined}
                              />
                            ) : (
                              <img
                                className="hidden md:block absolute inset-0 h-full w-full object-contain"
                                src={desktopImage || desktopFallback}
                                alt={banner.title}
                                onLoad={handleBannerImageLoad(banner.id)}
                              />
                            )}
                            {showMobileVideo ? (
                              <video
                                className="md:hidden absolute inset-0 h-full w-full object-contain"
                                src={mobileAnimation}
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster={mobileFallback || undefined}
                              />
                            ) : (
                              <img
                                className="md:hidden absolute inset-0 h-full w-full object-contain"
                                src={mobileImage || mobileFallback}
                                alt={banner.title}
                                onLoad={handleBannerImageLoad(banner.id)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );

                  if (!href)
                    return (
                      <div key={banner.id} className="w-full shrink-0">
                        {content}
                      </div>
                    );
                  const isExternal = /^https?:\/\//i.test(href);
                  return isExternal ? (
                    <a
                      key={banner.id}
                      className="w-full shrink-0"
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link key={banner.id} className="w-full shrink-0" to={href}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
            {banners.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                {banners.map((banner, idx) => (
                  <button
                    key={banner.id}
                    type="button"
                    className={`h-2 w-2 rounded-full transition ${
                      idx === bannerIndex ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                    aria-label={`Ir para banner ${idx + 1}`}
                    onClick={() => setBannerIndex(idx)}
                    onMouseEnter={() => setIsBannerPaused(true)}
                    onMouseLeave={() => setIsBannerPaused(false)}
                    onFocus={() => setIsBannerPaused(true)}
                    onBlur={() => setIsBannerPaused(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {manufacturers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Fabricantes</h2>
            </div>
            <Link to="/dashboard">
              <Button variant="ghost" className="gap-1">
                Ver catálogo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {manufacturers.map((manufacturer) => (
              <Link
                key={manufacturer.id}
                to={`/dashboard?manufacturer=${encodeURIComponent(manufacturer.slug)}`}
                className="min-w-[160px] border-2 border-border bg-card p-3 hover:border-primary transition-colors"
              >
                <div className="aspect-[4/3] bg-secondary border border-border overflow-hidden mb-2 rounded-md">
                  {manufacturer.image_url ? (
                    <img
                      src={manufacturer.image_url}
                      alt={manufacturer.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm line-clamp-2">{manufacturer.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Promotions Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold" data-testid="home-promotions-title">
              Destaques de promoções
            </h2>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" className="gap-1">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={`promo-skeleton-${idx}`} className="border-2 animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}

          {!isLoading && promotions.length === 0 && (
            <Card className="border-2">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma oferta disponível no momento. Volte mais tarde.
              </CardContent>
            </Card>
          )}

          {!isLoading &&
            promotions.map((promo) => {
              const showDiscount =
                promo.originalPrice && promo.originalPrice > promo.salePrice && promo.discount;
              const showPromotionBadge = promo.isPromotion;
              return (
                <Card
                  key={promo.id}
                  className="overflow-hidden border-2 hover:border-primary transition-colors group flex flex-col h-full cursor-pointer"
                  onClick={() => navigate(`/product/${promo.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/product/${promo.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalhes de ${promo.title}`}
                >
                  <div className="relative aspect-video bg-secondary">
                    <img
                      src={promo.image}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                    {showPromotionBadge && (
                      <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                        {showDiscount ? (
                          <>
                            <Percent className="h-3 w-3 mr-1" />
                            {promo.discount}% OFF
                          </>
                        ) : (
                          "PROMO"
                        )}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-lg line-clamp-1">{promo.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {promo.description}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      {showDiscount && (
                        <span className="text-muted-foreground line-through text-sm">
                          {formatMoney(promo.originalPrice)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-primary">
                        {formatMoney(promo.salePrice)}
                      </span>
                    </div>
                    {promo.validUntil && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        Válido até {formatDate(promo.validUntil)}
                      </div>
                    )}
                    <Button
                      className="w-full mt-auto gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddToCart(promo);
                      }}
                      disabled={!promo.variantId}
                      data-testid="home-promo-add"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar ao Carrinho
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>

      {/* News Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold" data-testid="home-news-title">
              Notícias e Dicas
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isNewsLoading &&
            Array.from({ length: 2 }).map((_, idx) => (
              <Card key={`news-skeleton-${idx}`} className="border-2 animate-pulse">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                  <div className="h-5 bg-muted rounded w-3/4 mt-3" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}

          {!isNewsLoading && newsItems.length === 0 && (
            <Card className="border-2">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma notícia disponível no momento.
              </CardContent>
            </Card>
          )}

          {!isNewsLoading &&
            newsItems.map((item) => (
            <Link key={item.id} to={`/news/${item.id}`} data-testid="home-news-link">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
                {item.image_url && (
                  <div className="relative w-full h-40 overflow-hidden border-b border-border/60">
                    <img
                      src={item.image_url}
                      alt={item.title || "Notícia"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{item.category || "Geral"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.published_at ? formatDate(item.published_at) : "—"}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {item.summary}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Ver Produtos</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/orders">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Clock className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Meus Pedidos</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/condos">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Tag className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Condomínios</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Newspaper className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Configurações</span>
            </CardContent>
          </Card>
        </Link>
      </section>
      </div>
    </div>
  );
};

export default Home;
