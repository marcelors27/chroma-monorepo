import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const trackingSteps = [
  { id: "1", title: "Pedido confirmado", date: "08/07" },
  { id: "2", title: "Em separação", date: "09/07" },
  { id: "3", title: "Em transporte", date: "10/07" },
  { id: "4", title: "Saiu para entrega", date: "11/07" },
];

export default function Rastreamento() {
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? "#1297";

  return (
    <AuthenticatedLayout>
      <Header title="Rastreamento" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pedido</Text>
          <Text style={styles.cardTitle}>{id}</Text>
          <Text style={styles.cardSubtitle}>Código de rastreio: BR123456789</Text>
          <Pressable onPress={() => toast.success("Código de rastreio copiado!")} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copiar código</Text>
          </Pressable>
        </View>

        <View style={styles.timeline}>
          {trackingSteps.map((step) => (
            <View key={step.id} style={styles.stepCard}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDate}>{step.date}</Text>
            </View>
          ))}
        </View>
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
  },
  cardLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
  copyButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  copyButtonText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  timeline: {
    marginTop: 16,
  },
  stepCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  stepTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  stepDate: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
});
