import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import fallbackImage from "@/assets/condo-background.jpg";
import { FullscreenGallery } from "@/components/ui/FullscreenGallery";
import { toast } from "@/lib/toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useShare } from "@/hooks/useShare";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  resolveMediaUrl,
  retrieveProduct,
} from "@/lib/medusa";

type MediaItem = {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  thumbnail?: string;
};

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
  const route = useRoute();
  const { share } = useShare();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { activeCondo } = useCondo();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const id = (route.params as { id?: string } | undefined)?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => retrieveProduct(id),
    enabled: Boolean(id),
  });

  const product = useMemo(() => {
    if (!data?.product) return null;
    const raw = data.product;
    const variant = getVariant(raw);
    const pricing = getVariantPricing(variant);
    const images =
      raw.images?.map((img: any) => {
        const url = resolveMediaUrl(img?.url || img?.thumbnail || img);
        return url ? ({ type: "image", url } as MediaItem) : null;
      }).filter(Boolean) || [];
    const fallbackImage = getProductImage(raw);
    const media = images.length
      ? (images as MediaItem[])
      : fallbackImage
        ? ([{ type: "image", url: fallbackImage }] as MediaItem[])
        : [];
    const featuresFromTags = raw.tags?.map((tag) => tag?.value).filter(Boolean) || [];
    return {
      id: raw.id,
      name: raw.title,
      description: raw.description || "Descrição não informada.",
      fullDescription: raw.description || "Descrição não informada.",
      price: pricing.finalPrice,
      originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
      media,
      category: getProductCategory(raw),
      rating: Number(raw.metadata?.rating) || 4.6,
      reviewCount: Number(raw.metadata?.reviewCount) || 0,
      features:
        Array.isArray(raw.metadata?.features)
          ? (raw.metadata?.features as string[])
          : featuresFromTags,
      variantId: variant?.id || "",
    };
  }, [data]);

  const discount = product?.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const ratingStars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);

  const reviews = [
    {
      id: "1",
      name: "Roberto Mendes",
      date: "15/01/2024",
      rating: 5,
      text: "Excelente kit! Os produtos são de ótima qualidade e rendem muito. O condomínio nunca esteve tão limpo.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=60",
    },
    {
      id: "2",
      name: "Ana Paula",
      date: "10/01/2024",
      rating: 4,
      text: "Muito bom custo-benefício. A fragrância é agradável e dura bastante. Só achei a embalagem um pouco grande.",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=60",
    },
    {
      id: "3",
      name: "Carlos Silva",
      date: "05/01/2024",
      rating: 5,
      text: "Já é a terceira vez que compro. Produto confiável e entrega sempre no prazo.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=60",
    },
  ];

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <View style={styles.emptyState}>
          <ActivityIndicator color="#5DA2E6" />
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
      toast.error("Selecione um condomínio antes de adicionar itens ao carrinho.");
      return;
    }
    if (!product.variantId) {
      toast.error("Produto indisponível no momento.");
      return;
    }
    await addItem({
      productId: product.id,
      variantId: product.variantId,
      name: product.name,
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
      <ScrollView style={styles.scrollContent}>
        <View style={styles.mediaHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#E6E8EA" size={20} />
          </Pressable>
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
                  color={star <= Math.round(product.rating) ? "#F0C86E" : "#394050"}
                  size={16}
                  fill={star <= Math.round(product.rating) ? "#F0C86E" : "transparent"}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({product.reviewCount} avaliações)</Text>
          </View>

          <Text style={styles.description}>{product.fullDescription}</Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>
                  R$ {product.originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
            <Pressable onPress={() => toast.info("Funcionalidade em breve")}> 
              <Text style={styles.sectionLink}>Ver todas</Text>
            </Pressable>
          </View>

          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                  <View style={styles.reviewHeaderText}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                </View>
                <View style={styles.reviewStars}>
                  {ratingStars.map((star) => (
                    <Star
                      key={star}
                      color={star <= review.rating ? "#F0C86E" : "#394050"}
                      size={14}
                      fill={star <= review.rating ? "#F0C86E" : "transparent"}
                    />
                  ))}
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
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
  reviewsList: {
    marginTop: 12,
    gap: 12,
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
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
});
