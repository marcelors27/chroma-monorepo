import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Plus } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import fallbackImage from "@/assets/condo-background.jpg";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  onAddToCart?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  originalPrice,
  image,
  category,
  onAddToCart,
  style,
}: ProductCardProps) {
  const navigation = useNavigation();
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <Pressable
      onPress={() => navigation.navigate("ProductDetails" as never, { id } as never)}
      style={[styles.card, style]}
    >
      <View style={styles.media}>
        <ImageWithSkeleton source={{ uri: image }} style={styles.mediaImage} defaultSource={fallbackImage} />
        {discount > 0 && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>
              R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>
                R$ {originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => onAddToCart?.()}
            style={styles.addButton}
          >
            <Plus color="#FFFFFF" size={18} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(22, 26, 33, 0.96)",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  media: {
    position: "relative",
    aspectRatio: 1,
    backgroundColor: "rgba(30, 34, 42, 0.9)",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  discountTag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryTag: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(20, 24, 30, 0.92)",
  },
  categoryText: {
    color: "#E6E8EA",
    fontSize: 11,
  },
  body: {
    padding: 14,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    color: "#8C98A8",
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    color: "#5DA2E6",
    fontSize: 18,
    fontWeight: "700",
  },
  originalPrice: {
    color: "#7C8796",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5DA2E6",
  },
});
