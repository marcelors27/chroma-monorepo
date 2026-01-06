import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Image } from "react-native";
import { Minus, Plus, Trash2, QrCode, CreditCard, Receipt, RefreshCw, ChevronRight } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const cartItems = [
  {
    id: "1",
    name: "Kit Limpeza Profissional",
    quantity: 2,
    price: 189.9,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=60",
  },
  {
    id: "2",
    name: "Câmera de Segurança HD",
    quantity: 1,
    price: 299.9,
    image: "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=300&auto=format&fit=crop&q=60",
  },
];

export default function Carrinho() {
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | "boleto">("pix");
  const [selectedRecurrence, setSelectedRecurrence] = useState<"unica" | "semanal" | "quinzenal" | "mensal">("unica");
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formattedTotal = total.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <AuthenticatedLayout>
      <Header title="Carrinho" subtitle={`${cartItems.length} itens`} showNotification={false} showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  R$ {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
                <View style={styles.quantityRow}>
                  <Pressable style={styles.quantityButton}>
                    <Minus color="#C7CBD1" size={16} />
                  </Pressable>
                  <Text style={styles.quantityText}>
                    {item.quantity}
                  </Text>
                  <Pressable style={styles.quantityButton}>
                    <Plus color="#E6E8EA" size={16} />
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => toast.success("Item removido do carrinho")} style={styles.removeButton}>
                <Trash2 color="#E64646" size={20} />
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Forma de pagamento</Text>
        <View style={styles.sectionList}>
          {[
            { id: "pix", title: "Pix", subtitle: "Pagamento instantâneo", icon: QrCode },
            { id: "cartao", title: "Cartão", subtitle: "Crédito ou débito", icon: CreditCard },
            { id: "boleto", title: "Boleto", subtitle: "Vencimento em 3 dias", icon: Receipt },
          ].map((option) => {
            const Icon = option.icon;
            const active = selectedPayment === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedPayment(option.id as "pix" | "cartao" | "boleto")}
                style={styles.paymentCard}
              >
                <View style={styles.paymentIcon}>
                  <Icon color="#8C98A8" size={20} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{option.title}</Text>
                  <Text style={styles.paymentSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.radioOuter, active ? styles.radioOuterActive : styles.radioOuterIdle]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.recurrenceHeader}>
          <RefreshCw color="#8C98A8" size={18} />
          <Text style={styles.sectionTitleText}>Recorrência</Text>
        </View>
        <View style={styles.recurrenceGrid}>
          {[
            { id: "unica", title: "Compra única", subtitle: "Sem recorrência" },
            { id: "semanal", title: "Semanal", subtitle: "Toda semana" },
            { id: "quinzenal", title: "Quinzenal", subtitle: "A cada 2 semanas" },
            { id: "mensal", title: "Mensal", subtitle: "Todo mês" },
          ].map((option) => {
            const active = selectedRecurrence === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  setSelectedRecurrence(option.id as "unica" | "semanal" | "quinzenal" | "mensal")
                }
                style={[styles.recurrenceCard, active ? styles.recurrenceCardActive : styles.recurrenceCardIdle]}
              >
                <Text style={styles.recurrenceTitle}>{option.title}</Text>
                <Text style={styles.recurrenceSubtitle}>{option.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R$ {formattedTotal}</Text>
          </View>
          <View style={styles.summaryDivider}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.summaryLabel}>Grátis</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>R$ {formattedTotal}</Text>
          </View>
          <Pressable
            onPress={() => toast.success("Pedido realizado com sucesso!")}
            style={styles.checkoutButton}
          >
            <Text style={styles.checkoutButtonText}>Finalizar Compra</Text>
            <ChevronRight color="#E6E8EA" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  itemCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  itemPrice: {
    color: "#8C98A8",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  removeButton: {
    padding: 8,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  sectionList: {
    marginTop: 16,
    gap: 12,
  },
  paymentCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  paymentSubtitle: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 4,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#5DA2E6",
  },
  radioOuterIdle: {
    borderColor: "#8C98A8",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
  },
  recurrenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
  },
  sectionTitleText: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  recurrenceGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  recurrenceCard: {
    width: "48%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
  },
  recurrenceCardActive: {
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    borderColor: "#5DA2E6",
  },
  recurrenceCardIdle: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  recurrenceTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  recurrenceSubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 28,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  summaryValue: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  summaryDivider: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  summaryTotalLabel: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  summaryTotalValue: {
    color: "#8C98A8",
    fontSize: 18,
    fontWeight: "600",
  },
  checkoutButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutButtonText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
});
