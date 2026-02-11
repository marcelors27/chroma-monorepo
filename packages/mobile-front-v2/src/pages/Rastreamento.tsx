import { Animated, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "@/lib/toast";
import { listOrders, type MedusaOrder } from "@/lib/medusa";
import { useEffect, useMemo, useRef, useState } from "react";

const buildTrackingSteps = (order?: MedusaOrder | null) => {
  const createdAt = order?.created_at ? new Date(order.created_at) : null;
  const format = (value: Date | null) =>
    value ? value.toLocaleDateString("pt-BR") : "--";
  const addDays = (days: number) =>
    createdAt ? new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000) : null;

  return [
    { id: "1", title: "Pedido confirmado", date: format(createdAt) },
    { id: "2", title: "Em separação", date: format(addDays(1)) },
    { id: "3", title: "Em transporte", date: format(addDays(2)) },
    { id: "4", title: "Saiu para entrega", date: format(addDays(3)) },
  ];
};

const resolveCurrentStepIndex = (order?: MedusaOrder | null) => {
  if (!order) return 0;
  if (order.status === "canceled" || order.fulfillment_status === "canceled") return 0;
  switch (order.fulfillment_status) {
    case "not_fulfilled":
    case "fulfilled":
    case "partially_fulfilled":
      return 1;
    case "shipped":
    case "partially_shipped":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
};

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
  const order = (data?.orders || []).find((item) => item.id === id || String(item.display_id) === id);
  const displayId = order?.display_id ? `#${order.display_id}` : String(id);
  const condoName =
    order?.shipping_address?.metadata?.company_name ||
    order?.shipping_address?.address_1 ||
    "Condomínio";
  const trackingSteps = useMemo(() => buildTrackingSteps(order), [order]);
  const currentStepIndex = useMemo(() => resolveCurrentStepIndex(order), [order]);
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseOpacity]);

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
          <Text style={styles.cardTitle}>{displayId}</Text>
          <Text style={styles.cardCondo}>Condomínio: {condoName}</Text>
          <Text style={styles.cardSubtitle}>Código de rastreio: BR123456789</Text>
          <Pressable onPress={() => toast.success("Código de rastreio copiado!")} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copiar código</Text>
          </Pressable>
        </View>

        <View style={styles.timeline}>
          {trackingSteps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isLast = index === trackingSteps.length - 1;
            return (
              <View key={step.id} style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <Animated.View
                    style={[styles.timelineDot, isCurrent && styles.timelineDotActive, isCurrent && { opacity: pulseOpacity }]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={[styles.stepContent, isCurrent && styles.stepContentActive]}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDate}>{step.date}</Text>
                </View>
              </View>
            );
          })}
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
    alignItems: "center",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  timelineRail: {
    width: 20,
    alignItems: "center",
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(124, 135, 150, 0.7)",
    borderWidth: 2,
    borderColor: "rgba(24, 28, 36, 0.95)",
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: "#5DA2E6",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    backgroundColor: "rgba(124, 135, 150, 0.4)",
  },
  stepContent: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "center",
    width: "62%",
    maxWidth: 240,
  },
  stepContentActive: {
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.6)",
  },
  stepTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  stepDate: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
});
