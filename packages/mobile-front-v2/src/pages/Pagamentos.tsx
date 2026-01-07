import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const payments = [
  { id: "1", type: "Cartão", label: "Visa •••• 1234", default: true },
  { id: "2", type: "Pix", label: "Chave cadastrada", default: false },
];

export default function Pagamentos() {
  return (
    <AuthenticatedLayout>
      <Header title="Pagamentos" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {payments.map((payment) => (
          <View key={payment.id} style={styles.card}>
            <Text style={styles.cardTitle}>{payment.label}</Text>
            <Text style={styles.cardSubtitle}>{payment.type}</Text>
            <View style={styles.actionsRow}>
              {!payment.default && (
                <Pressable onPress={() => toast.success("Forma de pagamento padrão atualizada")} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Tornar padrão</Text>
                </Pressable>
              )}
              <Pressable onPress={() => toast.success("Forma de pagamento removida")} style={styles.destructiveButton}>
                <Text style={styles.destructiveButtonText}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable onPress={() => toast.info("Funcionalidade em desenvolvimento")} style={styles.addButton}>
          <Text style={styles.addButtonText}>Adicionar pagamento</Text>
        </Pressable>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  secondaryButtonText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  destructiveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  destructiveButtonText: {
    color: "#EF4444",
    fontSize: 13,
  },
  addButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#5DA2E6",
  },
  addButtonText: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
