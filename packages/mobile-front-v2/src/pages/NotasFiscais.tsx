import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const invoices = [
  { id: "NF-1001", status: "Disponível", total: 489.9 },
  { id: "NF-1002", status: "Processando", total: 219.9 },
];

export default function NotasFiscais() {
  return (
    <AuthenticatedLayout>
      <Header title="Notas fiscais" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {invoices.map((invoice) => (
          <View key={invoice.id} style={styles.card}>
            <Text style={styles.cardTitle}>{invoice.id}</Text>
            <Text style={styles.cardStatus}>{invoice.status}</Text>
            <Text style={styles.cardTotal}>R$ {invoice.total.toFixed(2)}</Text>
            <Pressable
              onPress={() =>
                invoice.status === "Disponível"
                  ? toast.success(`Baixando ${invoice.id}`)
                  : toast.info("Nota fiscal ainda está sendo processada")
              }
              style={styles.cardButton}
            >
              <Text style={styles.cardButtonText}>Baixar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  cardStatus: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
  cardTotal: {
    color: "#E6E8EA",
    fontSize: 13,
    marginTop: 8,
  },
  cardButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  cardButtonText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
});
