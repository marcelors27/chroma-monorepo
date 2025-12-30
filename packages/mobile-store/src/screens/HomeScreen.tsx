import { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useCart } from "../contexts/CartContext";
import { news } from "../data/news";
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

const HomeScreen = () => {
  const navigation = useNavigation<
    CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>
  >();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const { addItem } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["home-products"], queryFn: listProducts });

  const promotions = useMemo(() => {
    const items = data?.products || [];
    return items
      .map((product: MedusaProduct) => {
        const variant = getVariant(product);
        const pricing = getVariantPricing(variant);
        return {
          id: product.id,
          title: product.title,
          description: product.description || "Oferta especial para condominios.",
          originalPrice: pricing.basePrice ?? undefined,
          salePrice: pricing.finalPrice,
          discount: pricing.discountPercent,
          onSale: pricing.onSale,
          image: getProductImage(product),
          variantId: variant?.id,
          category: getProductCategory(product),
        };
      })
      .filter((promo) => promo.onSale)
      .slice(0, 3);
  }, [data]);

  const handleAddToCart = async (promo: (typeof promotions)[0]) => {
    if (!promo?.variantId) {
      showToast({ title: "Produto indisponivel", description: "Nao foi possivel adicionar esta oferta." });
      return;
    }
    await addItem({
      productId: promo.id,
      variantId: promo.variantId,
      name: promo.title,
      price: promo.salePrice,
      category: promo.category,
      image: promo.image || "",
    });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem("home_scroll_offset")
        .then((value) => {
          if (!active || value === null) {
            return;
          }
          const offset = Number(value);
          if (Number.isFinite(offset)) {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ y: offset, animated: false });
            });
          }
        })
        .catch(() => undefined);

      return () => {
        active = false;
        AsyncStorage.setItem("home_scroll_offset", String(scrollOffsetRef.current)).catch(() => undefined);
      };
    }, [])
  );

  return (
    <ScreenBackground source={backgrounds.home}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>Ola, bem-vindo!</Text>
        <Text style={styles.subtitle}>Confira as melhores ofertas e novidades para seu condominio</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promocoes em destaque</Text>
            <Button title="Ver todos" variant="ghost" onPress={() => navigation.navigate("Dashboard")} />
          </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Carregando ofertas...</Text>
          </View>
        )}
          {!isLoading && promotions.length === 0 && (
            <Text style={styles.muted}>Nenhuma oferta disponivel no momento.</Text>
          )}

          {promotions.map((promo) => (
            <View key={promo.id} style={styles.card}>
              {promo.image ? (
                <Image source={{ uri: promo.image }} style={styles.cardImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>Sem imagem</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{promo.title}</Text>
                <Text style={styles.cardText}>{promo.description}</Text>
                <Text style={styles.price}>R$ {promo.salePrice.toFixed(2)}</Text>
                <View style={styles.cardFooter}>
                  <Button title="Adicionar ao carrinho" onPress={() => handleAddToCart(promo)} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Novidades</Text>
          {news.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.newsCard}
              onPress={() => navigation.navigate("NewsDetails", { id: item.id })}
            >
              <Text style={styles.newsTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.summary}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: 160,
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
  cardText: {
    fontSize: 13,
    color: colors.muted,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  cardFooter: {
    marginTop: "auto",
  },
  imagePlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  placeholderText: {
    color: colors.muted,
  },
  newsCard: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  muted: {
    fontSize: 13,
    color: colors.muted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default HomeScreen;
