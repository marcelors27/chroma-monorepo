import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "@/lib/toast";
import { listOrders } from "@/lib/medusa";
import { useState } from "react";

const trackingSteps = [
  { id: "1", title: "Pedido confirmado", date: "08/07" },
  { id: "2", title: "Em separação", date: "09/07" },
  { id: "3", title: "Em transporte", date: "10/07" },
  { id: "4", title: "Saiu para entrega", date: "11/07" },
];

export default function Rastreamento() {
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? "#1297";
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    refetchOnMount: "always",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullThreshold = 80;
  const order = (data?.orders || []).find((item) => item.id === id || item.display_id === id);
  const condoName =
    order?.shipping_address?.metadata?.company_name ||
    order?.shipping_address?.address_1 ||
    "Condomínio";

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  };

  const pullRatio = Math.min(pullDistance / pullThreshold, 1);
  const showPullIndicator = refreshing || pullDistance > 0;
  const indicatorOpacity = refreshing ? 1 : pullRatio;
  const indicatorScale = refreshing ? 1 : 0.85 + 0.15 * pullRatio;

  return (
    <AuthenticatedLayout>
      <Header title="Rastreamento" showBackButton showCondoSelector />

      <ScrollView
        style={styles.scrollContent}
        stickyHeaderIndices={refreshing ? [0] : undefined}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (offsetY < 0) {
            setPullDistance(-offsetY);
          } else if (pullDistance !== 0) {
            setPullDistance(0);
          }
        }}
        onScrollEndDrag={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (offsetY < -pullThreshold && !refreshing && !isFetching) {
            handleRefresh();
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={[styles.refreshContainer, showPullIndicator && styles.refreshContainerVisible]}>
          <View style={[styles.refreshRow, { opacity: indicatorOpacity, transform: [{ scale: indicatorScale }] }]}>
            <LoadingSpinner size={32} />
            <Text style={styles.refreshText}>
              {refreshing || isFetching
                ? "Atualizando..."
                : pullRatio >= 1
                  ? "Solte para atualizar"
                  : "Puxe para atualizar"}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pedido</Text>
          <Text style={styles.cardTitle}>{id}</Text>
          <Text style={styles.cardCondo}>Condomínio: {condoName}</Text>
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
  refreshContainer: {
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  refreshContainerVisible: {
    height: 56,
    opacity: 1,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  refreshText: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
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
  cardCondo: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 6,
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
