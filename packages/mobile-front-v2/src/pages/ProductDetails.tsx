import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Star,
} from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import fallbackImage from "@/assets/condo-background.jpg";
import { FullscreenGallery } from "@/components/ui/FullscreenGallery";
import { toast } from "@/lib/toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useShare } from "@/hooks/useShare";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  formatMoney,
  listProductReviews,
  createProductReview,
  resolveMediaUrl,
  retrieveProduct,
} from "@/lib/medusa";

type MediaItem = {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  thumbnail?: string;
};

const fallbackImageUrl = Image.resolveAssetSource(fallbackImage).uri;

const getYouTubeId = (url: string) => {
  const match =
    url.match(/[?&]v=([^&]+)/i) ||
    url.match(/youtu\.be\/([^?&]+)/i) ||
    url.match(/youtube\.com\/shorts\/([^?&]+)/i);
  return match?.[1] ?? null;
};

const getVimeoId = (url: string) => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ?? null;
};

export default function ProductDetails() {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack?.() ?? false;
  const route = useRoute();
  const { share } = useShare();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { activeCondo, refreshCondos } = useCondo();
  const { addItem, isAddingItem } = useCart();
  const { terms } = useBusinessTerms();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState("");

  const id = (route.params as { id?: string } | undefined)?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => retrieveProduct(id),
    enabled: Boolean(id),
  });
  const { data: reviewsData, isLoading: isLoadingReviews, refetch: refetchReviews } = useQuery({
    queryKey: ["product-reviews", id, activeCondo?.id || "all"],
    queryFn: () =>
      listProductReviews({
        productId: id,
        companyId: activeCondo?.id || undefined,
        limit: 100,
      }),
    enabled: Boolean(id),
  });

  const rawProduct = data?.product || null;
  const variants = rawProduct?.variants || [];
  const selectedVariant = useMemo(() => {
    if (!variants.length) return undefined;
    if (selectedVariantId) {
      const match = variants.find((item) => item.id === selectedVariantId);
      if (match) return match;
    }
    return variants[0];
  }, [variants, selectedVariantId]);

  const product = useMemo(() => {
    if (!rawProduct) return null;
    const variant = selectedVariant || getVariant(rawProduct);
    const pricing = getVariantPricing(variant);
    const variantImage =
      typeof variant?.metadata === "object"
        ? (variant.metadata as Record<string, unknown>)?.image
        : undefined;
    const images =
      rawProduct.images?.map((img: any) => {
        const url = resolveMediaUrl(img?.url || img?.thumbnail || img);
        return url ? ({ type: "image", url } as MediaItem) : null;
      }).filter(Boolean) || [];
    const productFallbackImage = getProductImage(rawProduct);
    const media: MediaItem[] = [];
    if (variantImage && typeof variantImage === "string") {
      const resolvedVariant = resolveMediaUrl(variantImage);
      if (resolvedVariant) {
        media.push({ type: "image", url: resolvedVariant });
      }
    }
    media.push(...(images as MediaItem[]));
    if (!media.length) {
      media.push({ type: "image", url: productFallbackImage || fallbackImageUrl });
    }
    const featuresFromTags = rawProduct.tags?.map((tag) => tag?.value).filter(Boolean) || [];
    return {
      id: rawProduct.id,
      name: rawProduct.title,
      description: rawProduct.description || "Descrição não informada.",
      fullDescription: rawProduct.description || "Descrição não informada.",
      price: pricing.finalPrice,
      originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
      media,
      category: getProductCategory(rawProduct),
      rating: Number(rawProduct.metadata?.rating) || 0,
      reviewCount: Number(rawProduct.metadata?.reviewCount) || 0,
      features:
        Array.isArray(rawProduct.metadata?.features)
          ? (rawProduct.metadata?.features as string[])
          : featuresFromTags,
      variantId: variant?.id || "",
      variantTitle: variant?.title || "",
    };
  }, [rawProduct, selectedVariant]);

  useEffect(() => {
    if (variants.length && !selectedVariantId) {
      setSelectedVariantId(variants[0].id);
    }
  }, [variants, selectedVariantId]);

  const discount = product?.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const ratingStars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);
  const backendReviews = reviewsData?.reviews || [];
  const eligibility = reviewsData?.eligibility;
  const canReview = Boolean(eligibility?.can_review);
  const pointsPerReview = Number(eligibility?.points_per_review || 0);
  const reviewCount = Number(reviewsData?.summary?.total_count || product?.reviewCount || 0);
  const reviewRating = Number(reviewsData?.summary?.average_rating || product?.rating || 0);

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Produto não encontrado.");
      return createProductReview({
        productId: product.id,
        companyId: activeCondo?.id || undefined,
        rating: newReviewRating,
        comment: newReviewComment.trim(),
      });
    },
    onSuccess: async (result) => {
      const pointsEarned = Number(result?.points?.points_earned || 0);
      setNewReviewRating(0);
      setNewReviewComment("");
      setIsReviewFormOpen(false);
      await Promise.all([refetchReviews(), refreshCondos()]);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", id] });
      toast.success(
        pointsEarned > 0
          ? `Avaliacao enviada. +${pointsEarned} ${terms.pointsLabelLower} para ${activeCondo?.name || terms.labelLower}.`
          : "Avaliacao enviada com sucesso."
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || "Nao foi possivel enviar a avaliacao.");
    },
  });

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <View style={styles.emptyState}>
          <LoadingSpinner size={72} />
          <Text style={styles.emptyText}>Carregando produto...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!product) {
    return (
      <AuthenticatedLayout>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Produto não encontrado</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  const handleAddToCart = async () => {
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
      image: product.media[0]?.url || "",
      quantity,
    });
  };

  const handleFavorite = () => {
    toggleFavorite(product.id);
    toast.success(isFavorite(product.id) ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const handleShare = () => {
    share({ title: product.name, text: product.description, url: product.media[0]?.url });
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
      <ScrollView style={styles.scrollContent}>
        <View style={styles.mediaHeader}>
          {canGoBack ? (
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color="#E6E8EA" size={20} />
            </Pressable>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <Pressable onPress={handleShare} style={styles.iconButton}>
            <Share2 color="#E6E8EA" size={20} />
          </Pressable>
        </View>

        <View style={styles.mediaWrap}>
          {product.media[galleryIndex]?.type === "image" ? (
            <ImageWithSkeleton
              source={{ uri: product.media[galleryIndex].url }}
              style={styles.mediaImage}
              defaultSource={fallbackImage}
            />
          ) : (
            <Pressable
              onPress={() => setIsGalleryOpen(true)}
              style={[styles.mediaImage, styles.mediaPlaceholder]}
            >
              <Play color="#E6E8EA" size={32} />
            </Pressable>
          )}

          <Pressable onPress={() => setIsGalleryOpen(true)} style={styles.expandButton}>
            <Maximize2 color="#E6E8EA" size={18} />
          </Pressable>

          {product.media.length > 1 && (
            <View style={styles.mediaNav}>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.max(prev - 1, 0))}
                style={styles.mediaNavButton}
              >
                <ChevronLeft color="#E6E8EA" size={18} />
              </Pressable>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.min(prev + 1, product.media.length - 1))}
                style={styles.mediaNavButton}
              >
                <ChevronRight color="#E6E8EA" size={18} />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.subtitle}>{product.category}</Text>
            </View>
            <Pressable onPress={handleFavorite} style={styles.favoriteButton}>
              <Heart color={isFavorite(product.id) ? "#E64646" : "#8C98A8"} size={18} />
            </Pressable>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {ratingStars.map((star) => (
                <Star
                  key={star}
                  color={star <= Math.round(reviewRating) ? "#F0C86E" : "#394050"}
                  size={16}
                  fill={star <= Math.round(reviewRating) ? "#F0C86E" : "transparent"}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{reviewRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount} avaliações)</Text>
          </View>

          <Text style={styles.description}>{product.fullDescription}</Text>

          {variants.length > 1 && (
            <View style={styles.variantRow}>
              <Text style={styles.sectionLabel}>Variação</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantList}>
                {variants.map((item) => {
                  const active = item.id === product.variantId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setSelectedVariantId(item.id);
                        setGalleryIndex(0);
                      }}
                      style={[styles.variantChip, active && styles.variantChipActive]}
                    >
                      <Text style={[styles.variantChipText, active && styles.variantChipTextActive]}>
                        {item.title || "Variação"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>{formatMoney(product.price)}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>
                  {formatMoney(product.originalPrice)}
                </Text>
              )}
            </View>
            {discount > 0 && (
              <View style={styles.discountPill}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>

          <View style={styles.quantityRow}>
            <Text style={styles.sectionLabel}>Quantidade</Text>
            <View style={styles.quantityControls}>
              <Pressable
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                style={styles.quantityButton}
              >
                <Minus color="#C7CBD1" size={16} />
              </Pressable>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((prev) => prev + 1)}
                style={styles.quantityButton}
              >
                <Plus color="#E6E8EA" size={16} />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={handleAddToCart} style={styles.addToCartButton}>
            <Text style={styles.addToCartText}>Adicionar ao carrinho</Text>
          </Pressable>

          {product.features.length > 0 && (
            <View style={styles.featuresCard}>
              <View style={styles.featuresHeader}>
                <RefreshCw color="#8C98A8" size={16} />
                <Text style={styles.featuresTitle}>Destaques do produto</Text>
              </View>
              {product.features.map((feature) => (
                <Text key={feature} style={styles.featureItem}>
                  • {feature}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            <Pressable
              onPress={() => {
                if (!canReview) return;
                setIsReviewFormOpen((prev) => !prev);
              }}
            >
              <Text style={styles.sectionLink}>
                {canReview
                  ? isReviewFormOpen
                    ? "Cancelar"
                    : pointsPerReview > 0
                      ? `Avaliar e ganhar +${pointsPerReview}`
                      : "Avaliar"
                  : "Após compra"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.reviewCalloutCard}>
            <Text style={styles.reviewCalloutTitle}>Sua opinião vale pontos</Text>
            <Text style={styles.reviewCalloutText}>
              {canReview
                ? pointsPerReview > 0
                  ? `Avalie este produto e ganhe +${pointsPerReview} ${terms.pointsLabelLower} para ${activeCondo?.name || terms.labelLower}.`
                  : "Avalie este produto e compartilhe sua experiência."
                : "As avaliações ficam liberadas após a compra concluída deste produto."}
            </Text>
          </View>

          {isReviewFormOpen && canReview && (
            <View style={styles.reviewFormCard}>
              <Text style={styles.reviewFormLabel}>Sua nota</Text>
              <View style={styles.reviewStars}>
                {ratingStars.map((star) => (
                  <Pressable key={`new-rating-${star}`} onPress={() => setNewReviewRating(star)}>
                    <Star
                      color={star <= newReviewRating ? "#F0C86E" : "#394050"}
                      size={18}
                      fill={star <= newReviewRating ? "#F0C86E" : "transparent"}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                multiline
                value={newReviewComment}
                onChangeText={setNewReviewComment}
                placeholder="Conte sua experiência com o produto..."
                placeholderTextColor="#6F7B8B"
                style={styles.reviewInput}
                textAlignVertical="top"
                maxLength={500}
              />
              <Pressable
                onPress={() => {
                  if (newReviewRating < 1 || newReviewComment.trim().length < 5) {
                    toast.error("Preencha nota e comentário (mínimo 5 caracteres).");
                    return;
                  }
                  submitReview.mutate();
                }}
                style={[styles.reviewSubmitButton, submitReview.isPending && styles.reviewSubmitButtonDisabled]}
                disabled={submitReview.isPending}
              >
                <Text style={styles.reviewSubmitButtonText}>
                  {submitReview.isPending ? "Enviando..." : "Enviar avaliação"}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.reviewsList}>
            {isLoadingReviews ? (
              <Text style={styles.emptyReviewsText}>Carregando avaliações...</Text>
            ) : backendReviews.length === 0 ? (
              <Text style={styles.emptyReviewsText}>Nenhuma avaliação ainda. Seja o primeiro a avaliar.</Text>
            ) : (
              backendReviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatarFallback}>
                      <Text style={styles.reviewAvatarFallbackText}>
                        {(review.author_name || "C").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewHeaderText}>
                      <Text style={styles.reviewName}>{review.author_name || "Cliente"}</Text>
                      <Text style={styles.reviewDate}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString("pt-BR") : "Agora"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {ratingStars.map((star) => (
                      <Star
                        key={`${review.id}-${star}`}
                        color={star <= Number(review.rating || 0) ? "#F0C86E" : "#394050"}
                        size={14}
                        fill={star <= Number(review.rating || 0) ? "#F0C86E" : "transparent"}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <FullscreenGallery
        media={product.media}
        initialIndex={galleryIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        productName={product.name}
        getYouTubeId={getYouTubeId}
        getVimeoId={getVimeoId}
      />
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  mediaHeader: {
    position: "absolute",
    zIndex: 2,
    top: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(12, 14, 18, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(12, 14, 18, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrap: {
    height: 320,
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 24, 30, 0.85)",
  },
  mediaNav: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  mediaNavButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(12, 14, 18, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  expandButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(12, 14, 18, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleBlock: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 14,
    marginTop: 6,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(20, 24, 30, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  ratingText: {
    color: "#E6E8EA",
    fontWeight: "600",
  },
  reviewCount: {
    color: "#8C98A8",
    fontSize: 12,
  },
  description: {
    color: "#8C98A8",
    lineHeight: 20,
    marginTop: 16,
  },
  priceRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    color: "#5DA2E6",
    fontSize: 22,
    fontWeight: "700",
  },
  originalPrice: {
    color: "#7C8796",
    fontSize: 13,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  discountPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
  },
  discountText: {
    color: "#5DA2E6",
    fontWeight: "700",
    fontSize: 12,
  },
  quantityRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  variantRow: {
    marginTop: 20,
    gap: 10,
  },
  variantList: {
    gap: 8,
    paddingRight: 8,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(20, 24, 30, 0.85)",
  },
  variantChipActive: {
    borderColor: "rgba(93, 162, 230, 0.6)",
    backgroundColor: "rgba(93, 162, 230, 0.2)",
  },
  variantChipText: {
    color: "#C7CBD1",
    fontSize: 13,
    fontWeight: "600",
  },
  variantChipTextActive: {
    color: "#E6E8EA",
  },
  sectionLabel: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(26, 30, 38, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  addToCartButton: {
    marginTop: 20,
    backgroundColor: "#5DA2E6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  featuresCard: {
    marginTop: 24,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.5)",
  },
  featuresHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  featuresTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  featureItem: {
    color: "#8C98A8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  sectionHeader: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionLink: {
    color: "#5DA2E6",
    fontSize: 13,
  },
  reviewCalloutCard: {
    marginTop: 10,
    backgroundColor: "rgba(248, 194, 92, 0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248, 194, 92, 0.28)",
    padding: 12,
  },
  reviewCalloutTitle: {
    color: "#F8C25C",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewCalloutText: {
    color: "#D9DEE6",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  reviewFormCard: {
    marginTop: 12,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.5)",
    gap: 10,
  },
  reviewFormLabel: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewInput: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.35)",
    backgroundColor: "rgba(20, 24, 30, 0.9)",
    color: "#E6E8EA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewSubmitButton: {
    marginTop: 2,
    backgroundColor: "#5DA2E6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  reviewSubmitButtonDisabled: {
    opacity: 0.65,
  },
  reviewSubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewsList: {
    marginTop: 12,
    gap: 12,
  },
  emptyReviewsText: {
    color: "#8C98A8",
    fontSize: 12,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.5)",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  reviewAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarFallbackText: {
    color: "#CFE5FF",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewName: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewDate: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  reviewText: {
    color: "#8C98A8",
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 12,
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
