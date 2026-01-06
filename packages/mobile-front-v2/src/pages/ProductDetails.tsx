import { useState, useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Heart, Minus, Plus, Share2, Star, Maximize2, ChevronLeft, ChevronRight, RefreshCw, Play } from "lucide-react-native";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { FullscreenGallery } from "@/components/ui/FullscreenGallery";
import { toast } from "@/lib/toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useShare } from "@/hooks/useShare";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";

type MediaItem = {
  type: "image" | "video" | "youtube" | "vimeo";
  url: string;
  thumbnail?: string;
};

const mockProducts: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    fullDescription: string;
    price: number;
    originalPrice?: number;
    media: MediaItem[];
    category: string;
    rating: number;
    reviewCount: number;
    features: string[];
  }
> = {
  "1": {
    id: "1",
    name: "Kit Limpeza Profissional",
    description: "Conjunto completo para limpeza de áreas comuns",
    fullDescription:
      "O Kit Limpeza Profissional é a solução completa para manter as áreas comuns do seu condomínio impecáveis. Inclui produtos de alta qualidade desenvolvidos especialmente para uso profissional, garantindo resultados superiores com menor esforço. Ideal para síndicos que buscam eficiência e economia.",
    price: 189.9,
    originalPrice: 249.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80" },
      {
        type: "youtube",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      },
      {
        type: "vimeo",
        url: "https://vimeo.com/76979871",
      },
      {
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnail: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&auto=format&fit=crop&q=80",
      },
    ],
    category: "Limpeza",
    rating: 4.8,
    reviewCount: 127,
    features: [
      "5 produtos concentrados de alta performance",
      "Rende até 3x mais que produtos comuns",
      "Biodegradável e seguro para pets",
      "Acompanha dosador profissional",
      "Fragrância duradoura",
    ],
  },
  "2": {
    id: "2",
    name: "Câmera de Segurança HD",
    description: "Monitoramento 24h com visão noturna",
    fullDescription:
      "A Câmera de Segurança HD oferece monitoramento profissional 24 horas por dia com visão noturna.",
    price: 299.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80" },
    ],
    category: "Segurança",
    rating: 4.6,
    reviewCount: 82,
    features: ["Full HD 1080p", "Visão noturna", "App mobile", "Instalação rápida"],
  },
  "3": {
    id: "3",
    name: "Aspirador Industrial",
    description: "Alta potência para grandes áreas",
    fullDescription:
      "O Aspirador Industrial entrega alta performance para limpeza de áreas amplas e de grande circulação. Com filtro reforçado e reservatório espaçoso, reduz o tempo de operação e melhora a eficiência da equipe.",
    price: 899.9,
    originalPrice: 1199.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80" },
    ],
    category: "Limpeza",
    rating: 4.7,
    reviewCount: 64,
    features: ["Motor de alta sucção", "Filtro HEPA", "Baixo ruído", "Reservatório 30L"],
  },
  "4": {
    id: "4",
    name: "Kit Ferramentas Completo",
    description: "100 peças para manutenção predial",
    fullDescription:
      "Kit completo com 100 peças essenciais para manutenção predial. Ideal para pequenos reparos do dia a dia, com ferramentas resistentes e organizadas em maleta reforçada.",
    price: 459.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1581092921461-eab62e97a2aa?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=1200&auto=format&fit=crop&q=80" },
    ],
    category: "Manutenção",
    rating: 4.5,
    reviewCount: 39,
    features: ["100 peças", "Maleta reforçada", "Aço temperado", "Garantia de 12 meses"],
  },
  "5": {
    id: "5",
    name: "Central de Alarme",
    description: "Sistema de alarme com 8 zonas",
    fullDescription:
      "Central de alarme com 8 zonas configuráveis e integração com sensores de presença. Segurança ampliada para áreas comuns, com painel intuitivo e suporte técnico dedicado.",
    price: 649.9,
    originalPrice: 799.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=1200&auto=format&fit=crop&q=80" },
    ],
    category: "Segurança",
    rating: 4.6,
    reviewCount: 58,
    features: ["8 zonas configuráveis", "App mobile", "Sirene integrada", "Relatórios em tempo real"],
  },
  "6": {
    id: "6",
    name: "Cortador de Grama",
    description: "Motor potente e silencioso",
    fullDescription:
      "Cortador de grama silencioso com motor potente e fácil manuseio. Ideal para áreas verdes do condomínio, com altura ajustável e baixo consumo de energia.",
    price: 1299.9,
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&auto=format&fit=crop&q=80" },
      { type: "image", url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&auto=format&fit=crop&q=80" },
    ],
    category: "Jardim",
    rating: 4.4,
    reviewCount: 27,
    features: ["Altura ajustável", "Baixo ruído", "Coletor de 40L", "Alça ergonômica"],
  },
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

