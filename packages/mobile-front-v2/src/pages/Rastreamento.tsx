import { Animated, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "@/lib/toast";
import { listOrders, type MedusaOrder } from "@/lib/medusa";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";

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

const resolveFulfillmentStatus = (order?: MedusaOrder | null) => {
  if (!order) return undefined;
  return (order.metadata?.manual_fulfillment_status as string | undefined) || order.fulfillment_status;
};

const formatOrderStatusLabel = (status?: string) => {
  switch (status) {
    case "pending":
      return "Pendente";
    case "requires_action":
      return "Requer ação";
    case "completed":
      return "Concluído";
    case "canceled":
      return "Cancelado";
    default:
      return status || "—";
  }
};

const formatFulfillmentStatusLabel = (status?: string) => {
  switch (status) {
    case "not_fulfilled":
      return "Em separação";
    case "partially_fulfilled":
      return "Separação parcial";
    case "fulfilled":
      return "Separado";
    case "shipped":
      return "Em trânsito";
    case "partially_shipped":
      return "Envio parcial";
    case "partially_delivered":
      return "Entrega parcial";
    case "delivered":
      return "Entregue";
    case "canceled":
      return "Cancelado";
    default:
      return status || "—";
  }
};

const formatPaymentStatusLabel = (status?: string) => {
  switch (status) {
    case "captured":
      return "Pago";
    case "authorized":
      return "Autorizado";
    case "pending":
      return "Pendente";
    case "canceled":
      return "Cancelado";
    case "refunded":
      return "Reembolsado";
    default:
      return status || "—";
  }
};

type TrackingStage = "done" | "current" | "pending" | "blocked";

const resolveTrackingStage = (order: MedusaOrder | null | undefined, index: number): TrackingStage => {
  if (!order) {
    return index === 0 ? "current" : "pending";
  }

  const fulfillmentStatus = resolveFulfillmentStatus(order);
  const isCancelled = order.status === "canceled" || fulfillmentStatus === "canceled";
  if (isCancelled) {
    return index === 0 ? "done" : "blocked";
  }

  switch (fulfillmentStatus) {
    case "not_fulfilled":
    case "partially_fulfilled":
      if (index === 0) return "done";
      if (index === 1) return "current";
      return "pending";
    case "fulfilled":
      if (index <= 1) return "done";
      return "pending";
    case "shipped":
    case "partially_shipped":
      if (index <= 1) return "done";
      if (index === 2) return "current";
      return "pending";
    case "partially_delivered":
      if (index <= 2) return "done";
      if (index === 3) return "current";
      return "pending";
    case "delivered":
      return "done";
    default:
      if (index === 0) return "current";
      return "pending";
  }
};

export default function Rastreamento() {
  const route = useRoute();
  const { terms } = useBusinessTerms();
  const id = (route.params as { id?: string } | undefined)?.id ?? "#1297";
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    refetchOnMount: "always",
    refetchInterval: 30000,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullThreshold = 80;
  const order = (data?.orders || []).find((item) => item.id === id || String(item.display_id) === id);
  const displayId = order?.display_id ? `#${order.display_id}` : String(id);
  const condoName =
    order?.shipping_address?.metadata?.company_name ||
    order?.shipping_address?.address_1 ||
    terms.label;
  const trackingSteps = useMemo(() => buildTrackingSteps(order), [order]);
  const historyEntries = useMemo(() => {
    const history = Array.isArray(order?.metadata?.status_history)
      ? order?.metadata?.status_history
      : [];
    if (history.length) {
      return history
        .slice()
        .reverse()
        .map((entry: any, index: number) => ({
          id: `history-${index}`,
          title: `Entrega: ${formatFulfillmentStatusLabel(
            entry?.to_fulfillment_status || entry?.fulfillment_status || resolveFulfillmentStatus(order)
          )}`,
          subtitle: `Pedido: ${formatOrderStatusLabel(entry?.to_status || entry?.status || order?.status)} • Pagamento: ${formatPaymentStatusLabel(
            entry?.payment_status || order?.payment_status
          )}`,
          date: entry?.at ? new Date(entry.at).toLocaleString("pt-BR") : "--",
        }));
    }

    return [
      {
        id: "created",
        title: `Entrega: ${formatFulfillmentStatusLabel(resolveFulfillmentStatus(order))}`,
        subtitle: "Pedido realizado",
        date: order?.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : "--",
      },
      {
        id: "updated",
        title: `Entrega: ${formatFulfillmentStatusLabel(resolveFulfillmentStatus(order))}`,
        subtitle: `Pedido: ${formatOrderStatusLabel(order?.status)} • Pagamento: ${formatPaymentStatusLabel(order?.payment_status)}`,
        date: order?.updated_at ? new Date(order.updated_at).toLocaleString("pt-BR") : "--",
      },
    ];
  }, [order]);
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
          <Text style={styles.cardCondo}>{`${terms.label}: ${condoName}`}</Text>
          <Text style={styles.cardSubtitle}>Código de rastreio: BR123456789</Text>
          <Pressable onPress={() => toast.success("Código de rastreio copiado!")} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copiar código</Text>
          </Pressable>
        </View>

        <View style={styles.timeline}>
          {trackingSteps.map((step, index) => {
            const stage = resolveTrackingStage(order, index);
            const isDone = stage === "done";
            const isCurrent = stage === "current";
            const isBlocked = stage === "blocked";
            const stageLabel = isBlocked
              ? "Interrompida"
              : isCurrent
                ? "Em andamento"
                : isDone
                  ? "Concluída"
                  : "Prevista";
            const stageLabelStyle = isBlocked
              ? styles.stageChipBlocked
              : isCurrent
                ? styles.stageChipCurrent
                : isDone
                  ? styles.stageChipDone
                  : styles.stageChipPending;
            const isLast = index === trackingSteps.length - 1;
            return (
              <View key={step.id} style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <Animated.View
                    style={[
                      styles.timelineDot,
                      isDone && styles.timelineDotDone,
                      isBlocked && styles.timelineDotBlocked,
                      isCurrent && styles.timelineDotActive,
                      isCurrent && { opacity: pulseOpacity },
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View
                  style={[
                    styles.stepContent,
                    isDone && styles.stepContentDone,
                    isBlocked && styles.stepContentBlocked,
                    isCurrent && styles.stepContentActive,
                  ]}
                >
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDate}>{step.date}</Text>
                  <View style={[styles.stageChip, stageLabelStyle]}>
                    <Text style={styles.stageChipText}>{stageLabel}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Histórico de alterações</Text>
          <View style={styles.historyList}>
            {historyEntries.map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <Text style={styles.historyItemTitle}>{entry.title}</Text>
                {entry.subtitle ? <Text style={styles.historyItemSubtitle}>{entry.subtitle}</Text> : null}
                <Text style={styles.historyItemMeta}>{entry.date}</Text>
              </View>
            ))}
          </View>
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
  timelineDotDone: {
    backgroundColor: "#22C55E",
  },
  timelineDotBlocked: {
    backgroundColor: "#F87171",
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
  stepContentDone: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
  },
  stepContentBlocked: {
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.5)",
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
  stageChip: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "center",
    borderWidth: 1,
  },
  stageChipText: {
    color: "#E6E8EA",
    fontSize: 10,
    fontWeight: "700",
  },
  stageChipCurrent: {
    backgroundColor: "rgba(93, 162, 230, 0.22)",
    borderColor: "rgba(93, 162, 230, 0.5)",
  },
  stageChipDone: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "rgba(34, 197, 94, 0.45)",
  },
  stageChipBlocked: {
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    borderColor: "rgba(248, 113, 113, 0.45)",
  },
  stageChipPending: {
    backgroundColor: "rgba(140, 152, 168, 0.2)",
    borderColor: "rgba(140, 152, 168, 0.45)",
  },
  historyCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 14,
  },
  historyTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "700",
  },
  historyList: {
    marginTop: 10,
    gap: 8,
  },
  historyItem: {
    borderRadius: 12,
    backgroundColor: "rgba(31, 36, 46, 0.92)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(66, 77, 94, 0.5)",
  },
  historyItemTitle: {
    color: "#E6E8EA",
    fontSize: 12,
    fontWeight: "600",
  },
  historyItemSubtitle: {
    color: "#A6B0BF",
    fontSize: 11,
    marginTop: 4,
  },
  historyItemMeta: {
    color: "#8C98A8",
    fontSize: 10,
    marginTop: 4,
  },
});
