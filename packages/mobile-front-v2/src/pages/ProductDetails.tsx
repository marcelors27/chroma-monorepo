import { useState, useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View, Linking } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Heart, Minus, Plus, Share2, Star, Maximize2, ChevronLeft, ChevronRight, RefreshCw, Play } from "lucide-react-native";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { FullscreenGallery } from "@/components/ui/FullscreenGallery";
import { toast } from "@/lib/toast";
import { useFavorites } from "@/hooks/useFavorites";
import { useShare } from "@/hooks/useShare";

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
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground">Produto não encontrado</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  const handleAddToCart = () => {
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`);
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
      <View className="flex-1">
        <ScrollView className="px-4 pt-2 pb-28">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => navigation.goBack()} className="w-11 h-11 rounded-full bg-secondary items-center justify-center">
              <ArrowLeft color="white" size={18} />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable onPress={handleFavorite} className="w-11 h-11 rounded-full bg-secondary items-center justify-center">
                <Heart color={isFavorite(product.id) ? "hsl(0 72% 51%)" : "white"} size={18} />
              </Pressable>
              <Pressable onPress={handleShare} className="w-11 h-11 rounded-full bg-secondary items-center justify-center">
                <Share2 color="white" size={18} />
              </Pressable>
            </View>
          </View>

          <View className="-mx-4">
            <View className="relative">
              {resolveMediaThumbnail(currentItem) ? (
                <Pressable
                  onPress={() => {
                    handleOpenMedia(currentItem, galleryIndex);
                  }}
                  className="w-full h-96"
                >
                  <Image source={{ uri: resolveMediaThumbnail(currentItem)! }} className="w-full h-96" />
                </Pressable>
              ) : (
                <View className="w-full h-96 bg-secondary items-center justify-center">
                  <Text className="text-muted-foreground">Prévia indisponível</Text>
                </View>
              )}
              {currentItem.type !== "image" && (
                <View className="absolute inset-0 items-center justify-center">
                  <Pressable
                    onPress={() => handleOpenMedia(currentItem, galleryIndex)}
                    className="w-14 h-14 rounded-full bg-secondary items-center justify-center"
                  >
                    <Play color="#FFFFFF" size={22} />
                  </Pressable>
                </View>
              )}
              {discount > 0 && (
                <View className="absolute left-4 top-4 px-4 py-2 rounded-full bg-primary">
                  <Text className="text-primary-foreground font-semibold">-{discount}%</Text>
                </View>
              )}
              <Pressable
                onPress={() => {
                  handleOpenMedia(currentItem, galleryIndex);
                }}
                className="absolute right-4 top-4 w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Maximize2 color="#FFFFFF" size={18} />
              </Pressable>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.max(0, prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <ChevronLeft color="#FFFFFF" size={20} />
              </Pressable>
              <Pressable
                onPress={() => setGalleryIndex((prev) => Math.min(product.media.length - 1, prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <ChevronRight color="#FFFFFF" size={20} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-4">
              <View className="flex-row gap-3">
                {product.media.map((item, index) => (
                  <Pressable
                    key={`${item.url}-${index}`}
                    onPress={() => {
                      handleOpenMedia(item, index);
                    }}
                    className={`rounded-2xl border ${galleryIndex === index ? "border-primary" : "border-transparent"}`}
                  >
                    {resolveMediaThumbnail(item) ? (
                      <View className="relative">
                        <Image source={{ uri: resolveMediaThumbnail(item)! }} className="w-16 h-16 rounded-2xl" />
                        {item.type !== "image" && (
                          <View className="absolute inset-0 items-center justify-center">
                            <View className="w-7 h-7 rounded-full bg-secondary items-center justify-center">
                              <Play color="#E6E8EA" size={14} />
                            </View>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="w-16 h-16 rounded-2xl bg-secondary items-center justify-center">
                        <Text className="text-xs text-muted-foreground">Mídia</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="mt-2">
            <Text className="text-sm text-muted-foreground">{product.category}</Text>
            <Text className="text-2xl font-bold text-foreground mt-1">{product.name}</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="flex-row items-center gap-1">
                {ratingStars.map((value) => (
                  <Star
                    key={`star-${value}`}
                    color={value <= Math.round(product.rating) ? "hsl(210 70% 60%)" : "hsl(215 10% 40%)"}
                    fill={value <= Math.round(product.rating) ? "hsl(210 70% 60%)" : "transparent"}
                    size={16}
                  />
                ))}
              </View>
              <Text className="text-base text-foreground">{product.rating}</Text>
              <Text className="text-sm text-muted-foreground">({product.reviewCount} avaliações)</Text>
            </View>
            <View className="flex-row items-end gap-4 mt-3">
              <Text className="text-3xl font-bold text-accent">
                R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
              {product.originalPrice && (
                <Text className="text-lg text-muted-foreground line-through">
                  R$ {product.originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-lg font-semibold text-foreground mb-2">Descrição</Text>
            <Text className="text-base text-muted-foreground leading-6">{product.fullDescription}</Text>
          </View>

          <View className="mt-6">
            <Text className="text-lg font-semibold text-foreground mb-2">Características</Text>
            <View className="gap-2">
              {product.features.map((feature) => (
                <View key={feature} className="flex-row items-start gap-2">
                  <View className="w-2 h-2 rounded-full bg-accent mt-2" />
                  <Text className="text-base text-muted-foreground flex-1">{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Avaliações</Text>
            <Pressable>
              <Text className="text-base text-accent">Ver todas</Text>
            </Pressable>
          </View>

          <View className="mt-4 gap-4">
            {reviews.map((review) => (
              <View key={review.id} className="bg-card rounded-3xl p-4 border border-border">
                <View className="flex-row items-start gap-3">
                  <Image source={{ uri: review.avatar }} className="w-12 h-12 rounded-full" />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-foreground">{review.name}</Text>
                      <Text className="text-xs text-muted-foreground">{review.date}</Text>
                    </View>
                    <View className="flex-row items-center gap-1 mt-1">
                      {ratingStars.map((value) => (
                        <Star
                          key={`${review.id}-star-${value}`}
                          color={value <= review.rating ? "hsl(210 70% 60%)" : "hsl(215 10% 40%)"}
                          fill={value <= review.rating ? "hsl(210 70% 60%)" : "transparent"}
                          size={14}
                        />
                      ))}
                    </View>
                    <Text className="text-sm text-muted-foreground mt-2 leading-5">{review.text}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className="absolute left-0 right-0 bottom-0 px-4 py-3 bg-card border-t border-border">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center bg-secondary rounded-2xl px-3 py-2 flex-1">
              <Pressable
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="w-9 h-9 rounded-xl bg-background items-center justify-center"
              >
                <Minus color="white" size={16} />
              </Pressable>
              <Text className="flex-1 text-center text-base font-semibold text-foreground">{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((prev) => prev + 1)}
                className="w-9 h-9 rounded-xl bg-background items-center justify-center"
              >
                <Plus color="white" size={16} />
              </Pressable>
            </View>
            <Pressable onPress={handleAddToCart} className="flex-1 py-4 rounded-2xl bg-accent flex-row items-center justify-center gap-2">
              <Text className="text-accent-foreground text-base font-semibold">Adicionar</Text>
            </Pressable>
            <Pressable className="w-12 h-12 rounded-2xl bg-secondary items-center justify-center">
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
