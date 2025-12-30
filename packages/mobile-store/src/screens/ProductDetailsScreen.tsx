import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Button from "../components/Button";
import ProductReviews from "../components/ProductReviews";
import { colors } from "../theme/colors";
import { useCart } from "../contexts/CartContext";
import { getProductCategory, getProductImage, getVariant, getVariantPricing, retrieveProduct } from "../lib/medusa";
import type { RootStackParamList } from "../navigation/types";

const ProductDetailsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, "ProductDetails">>();
  const { addItem } = useCart();
  const { data, isLoading } = useQuery({
    queryKey: ["product", route.params.id],
    queryFn: () => retrieveProduct(route.params.id),
  });

  const product = data?.product;
  const variant = getVariant(product);
  const pricing = getVariantPricing(variant);
  const image = getProductImage(product);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Carregando produto...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Produto nao encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.muted}>Sem imagem</Text>
        </View>
      )}
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.meta}>Categoria: {getProductCategory(product)}</Text>
      <Text style={styles.price}>R$ {pricing.finalPrice.toFixed(2)}</Text>
      <Text style={styles.description}>{product.description || "Sem descricao."}</Text>
      <Button
        title="Adicionar ao carrinho"
        onPress={() =>
          addItem({
            productId: product.id,
            variantId: variant?.id || "",
            name: product.title,
            price: pricing.finalPrice,
            category: getProductCategory(product),
            image: image || "",
          })
        }
      />
        <ProductReviews productId={product.id} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    backgroundColor: colors.background,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    height: 220,
    backgroundColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  muted: {
    color: colors.muted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProductDetailsScreen;