const resolveMediaThumbnail = (item: MediaItem) => {
  if (item.thumbnail) return item.thumbnail;
  if (item.type === "image") return item.url;
  if (item.type === "youtube") {
    const id = getYouTubeId(item.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  if (item.type === "vimeo") {
    const id = getVimeoId(item.url);
    return id ? `https://vumbnail.com/${id}.jpg` : null;
  }
  return null;
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

  const id = (route.params as { id?: string } | undefined)?.id ?? "1";
  const product = mockProducts[id];
  const discount = product?.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const ratingStars = useMemo(
    () => Array.from({ length: 5 }, (_, index) => index + 1),
    []
  );

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

  if (!product) {
    return (
      <AuthenticatedLayout>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Produto não encontrado</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  const handleAddToCart = () => {
    if (!activeCondo) {
      toast.error("Selecione um condomínio antes de adicionar itens ao carrinho.");
      return;
    }
    addItem(quantity);
  };

  const handleFavorite = () => {
    toggleFavorite(product.id);
    toast.success(isFavorite(product.id) ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const handleShare = () => {
    share({ title: product.name, text: product.description, url: product.media[0]?.url });
  };

  const currentItem = product.media[galleryIndex];

  const handleOpenMedia = (item: MediaItem, index: number) => {
    setGalleryIndex(index);
    if (item.type === "image" || item.type === "video" || item.type === "youtube" || item.type === "vimeo") {
      setIsGalleryOpen(true);
      return;
    }
    Linking.openURL(item.url).catch(() => undefined);
  };

  return (
    <AuthenticatedLayout>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.topIconButton}>
              <ArrowLeft color="white" size={18} />
            </Pressable>
            <View style={styles.topActions}>
              <Pressable onPress={handleFavorite} style={styles.topIconButton}>
                <Heart color={isFavorite(product.id) ? "hsl(0 72% 51%)" : "white"} size={18} />
              </Pressable>
              <Pressable onPress={handleShare} style={styles.topIconButton}>
                <Share2 color="white" size={18} />
              </Pressable>
            </View>
          </View>

          <View style={styles.galleryWrap}>
            <View style={styles.galleryMedia}>
              {resolveMediaThumbnail(currentItem) ? (
                <Pressable
                  onPress={() => {
                    handleOpenMedia(currentItem, galleryIndex);
                  }}
                  style={styles.galleryMainPressable}
                >
                  <Image source={{ uri: resolveMediaThumbnail(currentItem)! }} style={styles.galleryMainImage} />
                </Pressable>
              ) : (
                <View style={styles.galleryFallback}>
                  <Text style={styles.galleryFallbackText}>Prévia indisponível</Text>
                </View>
              )}
              {currentItem.type !== "image" && (
                <View style={styles.galleryPlayOverlay}>
                  <Pressable
                    onPress={() => handleOpenMedia(currentItem, galleryIndex)}
                    style={styles.galleryPlayButton}
                  >
                    <Play color="#FFFFFF" size={22} />
                  </Pressable>
                </View>
              )}
              {discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{discount}%</Text>
                </View>
              )}
              <Pressable
                onPress={() => {
                  handleOpenMedia(currentItem, galleryIndex);
                }}
                style={[styles.galleryActionButton, styles.galleryActionTopRight]}
              >
                <Maximize2 color="#FFFFFF" size={18} />
              </Pressable>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.max(0, prev - 1))}
                style={[styles.galleryActionButton, styles.galleryActionLeft]}
              >
                <ChevronLeft color="#FFFFFF" size={20} />
              </Pressable>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.min(product.media.length - 1, prev + 1))}
                style={[styles.galleryActionButton, styles.galleryActionRight]}
              >
                <ChevronRight color="#FFFFFF" size={20} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll} contentContainerStyle={styles.thumbnailRow}>
              <View style={styles.thumbnailRow}>
                {product.media.map((item, index) => (
                  <Pressable
                    key={`${item.url}-${index}`}
                    onPress={() => {
                      handleOpenMedia(item, index);
                    }}
                    style={[
                      styles.thumbnailCard,
                      galleryIndex === index ? styles.thumbnailCardActive : styles.thumbnailCardIdle,
                    ]}
                  >
                    {resolveMediaThumbnail(item) ? (
                      <View style={styles.thumbnailMedia}>
                        <Image source={{ uri: resolveMediaThumbnail(item)! }} style={styles.thumbnailImage} />
                        {item.type !== "image" && (
                          <View style={styles.thumbnailPlayOverlay}>
                            <View style={styles.thumbnailPlayBadge}>
                              <Play color="#E6E8EA" size={14} />
                            </View>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.thumbnailFallback}>
                        <Text style={styles.thumbnailFallbackText}>Mídia</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.details}>
            <Text style={styles.categoryText}>{product.category}</Text>
            <Text style={styles.productTitle}>{product.name}</Text>
            <View style={styles.ratingRow}>
              <View style={styles.ratingStars}>
                {ratingStars.map((value) => (
                  <Star
                    key={`star-${value}`}
                    color={value <= Math.round(product.rating) ? "hsl(210 70% 60%)" : "hsl(215 10% 40%)"}
                    fill={value <= Math.round(product.rating) ? "hsl(210 70% 60%)" : "transparent"}
                    size={16}
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>{product.rating}</Text>
              <Text style={styles.ratingCount}>({product.reviewCount} avaliações)</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrent}>
                R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
              {product.originalPrice && (
                <Text style={styles.priceOriginal}>
                  R$ {product.originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.sectionBody}>{product.fullDescription}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Características</Text>
            <View style={styles.featureList}>
              {product.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            <Pressable>
              <Text style={styles.reviewLink}>Ver todas</Text>
            </Pressable>
          </View>

          <View style={styles.reviewList}>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                  <View style={styles.reviewBody}>
                    <View style={styles.reviewHeaderRow}>
                      <Text style={styles.reviewName}>{review.name}</Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {ratingStars.map((value) => (
                        <Star
                          key={`${review.id}-star-${value}`}
                          color={value <= review.rating ? "hsl(210 70% 60%)" : "hsl(215 10% 40%)"}
                          fill={value <= review.rating ? "hsl(210 70% 60%)" : "transparent"}
                          size={14}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewText}>{review.text}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomBarRow}>
            <View style={styles.quantityPill}>
              <Pressable
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                style={styles.quantityButton}
              >
                <Minus color="white" size={16} />
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((prev) => prev + 1)}
                style={styles.quantityButton}
              >
                <Plus color="white" size={16} />
              </Pressable>
            </View>
            <Pressable onPress={handleAddToCart} style={styles.addButton}>
              <Text style={styles.addButtonText}>Adicionar</Text>
            </Pressable>
            <Pressable style={styles.refreshButton}>
              <RefreshCw color="#E6E8EA" size={18} />
            </Pressable>
          </View>
        </View>
      </View>

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
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 112,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  topIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryWrap: {
    marginHorizontal: -16,
  },
  galleryMedia: {
    position: "relative",
  },
  galleryMainPressable: {
    width: "100%",
    height: 384,
  },
  galleryMainImage: {
    width: "100%",
    height: 384,
  },
  galleryFallback: {
    width: "100%",
    height: 384,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryFallbackText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  galleryPlayOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    left: 16,
    top: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
  },
  discountText: {
    color: "#0B0F14",
    fontWeight: "600",
    fontSize: 12,
  },
  galleryActionButton: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryActionTopRight: {
    right: 16,
    top: 16,
  },
  galleryActionLeft: {
    left: 16,
    top: "50%",
    transform: [{ translateY: -20 }],
  },
  galleryActionRight: {
    right: 16,
    top: "50%",
    transform: [{ translateY: -20 }],
  },
  thumbnailScroll: {
    paddingVertical: 16,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },
  thumbnailCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbnailCardActive: {
    borderColor: "#5DA2E6",
  },
  thumbnailCardIdle: {
    borderColor: "transparent",
  },
  thumbnailMedia: {
    position: "relative",
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  thumbnailPlayOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailPlayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailFallback: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailFallbackText: {
    color: "#8C98A8",
    fontSize: 11,
  },
  details: {
    marginTop: 8,
  },
  categoryText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  productTitle: {
    color: "#E6E8EA",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  ratingStars: {
    flexDirection: "row",
    gap: 4,
  },
  ratingValue: {
    color: "#E6E8EA",
    fontSize: 14,
  },
  ratingCount: {
    color: "#8C98A8",
    fontSize: 13,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  priceCurrent: {
    color: "#5DA2E6",
    fontSize: 28,
    fontWeight: "700",
  },
  priceOriginal: {
    color: "#8C98A8",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionBody: {
    color: "#8C98A8",
    fontSize: 14,
    lineHeight: 22,
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5DA2E6",
    marginTop: 6,
  },
  featureText: {
    color: "#8C98A8",
    fontSize: 14,
    flex: 1,
  },
  reviewHeader: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewLink: {
    color: "#5DA2E6",
    fontSize: 14,
  },
  reviewList: {
    marginTop: 16,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  reviewBody: {
    flex: 1,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewName: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewDate: {
    color: "#8C98A8",
    fontSize: 11,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  reviewText: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.6)",
  },
  bottomBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    gap: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#0B0F14",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    flex: 1,
    textAlign: "center",
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#5DA2E6",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#0B0F14",
    fontSize: 15,
    fontWeight: "600",
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
