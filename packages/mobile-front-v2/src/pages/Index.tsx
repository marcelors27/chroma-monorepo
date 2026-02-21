import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View, Image, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { ArrowRight, MessageCircle, Newspaper, Package, Star, TrendingUp } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Video from "react-native-video";
import { useNetInfo } from "@react-native-community/netinfo";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { NewsCard } from "@/components/ui/NewsCard";
import { ProductCard } from "@/components/ui/ProductCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listNews,
  listProducts,
  listMarketingBanners,
  listManufacturers,
  MedusaManufacturer,
  MedusaMarketingBanner,
  MedusaNews,
  MedusaProduct,
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

export default function Index() {
  const navigation = useNavigation();
  const { activeCondo } = useCondo();
  const { addItem, isAddingItem } = useCart();
  const { user } = useAuth();
  const { terms } = useBusinessTerms();
  const netInfo = useNetInfo();
  const { data, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["home-products"],
    queryFn: listProducts,
  });
  const { data: newsData, isLoading: isLoadingNews, refetch: refetchNews } = useQuery({
    queryKey: ["home-news"],
    queryFn: () => listNews({ limit: 3 }),
  });
  const { data: bannerData, isLoading: isLoadingBanners, refetch: refetchBanners } = useQuery({
    queryKey: ["home-banners"],
    queryFn: () => listMarketingBanners({ limit: 5 }),
  });
  const { data: manufacturersData } = useQuery({
    queryKey: ["home-manufacturers"],
    queryFn: () => listManufacturers({ limit: 30 }),
  });
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isBannerInteracting, setIsBannerInteracting] = useState(false);
  const bannerScrollRef = useRef<ScrollView>(null);
  const resumeAutoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenWidth = Dimensions.get("window").width;
  const productCardWidth = (screenWidth - 52) / 2;
  const bannerCardWidth = Math.max(screenWidth - 72, 260);
  const bannerGap = 14;
  const bannerSnapInterval = bannerCardWidth + bannerGap;
  const whatsappTarget = process.env.EXPO_PUBLIC_WHATSAPP_TARGET || "+55 51 981975736";
  const pullThreshold = 80;

  const featuredProducts = (data?.products || [])
    .map((product: MedusaProduct) => {
      const variant = getVariant(product);
      const pricing = getVariantPricing(variant);
      return {
        id: product.id,
        name: product.title,
        description: product.description || "Descrição não informada.",
        price: pricing.finalPrice,
        originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
        isOnPromotion: pricing.onSale || hasPromotionFlag(product),
        image: getProductImage(product) || "",
        category: getProductCategory(product),
        variantId: variant?.id || "",
        variantTitle: variant?.title || "",
      };
    })
    .slice(0, 2);

  const promotionHighlights = (data?.products || [])
    .map((product: MedusaProduct) => {
      const variant = getVariant(product);
      const pricing = getVariantPricing(variant);
      return {
        id: product.id,
        name: product.title,
        description: product.description || "Descrição não informada.",
        price: pricing.finalPrice,
        originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
        isOnPromotion: pricing.onSale || hasPromotionFlag(product),
        image: getProductImage(product) || "",
        category: getProductCategory(product),
        variantId: variant?.id || "",
        variantTitle: variant?.title || "",
      };
    })
    .filter((product) => product.isOnPromotion)
    .slice(0, 2);

  const handleAddToCart = async (product: (typeof featuredProducts)[number]) => {
    if (!activeCondo) {
      toast.error(`Selecione ${terms.articleSingular} ${terms.labelLower} antes de adicionar itens ao carrinho.`);
      return;
    }
    if (!product.variantId) {
      toast.error("Produto indisponível no momento.");
      return;
    }
    await addItem({
      productId: product.id,
      variantId: product.variantId,
      name: product.variantTitle ? `${product.name} • ${product.variantTitle}` : product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      quantity: 1,
    });
  };

  const formatNewsDate = (date?: string | null) => {
    if (!date) return "Agora";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const openWhatsapp = async () => {
    const trimmed = whatsappTarget.trim();
    if (!trimmed) {
      toast.error("WhatsApp nao configurado.");
      return;
    }

    const digits = trimmed.replace(/\D/g, "");
    const isId = /[a-zA-Z]/.test(trimmed);
    const url = isId ? `https://wa.me/message/${trimmed}` : `https://wa.me/${digits}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      toast.error("Nao foi possivel abrir o WhatsApp.");
      return;
    }
    await Linking.openURL(url);
  };

  const newsItems = (newsData?.news || []) as MedusaNews[];
  const featuredNews = newsItems[0];
  const listNewsItems = newsItems.slice(1);
  const banners = (bannerData?.banners || []) as MedusaMarketingBanner[];
  const manufacturers = (manufacturersData?.manufacturers || []) as MedusaManufacturer[];
  const prefersReducedData =
    netInfo.isConnected === false ||
    netInfo.isInternetReachable === false ||
    (netInfo.details && "isConnectionExpensive" in netInfo.details && netInfo.details.isConnectionExpensive === true) ||
    (netInfo.details &&
      "cellularGeneration" in netInfo.details &&
      (netInfo.details.cellularGeneration === "2g" || netInfo.details.cellularGeneration === "3g"));
  const pullRatio = Math.min(pullDistance / pullThreshold, 1);
  const showPullIndicator = refreshing || pullDistance > 0;
  const indicatorOpacity = refreshing ? 1 : pullRatio;
  const indicatorScale = refreshing ? 1 : 0.85 + 0.15 * pullRatio;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refetchProducts(), refetchNews(), refetchBanners()]);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  };

  const isVideo = (url?: string | null) => {
    if (!url) return false;
    return /\.(mp4|mov|webm)$/i.test(url);
  };

  const handleBannerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / bannerSnapInterval);
    setActiveBannerIndex(Math.max(0, Math.min(nextIndex, Math.max(0, banners.length - 1))));
  };

  const pauseBannerAutoplay = () => {
    if (resumeAutoplayTimeoutRef.current) {
      clearTimeout(resumeAutoplayTimeoutRef.current);
      resumeAutoplayTimeoutRef.current = null;
    }
    setIsBannerInteracting(true);
  };

  const scheduleResumeBannerAutoplay = () => {
    if (resumeAutoplayTimeoutRef.current) {
      clearTimeout(resumeAutoplayTimeoutRef.current);
    }
    resumeAutoplayTimeoutRef.current = setTimeout(() => {
      setIsBannerInteracting(false);
      resumeAutoplayTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    setActiveBannerIndex((current) => Math.min(current, Math.max(0, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isBannerInteracting) return;

    const interval = setInterval(() => {
      setActiveBannerIndex((current) => {
        const nextIndex = (current + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({ x: nextIndex * bannerSnapInterval, animated: true });
        return nextIndex;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length, bannerSnapInterval, isBannerInteracting]);

  useEffect(() => {
    return () => {
      if (resumeAutoplayTimeoutRef.current) {
        clearTimeout(resumeAutoplayTimeoutRef.current);
      }
    };
  }, []);

  const resolveBannerAction = async (banner: MedusaMarketingBanner) => {
    if (!banner?.link_type) return;
    if (banner.link_type === "url" && banner.link_value) {
      const canOpen = await Linking.canOpenURL(banner.link_value);
      if (canOpen) await Linking.openURL(banner.link_value);
      return;
    }
    if (banner.link_type === "product" && banner.link_value) {
      navigation.navigate(
        "Produtos" as never,
        { screen: "ProductDetails", params: { id: banner.link_value } } as never
      );
      return;
    }
    if (banner.link_type === "manufacturer" && banner.link_value) {
      navigation.navigate(
        "Produtos" as never,
        { screen: "ProdutosIndex", params: { manufacturerSlug: banner.link_value } } as never
      );
      return;
    }
    if (banner.link_type === "area") {
      switch (banner.link_value) {
        case "home":
          navigation.navigate("Index" as never);
          return;
        case "catalog":
          navigation.navigate("Produtos" as never);
          return;
        case "orders":
          navigation.navigate("Pedidos" as never);
          return;
        case "condos":
          navigation.navigate("Condominios" as never);
          return;
        case "recurrences":
          navigation.navigate("Recorrencias" as never);
          return;
        case "checkout":
          navigation.navigate("Carrinho" as never);
          return;
        case "settings":
          navigation.navigate("Conta" as never);
          return;
        default:
          return;
      }
    }
  };

  return (
    <AuthenticatedLayout>
      {isAddingItem && (
        <View style={styles.processingOverlay} pointerEvents="auto">
          <View style={styles.processingCard}>
            <LoadingSpinner size={64} />
            <Text style={styles.processingTitle}>Adicionando ao carrinho...</Text>
            <Text style={styles.processingSubtitle}>Aguarde um instante.</Text>
          </View>
        </View>
      )}
      <Header subtitle={`Olá, ${user?.name || ""}`.trim()} showCondoSelector />

      <ScrollView
        contentContainerStyle={styles.content}
        stickyHeaderIndices={refreshing ? [0] : undefined}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (offsetY < 0) {
            setPullDistance(-offsetY);
          } else if (pullDistance !== 0) {
            setPullDistance(0);
          }
        }}
        onScrollEndDrag={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (offsetY < -pullThreshold && !refreshing) {
            handleRefresh();
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={[styles.refreshContainer, showPullIndicator && styles.refreshContainerVisible]}>
          <View style={[styles.refreshRow, { opacity: indicatorOpacity, transform: [{ scale: indicatorScale }] }]}>
            <LoadingSpinner size={32} />
            <Text style={styles.refreshText}>
              {refreshing ? "Atualizando..." : pullRatio >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
            </Text>
          </View>
        </View>
        {isLoadingBanners ? (
          <View style={styles.bannerSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRow}>
              {Array.from({ length: 2 }).map((_, index) => (
                <View key={`banner-skeleton-${index}`} style={[styles.bannerCard, { width: bannerCardWidth }]}>
                  <Skeleton style={styles.bannerSkeleton} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : banners.length > 0 ? (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bannerRow}
              snapToInterval={bannerSnapInterval}
              decelerationRate="fast"
              onMomentumScrollEnd={handleBannerMomentumEnd}
              onScrollBeginDrag={pauseBannerAutoplay}
              onScrollEndDrag={scheduleResumeBannerAutoplay}
              scrollEventThrottle={16}
            >
              {banners.map((banner) => {
                const animation = banner.animation_mobile_url || banner.animation_url || "";
                const image = banner.image_mobile_url || banner.image_url || "";
                const fallback = banner.fallback_image_mobile_url || banner.fallback_image_url || image;
                const isVideoMedia = isVideo(animation);
                const shouldUseVideo = isVideoMedia && !prefersReducedData;
                const imageSource = isVideoMedia ? (image || fallback) : animation || image || fallback;
                return (
                  <Pressable
                    key={banner.id}
                    style={[styles.bannerCard, { width: bannerCardWidth }]}
                    onPress={() => resolveBannerAction(banner)}
                    disabled={!banner.link_type}
                  >
                    {shouldUseVideo ? (
                      <Video
                        source={{ uri: animation }}
                        style={styles.bannerMedia}
                        muted
                        repeat
                        resizeMode="cover"
                        poster={fallback || undefined}
                        posterResizeMode="cover"
                      />
                    ) : (
                      <Image source={{ uri: imageSource }} style={styles.bannerMedia} resizeMode="cover" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.bannerPagination}>
                {banners.map((banner, index) => (
                  <View
                    key={`banner-dot-${banner.id}`}
                    style={[styles.bannerDot, activeBannerIndex === index && styles.bannerDotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrap}>
                <Package color="#8C98A8" size={16} />
              </View>
              <Text style={styles.metricLabel}>Pedidos</Text>
            </View>
            <Text style={styles.metricValue}>12</Text>
            <Text style={styles.metricHint}>Este mês</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapAccent}>
                <TrendingUp color="#5DA2E6" size={16} />
              </View>
              <Text style={styles.metricLabel}>Economia</Text>
            </View>
            <Text style={styles.metricValue}>R$ 430</Text>
            <Text style={styles.metricHint}>Cashback disponível</Text>
          </View>
        </View>

        <View style={styles.pointsCard}>
          <View style={styles.pointsIconWrap}>
            <Star color="#F8C25C" size={18} />
          </View>
          <View style={styles.pointsContent}>
            <Text style={styles.pointsLabel}>{`${terms.pointsLabel} ${terms.articleSingular} ${terms.labelLower}`}</Text>
            <Text style={styles.pointsValue}>{activeCondo?.pointsBalance ?? 0}</Text>
          </View>
        </View>

        {manufacturers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fabricantes</Text>
              <Pressable onPress={() => navigation.navigate("Produtos" as never)} style={styles.linkRow}>
                <Text style={styles.linkText}>Ver catálogo</Text>
                <ArrowRight color="#8C98A8" size={14} />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.manufacturersRow}
            >
              {manufacturers.map((manufacturer) => (
                <Pressable
                  key={manufacturer.id}
                  style={styles.manufacturerCard}
                  onPress={() =>
                    navigation.navigate(
                      "Produtos" as never,
                      { screen: "ProdutosIndex", params: { manufacturerSlug: manufacturer.slug } } as never
                    )
                  }
                >
                  <View style={styles.manufacturerImageWrap}>
                    {manufacturer.image_url ? (
                      <Image source={{ uri: manufacturer.image_url }} style={styles.manufacturerImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.manufacturerImageFallback}>Sem imagem</Text>
                    )}
                  </View>
                  <Text style={styles.manufacturerName} numberOfLines={2}>
                    {manufacturer.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Newspaper color="#8C98A8" size={18} />
              <Text style={styles.sectionTitle}>Notícias</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Noticias" as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver todas</Text>
              <ArrowRight color="#8C98A8" size={14} />
            </Pressable>
          </View>

          {isLoadingNews ? (
            <View style={styles.listGap}>
              {Array.from({ length: 3 }).map((_, index) => (
                <View key={`news-skeleton-${index}`} style={styles.newsSkeletonCard}>
                  <Skeleton style={styles.newsSkeletonImage} />
                  <View style={styles.newsSkeletonContent}>
                    <Skeleton style={styles.newsSkeletonLine} />
                    <Skeleton style={styles.newsSkeletonLine} />
                    <Skeleton style={styles.newsSkeletonLineShort} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {featuredNews && (
                <NewsCard
                  title={featuredNews.title}
                  summary={featuredNews.summary}
                  source={featuredNews.source || featuredNews.author || "Chroma"}
                  date={formatNewsDate(featuredNews.published_at)}
                  image={featuredNews.image_url || undefined}
                  isHighlight
                  onClick={() =>
                    navigation.navigate("NoticiaDetalhes" as never, { id: featuredNews.id } as never)
                  }
                />
              )}
              <View style={styles.listGap}>
                {listNewsItems.map((item) => (
                  <NewsCard
                    key={item.id}
                    title={item.title}
                    summary={item.summary}
                    source={item.source || item.author || "Chroma"}
                    date={formatNewsDate(item.published_at)}
                    image={item.image_url || undefined}
                    onClick={() => navigation.navigate("NoticiaDetalhes" as never, { id: item.id } as never)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Destaques de promoções</Text>
            <Pressable onPress={() => navigation.navigate("Produtos" as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver todos</Text>
              <ArrowRight color="#8C98A8" size={14} />
            </Pressable>
          </View>

          {isLoadingProducts ? (
            <View style={styles.productRow}>
              {Array.from({ length: 2 }).map((_, index) => (
                <View key={`promo-skeleton-${index}`} style={[styles.productSkeletonCard, { width: productCardWidth }]}>
                  <Skeleton style={styles.productSkeletonImage} />
                  <Skeleton style={styles.productSkeletonLine} />
                  <Skeleton style={styles.productSkeletonLineShort} />
                </View>
              ))}
            </View>
          ) : promotionHighlights.length > 0 ? (
            <View style={styles.productRow}>
              {promotionHighlights.map((product) => (
                <ProductCard
                  key={`promo-${product.id}`}
                  {...product}
                  style={{ width: productCardWidth }}
                  onPress={() =>
                    navigation.navigate(
                      "Produtos" as never,
                      { screen: "ProductDetails", params: { id: product.id } } as never
                    )
                  }
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptySectionText}>Sem promoções ativas no momento.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos em destaque</Text>
            <Pressable onPress={() => navigation.navigate("Produtos" as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver todos</Text>
              <ArrowRight color="#8C98A8" size={14} />
            </Pressable>
          </View>

          <View style={styles.productRow}>
            {isLoadingProducts
              ? Array.from({ length: 2 }).map((_, index) => (
                  <View key={`product-skeleton-${index}`} style={[styles.productSkeletonCard, { width: productCardWidth }]}>
                    <Skeleton style={styles.productSkeletonImage} />
                    <Skeleton style={styles.productSkeletonLine} />
                    <Skeleton style={styles.productSkeletonLineShort} />
                  </View>
                ))
              : featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    style={{ width: productCardWidth }}
                    onPress={() =>
                      navigation.navigate(
                        "Produtos" as never,
                        { screen: "ProductDetails", params: { id: product.id } } as never
                      )
                    }
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ajuda rapida</Text>
          </View>
          <Pressable onPress={openWhatsapp} style={styles.helpCard}>
            <View style={styles.helpIconWrap}>
              <MessageCircle color="#5DA2E6" size={18} />
            </View>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Falar com a Chroma</Text>
              <Text style={styles.helpSubtitle}>Atendimento via WhatsApp</Text>
            </View>
            <ArrowRight color="#8C98A8" size={16} />
          </Pressable>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 16,
  },
  bannerSection: {
    marginBottom: 16,
  },
  bannerSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  refreshRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(11, 15, 20, 0.8)",
    borderRadius: 16,
    alignSelf: "center",
  },
  refreshContainer: {
    height: 0,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  refreshContainerVisible: {
    height: 68,
    marginBottom: 12,
    marginTop: -14,
  },
  refreshText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  bannerRow: {
    gap: 14,
    paddingVertical: 8,
  },
  bannerCard: {
    width: 300,
    height: 180,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
    backgroundColor: "rgba(24, 28, 36, 0.95)",
  },
  bannerPagination: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(140, 152, 168, 0.45)",
  },
  bannerDotActive: {
    width: 20,
    backgroundColor: "#E6E8EA",
  },
  bannerMedia: {
    width: "100%",
    height: "100%",
  },
  manufacturersRow: {
    gap: 12,
    paddingVertical: 4,
  },
  manufacturerCard: {
    width: 138,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    padding: 10,
    gap: 8,
  },
  manufacturerImageWrap: {
    width: "100%",
    height: 82,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(140, 152, 168, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  manufacturerImage: {
    width: "100%",
    height: "100%",
  },
  manufacturerImageFallback: {
    color: "#8C98A8",
    fontSize: 11,
  },
  manufacturerName: {
    color: "#E6E8EA",
    fontSize: 12,
    fontWeight: "600",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(6, 10, 14, 0.35)",
  },
  bannerContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  bannerTitle: {
    color: "#F7F8FA",
    fontSize: 18,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "rgba(230, 232, 234, 0.85)",
    fontSize: 12,
    marginTop: 6,
  },
  bannerHint: {
    color: "rgba(230, 232, 234, 0.7)",
    fontSize: 10,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(141, 152, 168, 0.15)",
  },
  metricIconWrapAccent: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93, 162, 230, 0.18)",
  },
  metricLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  metricValue: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
  },
  metricHint: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 6,
  },
  pointsCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  pointsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 194, 92, 0.18)",
  },
  pointsContent: {
    flex: 1,
  },
  pointsLabel: {
    color: "#8C98A8",
    fontSize: 12,
  },
  pointsValue: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  listGap: {
    marginTop: 12,
    gap: 12,
  },
  newsSkeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  newsSkeletonImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
  },
  newsSkeletonContent: {
    gap: 8,
  },
  newsSkeletonLine: {
    height: 12,
    borderRadius: 8,
  },
  newsSkeletonLineShort: {
    height: 12,
    width: "55%",
    borderRadius: 8,
  },
  productSkeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  productSkeletonImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  productSkeletonLine: {
    height: 12,
    borderRadius: 8,
  },
  productSkeletonLineShort: {
    height: 10,
    width: "60%",
    borderRadius: 8,
  },
  productRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptySectionText: {
    color: "#8C98A8",
    fontSize: 13,
    paddingVertical: 8,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  helpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93, 162, 230, 0.18)",
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  helpSubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 10, 16, 0.7)",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  processingCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(24, 28, 36, 0.98)",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.4)",
    alignItems: "center",
    gap: 10,
  },
  processingTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  processingSubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    textAlign: "center",
  },
});
