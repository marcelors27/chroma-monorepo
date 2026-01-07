import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Search } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductFiltersSheet, ProductFilters } from "@/components/ui/ProductFiltersSheet";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listProducts,
  MedusaProduct,
} from "@/lib/medusa";

const MAX_PRICE_FALLBACK = 1500;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Produtos() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFilters>({
    priceRange: [0, MAX_PRICE_FALLBACK],
    onlyDiscounted: false,
    sortBy: "relevance",
    inStock: false,
  });
  const { activeCondo } = useCondo();
  const { addItem } = useCart();
  const { width } = useWindowDimensions();
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: listProducts });
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
          image: getProductImage(product) || "",
          category: getProductCategory(product),
          inStock: (variant?.inventory_quantity ?? 0) > 0,
          variantId: variant?.id || "",
        };
      }) || []
    );
  }, [data]);

  const maxPrice = useMemo(() => {
    const resolved = products.reduce((max, product) => Math.max(max, product.price), 0);
    return resolved > 0 ? Math.ceil(resolved) : MAX_PRICE_FALLBACK;
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
    filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
    filters.onlyDiscounted,
    filters.inStock,
    filters.sortBy !== "relevance",
  ].filter(Boolean).length;

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

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || normalizeText(product.category) === normalizeText(selectedCategory);
      const matchesSearch =
        normalizeText(product.name).includes(normalizeText(searchQuery)) ||
        normalizeText(product.description).includes(normalizeText(searchQuery));
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
      const matchesDiscount = !filters.onlyDiscounted || product.originalPrice;
      const matchesStock = !filters.inStock || product.inStock;
      return matchesCategory && matchesSearch && matchesPrice && matchesDiscount && matchesStock;
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
  }, [selectedCategory, searchQuery, filters, products]);

  const handleAddToCart = async (product: (typeof products)[number]) => {
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
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <AuthenticatedLayout>
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
            <Pressable onPress={() => setFilters(defaultFilters)}>
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

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#5DA2E6" />
            <Text style={styles.loadingText}>Carregando produtos...</Text>
          </View>
        )}

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

        {!isLoading && filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
          </View>
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
  loadingRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#8C98A8",
    fontSize: 13,
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
});
