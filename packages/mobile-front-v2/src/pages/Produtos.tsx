import { useState, useMemo } from "react";
import { ScrollView, Text, View, Pressable, useWindowDimensions } from "react-native";
import { Search } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductFiltersSheet, ProductFilters } from "@/components/ui/ProductFiltersSheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

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
  },
  {
    id: "2",
    name: "Câmera de Segurança HD",
    description: "Monitoramento 24h com visão noturna",
    price: 299.9,
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=60",
    category: "Segurança",
  },
  {
    id: "3",
    name: "Aspirador Industrial",
    description: "Alta potência para grandes áreas",
    price: 899.9,
    originalPrice: 1199.9,
    image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&auto=format&fit=crop&q=60",
    category: "Limpeza",
  },
  {
    id: "4",
    name: "Kit Ferramentas Completo",
    description: "100 peças para manutenção predial",
    price: 459.9,
    image: "https://images.unsplash.com/photo-1581092921461-eab62e97a2aa?w=400&auto=format&fit=crop&q=60",
    category: "Manutenção",
  },
  {
    id: "5",
    name: "Central de Alarme",
    description: "Sistema de alarme com 8 zonas",
    price: 649.9,
    originalPrice: 799.9,
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=60",
    category: "Segurança",
  },
  {
    id: "6",
    name: "Cortador de Grama",
    description: "Motor potente e silencioso",
    price: 1299.9,
    image: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&auto=format&fit=crop&q=60",
    category: "Jardim",
  },
];

const MAX_PRICE = 1500;

const defaultFilters: ProductFilters = {
  priceRange: [0, MAX_PRICE],
  onlyDiscounted: false,
  sortBy: "relevance",
  inStock: false,
};

export default function Produtos() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const { width } = useWindowDimensions();
  const cardGap = 12;
  const horizontalPadding = 16;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - cardGap) / 2);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category.toLowerCase() === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1];
      const matchesDiscount = !filters.onlyDiscounted || product.originalPrice;
      return matchesCategory && matchesSearch && matchesPrice && matchesDiscount;
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
    toast.success(`${productName} adicionado ao carrinho!`);
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

      <ScrollView className="px-4 py-4">
        <View className="relative">
          <View className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search color="hsl(215 15% 55%)" size={18} />
          </View>
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full h-14 pl-12 pr-14 rounded-2xl bg-card border-border text-foreground"
          />
          <View className="absolute right-3 top-1/2 -translate-y-1/2">
            <ProductFiltersSheet filters={filters} onFiltersChange={setFilters} maxPrice={MAX_PRICE} />
          </View>
        </View>

        {activeFiltersCount > 0 && (
          <View className="flex-row items-center gap-2 mt-3">
            <Text className="text-sm text-muted-foreground">
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} ativo
              {activeFiltersCount > 1 ? "s" : ""}
            </Text>
            <Pressable onPress={() => setFilters(defaultFilters)}>
              <Text className="text-accent">Limpar</Text>
            </Pressable>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-4 px-4">
          <View className="flex-row gap-2">
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full",
                  selectedCategory === category.id ? "bg-primary" : "bg-card",
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    selectedCategory === category.id ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text className="text-sm text-muted-foreground mt-3">
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
          {filteredProducts.length !== 1 ? "s" : ""}
        </Text>

        <View className="flex-row flex-wrap gap-3 mt-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCart={() => handleAddToCart(product.name)}
              style={{ width: cardWidth }}
            />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View className="items-center justify-center py-12">
            <Search color="hsl(215 15% 55%)" size={40} />
            <Text className="font-semibold text-foreground mt-3">Nenhum produto encontrado</Text>
            <Text className="text-sm text-muted-foreground text-center mt-1">
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
          </View>
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}
