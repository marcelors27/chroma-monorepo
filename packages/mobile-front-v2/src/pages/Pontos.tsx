import { useNavigation } from "@react-navigation/native";
import { ArrowRight, Gift, Star } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Header } from "@/components/layout/Header";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { useCondo } from "@/contexts/CondoContext";

export default function Pontos() {
  const navigation = useNavigation();
  const { terms } = useBusinessTerms();
  const { activeCondo } = useCondo();
  const pointsBalance = activeCondo?.pointsBalance ?? 0;

  return (
    <AuthenticatedLayout>
      <Header title={`Gastar ${terms.pointsLabelLower}`} showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Use seus {terms.pointsLabelLower} acumulados para resgatar benefícios especiais.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrapper}>
              <Star color="#F6C453" size={22} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{terms.pointsLabel} disponíveis</Text>
              <Text style={styles.cardValue}>{pointsBalance}</Text>
            </View>
          </View>
          <Text style={styles.cardFooter}>{activeCondo?.name || terms.label}</Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Gift color="#5DA2E6" size={24} />
          </View>
          <Text style={styles.emptyTitle}>Catálogo de resgates em breve</Text>
          <Text style={styles.emptySubtitle}>
            Estamos preparando um espaço para trocar seus {terms.pointsLabelLower} por vantagens e produtos.
          </Text>
          <Pressable style={styles.cta} onPress={() => navigation.navigate("MainTabs" as never)}>
            <Text style={styles.ctaText}>Continuar comprando</Text>
            <ArrowRight color="#0B0F14" size={16} />
          </Pressable>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  subtitle: {
    color: "#9AA3AE",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(18,22,28,0.92)",
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,196,83,0.15)",
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    color: "#8C98A8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardValue: {
    color: "#E6E8EA",
    fontSize: 24,
    fontWeight: "700",
  },
  cardFooter: {
    color: "#8C98A8",
    fontSize: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(18,22,28,0.78)",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93,162,230,0.15)",
  },
  emptyTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#9AA3AE",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  cta: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#5DA2E6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "700",
  },
});
