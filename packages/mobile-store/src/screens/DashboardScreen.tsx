import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useCart } from "../contexts/CartContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listProducts,
  MedusaProduct,
} from "../lib/medusa";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { showToast } from "../hooks/useToast";

const DashboardScreen = () => {
  const navigation = useNavigation<
    CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>
  >();
  const { addItem } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const { width } = useWindowDimensions();

  const [searchName, setSearchName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [cardSize, setCardSize] = useState<"compact" | "comfortable" | "large">("compact");
  const cardGap = 12;
  const contentWidth = Math.max(width - 40, 0);
  const minCardWidth = cardSize === "large" ? 220 : cardSize === "comfortable" ? 140 : 96;
  const maxColumns = cardSize === "compact" ? 3 : cardSize === "comfortable" ? 2 : 1;
  const columnCount = Math.min(
    maxColumns,
    Math.max(1, Math.floor((contentWidth + cardGap) / (minCardWidth + cardGap)))
  );
  const cardWidth = Math.floor((contentWidth - cardGap * (columnCount - 1)) / columnCount);
  const imageHeight = Math.max(140, Math.round(cardWidth * 0.6));
  const isCompactCard = cardWidth < 260;
  const listRef = useRef<FlatList<any>>(null);
  const scrollOffsetRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem("dashboard_scroll_offset")
        .then((value) => {
          if (!active || value === null) {
            return;
          }
          const offset = Number(value);
          if (Number.isFinite(offset)) {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({ offset, animated: false });
            });
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
        AsyncStorage.setItem("dashboard_scroll_offset", String(scrollOffsetRef.current)).catch(() => undefined);
      };
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem("dashboard_card_size")
      .then((value) => {
        if (value === "compact" || value === "comfortable" || value === "large") {
          setCardSize(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleCardSizeChange = (size: "compact" | "comfortable" | "large") => {
    setCardSize(size);
    AsyncStorage.setItem("dashboard_card_size", size).catch(() => undefined);
  };

  const products = useMemo(() => {
    return (
      data?.products?.map((product: MedusaProduct) => {
        const variant = getVariant(product);
        const pricing = getVariantPricing(variant);
        return {
          id: product.id,
          name: product.title,
          price: pricing.finalPrice,
          category: getProductCategory(product),
          image: getProductImage(product),
          onSale: pricing.onSale,
          originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
          variantId: variant?.id,
        };
      }) || []
    );
  }, [data]);

  const categories = useMemo(() => {
    const uniques = new Set<string>();
    products.forEach((p) => uniques.add(p.category || "Geral"));
    return ["Todos", ...Array.from(uniques)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesName = product.name.toLowerCase().includes(searchName.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
      return matchesName && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.price - b.price;
    });
  }, [products, searchName, selectedCategory, sortBy]);

  const listHeader = (
    <View>
      <Text style={styles.title}>Produtos</Text>
      <Text style={styles.subtitle}>Explore o catalogo e adicione itens ao carrinho</Text>

      <TextField label="Buscar" value={searchName} onChangeText={setSearchName} placeholder="Nome do produto" />

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Categoria</Text>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === item && styles.categoryChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Ordenar</Text>
        <View style={styles.sortButtons}>
          <Button title="Nome" variant={sortBy === "name" ? "primary" : "outline"} onPress={() => setSortBy("name")} />
          <Button title="Preco" variant={sortBy === "price" ? "primary" : "outline"} onPress={() => setSortBy("price")} />
        </View>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Tamanho dos cards</Text>
        <View style={styles.sizeOptions}>
          {[
            { id: "compact", label: "Compacto" },
            { id: "comfortable", label: "Normal" },
            { id: "large", label: "Grande" },
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.sizeChip, cardSize === option.id && styles.sizeChipActive]}
              onPress={() => handleCardSizeChange(option.id as "compact" | "comfortable" | "large")}
            >
              <Text style={[styles.sizeChipText, cardSize === option.id && styles.sizeChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScreenBackground source={backgrounds.dashboard}>
      <FlatList
        ref={listRef}
        data={filteredProducts}
        key={columnCount}
        numColumns={columnCount}
        contentContainerStyle={styles.container}
        columnWrapperStyle={columnCount > 1 ? styles.gridRow : undefined}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.loadingColumn}>
            {isLoading && <ActivityIndicator color={colors.primary} />}
            <Text style={styles.muted}>
              {isLoading ? "Carregando produtos..." : "Nenhum produto encontrado."}
            </Text>
          </View>
        }
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              columnCount === 1 ? styles.cardFull : { width: cardWidth },
              { marginBottom: cardGap },
            ]}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={[styles.cardImage, { height: imageHeight }]} />
            ) : (
              <View style={[styles.imagePlaceholder, { height: imageHeight }]}>
                <Text style={styles.placeholderText}>Sem imagem</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>R$ {item.price.toFixed(2)}</Text>
              <View style={[styles.cardActions, isCompactCard && styles.cardActionsCompact]}>
                <Button
                  title="Detalhes"
                  variant="outline"
                  style={[styles.cardButton, isCompactCard && styles.cardButtonCompact]}
                  onPress={() => navigation.navigate("ProductDetails", { id: item.id })}
                />
                <Button
                  title="Adicionar"
                  style={[styles.cardButton, isCompactCard && styles.cardButtonCompact]}
                  onPress={() => {
                    if (!item.variantId) {
                      showToast({ title: "Produto indisponivel", description: "Nao ha variante disponivel." });
                      return;
                    }
                    addItem({
                      productId: item.id,
                      variantId: item.variantId,
                      name: item.name,
                      price: item.price,
                      category: item.category,
                      image: item.image || "",
                    });
                  }}
                />
              </View>
            </View>
          </View>
        )}
      />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  categoryList: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sizeOptions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sizeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizeChipText: {
    color: colors.text,
    fontSize: 12,
  },
  sizeChipTextActive: {
    color: "#FFFFFF",
  },
  gridRow: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardFull: {
    width: "100%",
  },
  cardImage: {
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  placeholderText: {
    color: colors.muted,
  },
  cardBody: {
    padding: 16,
    gap: 8,
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: "auto",
  },
  cardActionsCompact: {
    flexDirection: "column",
  },
  cardButton: {
    flex: 1,
  },
  cardButtonCompact: {
    width: "100%",
  },
  muted: {
    color: colors.muted,
  },
  loadingColumn: {
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
});

export default DashboardScreen;
