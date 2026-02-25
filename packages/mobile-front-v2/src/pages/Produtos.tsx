import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Search } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ProductCard } from "@/components/ui/ProductCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductFiltersSheet, ProductFilters } from "@/components/ui/ProductFiltersSheet";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listManufacturers,
  listProducts,
  MedusaManufacturer,
  MedusaProduct,
} from "@/lib/medusa";

const MAX_PRICE_FALLBACK = 1500 * 100;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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

export default function Produtos() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedManufacturer, setSelectedManufacturer] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [didInitializeFilters, setDidInitializeFilters] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    priceRange: [0, MAX_PRICE_FALLBACK],
    onlyDiscounted: false,
    sortBy: "relevance",
    inStock: false,
  });
  const { activeCondo, isLoading: isCondoLoading } = useCondo();
  const { addItem, isAddingItem } = useCart();
  const { terms } = useBusinessTerms();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { width } = useWindowDimensions();
  const canLoadProducts = isAuthenticated && !isAuthLoading && !isCondoLoading;
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["products", activeCondo?.id || "all"],
    queryFn: listProducts,
    enabled: canLoadProducts,
    refetchOnMount: "always",
    staleTime: 0,
    retry: 2,
  });
  const { data: manufacturersData } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: () => listManufacturers({ limit: 300 }),
    enabled: canLoadProducts,
  });
  const cardGap = 12;
  const horizontalPadding = 28;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - cardGap) / 2);

  const products = useMemo(() => {
    return (
      data?.products?.map((product: MedusaProduct) => {
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
          manufacturerSlug: String((product.metadata as any)?.manufacturer_slug || ""),
          manufacturerName: String((product.metadata as any)?.manufacturer_name || "Sem fabricante"),
          inStock: (variant?.inventory_quantity ?? 0) > 0,
          variantId: variant?.id || "",
          variantTitle: variant?.title || "",
        };
      }) || []
    );
  }, [data]);

  const maxPrice = useMemo(() => {
    const resolved = products.reduce((max, product) => Math.max(max, product.price), 0);
    if (resolved <= 0) return MAX_PRICE_FALLBACK;
    return Math.ceil(resolved / 100) * 100;
  }, [products]);

  const defaultFilters = useMemo(
    () => ({
      priceRange: [0, maxPrice],
      onlyDiscounted: false,
      sortBy: "relevance",
      inStock: false,
    }),
    [maxPrice]
  );

  const activeFiltersCount = [
    selectedManufacturer !== "all",
    filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
    filters.onlyDiscounted,
    filters.inStock,
    filters.sortBy !== "relevance",
  ].filter(Boolean).length;

  const showInitialLoading = !canLoadProducts || isLoading || (isFetching && !data?.products?.length);

  useEffect(() => {
    if (didInitializeFilters) return;
    if (showInitialLoading) return;
    setFilters(defaultFilters);
    setDidInitializeFilters(true);
  }, [defaultFilters, didInitializeFilters, showInitialLoading]);

  useEffect(() => {
    setFilters((prev) => {
      const [min, currentMax] = prev.priceRange;
      if (currentMax === maxPrice) return prev;
      if (currentMax === MAX_PRICE_FALLBACK || currentMax > maxPrice) {
        return { ...prev, priceRange: [min, maxPrice] };
      }
      return prev;
    });
  }, [maxPrice]);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    products.forEach((product) => {
      if (!product.category) return;
      const id = normalizeText(product.category);
      if (!unique.has(id)) unique.set(id, product.category);
    });
    return [{ id: "all", label: "Todos" }, ...Array.from(unique.entries()).map(([id, label]) => ({ id, label }))];
  }, [products]);

  const manufacturers = useMemo(() => {
    const fromProducts = new Map<string, string>();
    products.forEach((product) => {
      if (!product.manufacturerSlug) return;
      fromProducts.set(product.manufacturerSlug, product.manufacturerName);
    });
    ((manufacturersData?.manufacturers || []) as MedusaManufacturer[]).forEach((item) => {
      if (!item?.slug) return;
      fromProducts.set(String(item.slug), String(item.name || item.slug));
    });

    return [{ id: "all", label: "Todos" }, ...Array.from(fromProducts.entries()).map(([id, label]) => ({ id, label }))];
  }, [products, manufacturersData]);

  useEffect(() => {
    setSelectedCategory((current) => {
      if (current === "all") return current;
      const exists = categories.some((item) => item.id === current);
      return exists ? current : "all";
    });
  }, [categories]);

  useEffect(() => {
    setSelectedManufacturer((current) => {
      if (current === "all") return current;
      const exists = manufacturers.some((item) => item.id === current);
      return exists ? current : "all";
    });
  }, [manufacturers]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || normalizeText(product.category) === normalizeText(selectedCategory);
      const matchesManufacturer =
        selectedManufacturer === "all" || product.manufacturerSlug === selectedManufacturer;
      const matchesSearch =
        normalizeText(product.name).includes(normalizeText(searchQuery)) ||
        normalizeText(product.description).includes(normalizeText(searchQuery));
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
      const matchesDiscount = !filters.onlyDiscounted || product.isOnPromotion;
      const matchesStock = !filters.inStock || product.inStock;
      return matchesCategory && matchesManufacturer && matchesSearch && matchesPrice && matchesDiscount && matchesStock;
    });

    switch (filters.sortBy) {
      case "price_asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "name":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [selectedCategory, selectedManufacturer, searchQuery, filters, products]);

  const handleAddToCart = async (product: (typeof products)[number]) => {
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
      <Header title="Produtos" subtitle="Catálogo" showNotification={false} showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.searchRow}>
          <Search color="hsl(215 15% 55%)" size={18} />
          <View style={styles.searchContainer}>
            <Input
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              backgroundColor="transparent"
              borderWidth={0}
              height={48}
              paddingLeft={12}
              paddingRight={44}
              paddingVertical={0}
              borderRadius={16}
            />
            <View style={styles.searchFilter}>
              <ProductFiltersSheet
                filters={filters}
                onFiltersChange={setFilters}
                maxPrice={maxPrice}
                triggerStyle={styles.filterTrigger}
              />
            </View>
          </View>
        </View>

        {activeFiltersCount > 0 && (
          <View style={styles.filtersRow}>
            <Text style={styles.filtersText}>
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} ativo
              {activeFiltersCount > 1 ? "s" : ""}
            </Text>
            <Pressable
              onPress={() => {
                setFilters(defaultFilters);
                setSelectedCategory("all");
                setSelectedManufacturer("all");
              }}
            >
              <Text style={styles.clearFiltersText}>Limpar</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
            >
              <Text
                style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}
              >
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {manufacturers.map((manufacturer) => (
            <Pressable
              key={manufacturer.id}
              onPress={() => setSelectedManufacturer(manufacturer.id)}
              style={[styles.categoryChip, selectedManufacturer === manufacturer.id && styles.categoryChipActive]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedManufacturer === manufacturer.id && styles.categoryChipTextActive,
                ]}
              >
                {manufacturer.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showInitialLoading ? (
          <View style={styles.productsGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`product-skeleton-${index}`} style={[styles.skeletonCard, { width: cardWidth }]}>
                <Skeleton style={styles.skeletonImage} />
                <Skeleton style={styles.skeletonLine} />
                <Skeleton style={styles.skeletonLineShort} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                style={{ width: cardWidth }}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </View>
        )}

        {!showInitialLoading && filteredProducts.length === 0 && !isError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
          </View>
        )}

        {!showInitialLoading && isError && (
          <Pressable style={styles.emptyState} onPress={() => refetch()}>
            <Text style={styles.emptyText}>Falha ao carregar produtos. Toque para tentar novamente.</Text>
          </Pressable>
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchFilter: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -16 }],
  },
  filterTrigger: {
    width: 32,
    height: 32,
    borderRadius: 12,
  },
  filtersRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filtersText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  clearFiltersText: {
    color: "#5DA2E6",
    fontSize: 13,
    fontWeight: "600",
  },
  categoriesScroll: {
    marginTop: 16,
  },
  categoriesContent: {
    gap: 10,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(24, 28, 36, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.5)",
  },
  categoryChipActive: {
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    borderColor: "rgba(93, 162, 230, 0.5)",
  },
  categoryChipText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: "#E6E8EA",
    fontWeight: "600",
  },
  skeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  skeletonImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 8,
  },
  skeletonLineShort: {
    height: 12,
    width: "60%",
    borderRadius: 8,
  },
  productsGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
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
