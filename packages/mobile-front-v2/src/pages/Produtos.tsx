import { useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Search } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductFiltersSheet, ProductFilters } from "@/components/ui/ProductFiltersSheet";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";

const categories = [
  { id: "all", label: "Todos" },
  { id: "limpeza", label: "Limpeza" },
  { id: "seguranca", label: "Segurança" },
  { id: "manutencao", label: "Manutenção" },
  { id: "escritorio", label: "Escritório" },
  { id: "jardim", label: "Jardim" },
];

const products = [
  {
    id: "1",
    name: "Kit Limpeza Profissional",
    description: "Conjunto completo para limpeza de áreas comuns",
    price: 189.9,
    originalPrice: 249.9,
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&auto=format&fit=crop&q=60",
    category: "Limpeza",
    inStock: true,
  },
  {
    id: "2",
    name: "Câmera de Segurança HD",
    description: "Monitoramento 24h com visão noturna",
    price: 299.9,
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=60",
    category: "Segurança",
    inStock: true,
  },
  {
    id: "3",
    name: "Aspirador Industrial",
    description: "Alta potência para grandes áreas",
    price: 899.9,
    originalPrice: 1199.9,
    image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&auto=format&fit=crop&q=60",
    category: "Limpeza",
    inStock: false,
  },
  {
    id: "4",
    name: "Kit Ferramentas Completo",
    description: "100 peças para manutenção predial",
    price: 459.9,
    image: "https://images.unsplash.com/photo-1581092921461-eab62e97a2aa?w=400&auto=format&fit=crop&q=60",
    category: "Manutenção",
    inStock: true,
  },
  {
    id: "5",
    name: "Central de Alarme",
    description: "Sistema de alarme com 8 zonas",
    price: 649.9,
    originalPrice: 799.9,
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=60",
    category: "Segurança",
    inStock: true,
  },
  {
    id: "6",
    name: "Cortador de Grama",
    description: "Motor potente e silencioso",
    price: 1299.9,
    image: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&auto=format&fit=crop&q=60",
    category: "Jardim",
    inStock: false,
  },
];

const MAX_PRICE = 1500;

const defaultFilters: ProductFilters = {
  priceRange: [0, MAX_PRICE],
  onlyDiscounted: false,
  sortBy: "relevance",
  inStock: false,
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Produtos() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const { activeCondo } = useCondo();
  const { addItem } = useCart();
  const { width } = useWindowDimensions();
  const cardGap = 12;
  const horizontalPadding = 28;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - cardGap) / 2);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        normalizeText(product.category) === normalizeText(selectedCategory);
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
  }, [selectedCategory, searchQuery, filters]);

  const handleAddToCart = (productName: string) => {
    if (!activeCondo) {
      toast.error("Selecione um condomínio antes de adicionar itens ao carrinho.");
      return;
    }
    addItem(1);
  };

  const activeFiltersCount = [
    filters.priceRange[0] > 0 || filters.priceRange[1] < MAX_PRICE,
    filters.onlyDiscounted,
    filters.inStock,
    filters.sortBy !== "relevance",
  ].filter(Boolean).length;

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
                maxPrice={MAX_PRICE}
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
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryPill,
                  selectedCategory === category.id ? styles.categoryPillActive : styles.categoryPillIdle,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id ? styles.categoryTextActive : styles.categoryTextIdle,
                  ]}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.resultsText}>
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
          {filteredProducts.length !== 1 ? "s" : ""}
        </Text>

        <View style={styles.grid}>
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCart={() => handleAddToCart(product.name)}
              style={[
                styles.cardWrapper,
                { width: cardWidth, marginRight: index % 2 === 0 ? cardGap : 0 },
              ]}
            />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Search color="hsl(215 15% 55%)" size={40} />
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
          </View>
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
  },
  searchContainer: {
    backgroundColor: "rgba(24, 28, 36, 0.96)",
    borderColor: "rgba(86, 94, 110, 0.75)",
    borderWidth: 1,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    shadowColor: "#0B0F14",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  filtersText: {
    fontSize: 13,
    color: "#8C98A8",
  },
  clearFiltersText: {
    color: "#5DA2E6",
    fontSize: 13,
    fontWeight: "600",
  },
  categoriesScroll: {
    marginTop: 16,
    marginHorizontal: -28,
  },
  categoriesContent: {
    paddingHorizontal: 28,
  },
  searchFilter: {
    position: "absolute",
    right: 8,
  },
  filterTrigger: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(32, 36, 44, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(92, 100, 116, 0.7)",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: "rgba(146, 154, 166, 0.55)",
    borderColor: "rgba(146, 154, 166, 0.6)",
  },
  categoryPillIdle: {
    backgroundColor: "rgba(31, 35, 43, 0.78)",
    borderColor: "rgba(62, 70, 84, 0.7)",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#F3F4F6",
  },
  categoryTextIdle: {
    color: "#8C98A8",
  },
  resultsText: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 12,
  },
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#8C98A8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
