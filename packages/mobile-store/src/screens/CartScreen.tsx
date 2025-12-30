import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import { colors } from "../theme/colors";
import { useCart } from "../contexts/CartContext";

const CartScreen = () => {
  const navigation = useNavigation<
    CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>
  >();
  const { items, totalPrice, updateQuantity, removeItem } = useCart();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Carrinho</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>Seu carrinho esta vazio.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.muted}>R$ {item.price.toFixed(2)}</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                <Text style={styles.qtyText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}>
                <Text style={styles.removeText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={styles.summary}>
        <Text style={styles.total}>Total: R$ {totalPrice.toFixed(2)}</Text>
        <Button title="Ir para checkout" onPress={() => navigation.navigate("Checkout")} />
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  removeButton: {
    marginLeft: "auto",
  },
  removeText: {
    color: colors.danger,
  },
  summary: {
    marginTop: 16,
    gap: 8,
  },
  total: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  muted: {
    color: colors.muted,
  },
});

export default CartScreen;
