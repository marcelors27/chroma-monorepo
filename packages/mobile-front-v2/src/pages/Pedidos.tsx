import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, ClipboardList, ChevronRight, Truck, Check, X } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { suspendGlobalLoading } from "@/lib/global-loading";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { useCondo } from "@/contexts/CondoContext";
import {
  fetchPendingPaymentsFromBackend,
  formatMoney,
  getTokenValue,
  getPendingPayments,
  listOrders,
  syncStripePayments,
  MedusaOrder,
  mergePendingPayments,
  PendingPayment,
  removePendingPayment,
  removePendingPaymentFromBackend,
  testBoletoPayment,
} from "@/lib/medusa";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

type StatusTone = "info" | "warning" | "success" | "danger";

const resolveFulfillmentStatus = (order: MedusaOrder) => {
  return (order.metadata?.manual_fulfillment_status as string | undefined) || order.fulfillment_status;
};

const resolveStatusLabel = (order: MedusaOrder) => {
  const fulfillmentStatus = resolveFulfillmentStatus(order);
  if (order.status === "canceled" || fulfillmentStatus === "canceled") return "Cancelado";
  if (order.status === "completed") return "Entregue";
  switch (fulfillmentStatus) {
    case "delivered":
      return "Entregue";
    case "shipped":
      return "Em trânsito";
    case "partially_shipped":
      return "Envio parcial";
    case "fulfilled":
      return "Separado";
    case "partially_fulfilled":
      return "Separação parcial";
    case "not_fulfilled":
      return "Em separação";
    default:
      break;
  }
  if (order.payment_status === "captured") return "Pago";
  return "Processando";
};

const resolveStatusTone = (order: MedusaOrder): StatusTone => {
  const fulfillmentStatus = resolveFulfillmentStatus(order);
  if (order.status === "canceled" || fulfillmentStatus === "canceled") return "danger";
  if (order.status === "completed") return "success";
  if (fulfillmentStatus === "delivered") return "success";
  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "partially_shipped") return "info";
  if (fulfillmentStatus === "fulfilled" || fulfillmentStatus === "partially_fulfilled") return "info";
  return "warning";
};

export default function Pedidos() {
  const { terms } = useBusinessTerms();
  const { activeCondo } = useCondo();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const ENABLE_TEST_BOLETO = process.env.EXPO_PUBLIC_ENABLE_TEST_BOLETO === "true";
  const [testPaymentId, setTestPaymentId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { finalizePendingBoleto } = useCart();
  const [activeTab, setActiveTab] = useState<"pending" | "progress" | "history">("pending");
  const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    refetchOnMount: "always",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const pullThreshold = 80;

  const refreshOrdersData = useCallback(async () => {
    await syncStripePayments();
    await refetch();
    const local = await getPendingPayments();
    const remote = await fetchPendingPaymentsFromBackend();
    setPendingPayments(mergePendingPayments(local, remote));
  }, [refetch]);

  useEffect(() => {
    refreshOrdersData().catch(() => undefined);
  }, [refreshOrdersData]);

  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsAttemptsRef = useRef(0);
  const WS_URL = process.env.EXPO_PUBLIC_ORDERS_WS_URL || "";

  useEffect(() => {
    let cancelled = false;

    const clearRetry = () => {
      if (wsRetryRef.current) {
        clearTimeout(wsRetryRef.current);
        wsRetryRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (wsRetryRef.current) return;
      const delay = Math.min(30000, 1000 * 2 ** wsAttemptsRef.current);
      wsRetryRef.current = setTimeout(() => {
        wsRetryRef.current = null;
        connect();
      }, delay);
    };

    const connect = async () => {
      if (cancelled) return;
      clearRetry();
      try {
        if (!WS_URL.trim()) return;
        const token = await getTokenValue().catch(() => null);
        const hasQuery = WS_URL.includes("?");
        const url = token
          ? `${WS_URL}${hasQuery ? "&" : "?"}token=${encodeURIComponent(token)}`
          : WS_URL;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          wsAttemptsRef.current = 0;
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"));
            const type = String(payload?.type || payload?.event || "").toLowerCase();
            const companyId =
              payload?.company_id ||
              payload?.data?.company_id ||
              payload?.order?.shipping_address?.metadata?.company_id ||
              null;
            if (companyId && activeCondo?.id && companyId !== activeCondo.id) return;
            if (type.includes("order") || type.includes("payment") || type.includes("cart")) {
              refreshOrdersData().catch(() => undefined);
            }
          } catch {
            // ignore malformed ws payload
          }
        };
        ws.onclose = () => {
          wsAttemptsRef.current += 1;
          scheduleReconnect();
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch {
        wsAttemptsRef.current += 1;
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      cancelled = true;
      clearRetry();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
      wsRef.current = null;
    };
  }, [WS_URL, activeCondo?.id, refreshOrdersData]);

  const pendingByCollection = useMemo(() => {
    const map = new Map<string, PendingPayment>();
    pendingPayments.forEach((pending) => {
      if (pending.payment_collection_id) {
        map.set(pending.payment_collection_id, pending);
      }
    });
    return map;
  }, [pendingPayments]);

  const filteredOrders = useMemo(() => {
    const source = (data?.orders || []) as MedusaOrder[];
    if (!activeCondo?.id) return source;
    return source.filter((order) => {
      const metadata = (order.shipping_address?.metadata || {}) as Record<string, any>;
      const companyId = metadata.company_id || metadata.condo_id || null;
      return companyId === activeCondo.id;
    });
  }, [data?.orders, activeCondo?.id]);

  const orders = useMemo(() => {
    return filteredOrders.map((order) => {
      const statusTone = resolveStatusTone(order);
      const condoName =
        order.shipping_address?.metadata?.company_name ||
        order.shipping_address?.address_1 ||
        terms.label;
      return {
        id: order.display_id || order.id,
        status: resolveStatusLabel(order),
        statusTone,
        date: order.created_at ? new Date(order.created_at).toLocaleDateString("pt-BR") : "",
        condo: condoName,
        total: order.total || 0,
        items: order.items?.length || 0,
        thumbnail: order.items?.[0]?.thumbnail || "",
        rawId: order.id,
        payment_collection_id: order.payment_collection_id,
        boletoExpiresAfterDays: order.shipping_address?.metadata?.boleto_expires_after_days,
        isHistory:
          order.status === "canceled" ||
          resolveFulfillmentStatus(order) === "canceled" ||
          resolveFulfillmentStatus(order) === "delivered" ||
          order.status === "completed",
      };
    });
  }, [filteredOrders, terms.label]);

  const ordersWithoutPending = useMemo(() => {
    return orders.filter(
      (order) => !order.payment_collection_id || !pendingByCollection.has(order.payment_collection_id)
    );
  }, [orders, pendingByCollection]);

  const filteredPendingPayments = useMemo(
    () =>
      pendingPayments.filter((pending) => {
        if (!activeCondo?.id) return true;
        return pending.details?.company_id === activeCondo.id;
      }),
    [pendingPayments, activeCondo?.id]
  );

  const inProgressOrders = useMemo(() => ordersWithoutPending.filter((order) => !order.isHistory), [ordersWithoutPending]);
  const historyOrders = useMemo(() => ordersWithoutPending.filter((order) => order.isHistory), [ordersWithoutPending]);

  const { pendingCount, progressCount, historyCount } = useMemo(() => {
    return {
      pendingCount: filteredPendingPayments.length,
      progressCount: inProgressOrders.length,
      historyCount: historyOrders.length,
    };
  }, [filteredPendingPayments.length, inProgressOrders.length, historyOrders.length]);

  const visibleOrders = useMemo(() => {
    const pendingMapped = filteredPendingPayments
      .map((pending) => ({
      id: pending.payment_collection_id,
      status: "Pagamento pendente",
      statusTone: "warning" as StatusTone,
      date: pending.created_at ? new Date(pending.created_at).toLocaleDateString("pt-BR") : "",
      condo: pending.details?.company_name || terms.label,
      total: pending.details?.amount || 0,
      items: 0,
      thumbnail: pending.details?.pix_qr || pending.details?.boleto_qr || "",
      details: pending.details,
      rawId: pending.cart_id,
      isPendingPayment: true,
      paymentType: pending.details?.method || "pagamento",
      payment_collection_id: pending.payment_collection_id,
      }));

    if (activeTab === "pending") {
      return pendingMapped;
    }
    if (activeTab === "progress") {
      return inProgressOrders;
    }
    return historyOrders;
  }, [activeTab, filteredPendingPayments, inProgressOrders, historyOrders, terms.label]);

  const showSkeleton = isLoading && visibleOrders.length === 0;

  useEffect(() => {
    if (!isActionLoading) return;
    return suspendGlobalLoading();
  }, [isActionLoading]);

  const handleTestBoleto = async (paymentCollectionId?: string | null) => {
    if (!paymentCollectionId || testPaymentId) return;
    if (!__DEV__) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Pagamento de teste",
        "Confirmar pagamento do boleto em modo de teste?",
        [
          { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
          { text: "Confirmar", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;
    setTestPaymentId(paymentCollectionId);
    setIsActionLoading(true);
    try {
      await testBoletoPayment({ payment_collection_id: paymentCollectionId });
      await removePendingPayment({ payment_collection_id: paymentCollectionId });
      await removePendingPaymentFromBackend({ payment_collection_id: paymentCollectionId });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      const local = await getPendingPayments();
      const remote = await fetchPendingPaymentsFromBackend();
      setPendingPayments(mergePendingPayments(local, remote));
      toast.success("Pagamento confirmado (teste).");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível confirmar o boleto.");
    } finally {
      setTestPaymentId(null);
      setIsActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOrdersData();
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
      <Header title="Meus Pedidos" showCondoSelector showNotification={false} />

      <LoadingOverlay visible={isActionLoading} />

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
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => setActiveTab("pending")}
            style={[styles.tab, activeTab === "pending" && styles.tabActive]}
          >
            <Clock color="#E6E8EA" size={16} />
            <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
              Pendentes
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("progress")}
            style={[styles.tab, activeTab === "progress" && styles.tabActive]}
          >
            <Truck color={activeTab === "progress" ? "#E6E8EA" : "#8C98A8"} size={16} />
            <Text style={[styles.tabText, activeTab === "progress" && styles.tabTextActive]}>
              Em andamento
            </Text>
            {progressCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{progressCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("history")}
            style={[styles.tab, styles.tabFull, activeTab === "history" && styles.tabActive]}
          >
            <ClipboardList color={activeTab === "history" ? "#E6E8EA" : "#8C98A8"} size={16} />
            <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
              Histórico
            </Text>
          </Pressable>
        </View>

        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <View key={`order-skeleton-${index}`} style={styles.orderSkeletonCard}>
              <View style={styles.orderSkeletonTop}>
                <Skeleton style={styles.orderSkeletonTag} />
                <Skeleton style={styles.orderSkeletonPill} />
              </View>
              <Skeleton style={styles.orderSkeletonLine} />
              <Skeleton style={styles.orderSkeletonLineShort} />
              <Skeleton style={styles.orderSkeletonLineShorter} />
              <View style={styles.orderSkeletonBottom}>
                <Skeleton style={styles.orderSkeletonThumb} />
                <Skeleton style={styles.orderSkeletonPrice} />
              </View>
            </View>
          ))
        ) : (
          visibleOrders.map((order) => {
            const statusStyles =
              order.statusTone === "warning"
                ? { backgroundColor: "rgba(245, 158, 11, 0.22)", color: "#FBBF24" }
                : order.statusTone === "success"
                ? { backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#34D399" }
              : order.statusTone === "danger"
              ? { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#F87171" }
              : { backgroundColor: "rgba(93, 162, 230, 0.2)", color: "#5DA2E6" };

            return (
            <Pressable
              key={order.id}
              onPress={() =>
                order.isPendingPayment
                  ? undefined
                  : navigation.navigate("Rastreamento" as never, { id: order.rawId } as never)
              }
              style={styles.card}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardDate}>{order.date}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusStyles.backgroundColor }]}
                >
                  {order.statusTone === "warning" ? (
                    <Clock color={statusStyles.color} size={14} />
                  ) : order.statusTone === "success" ? (
                    <Check color={statusStyles.color} size={14} />
                  ) : order.statusTone === "danger" ? (
                    <X color={statusStyles.color} size={14} />
                  ) : (
                    <Truck color={statusStyles.color} size={14} />
                  )}
                  <Text style={[styles.statusText, { color: statusStyles.color }]}>{order.status}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{order.id}</Text>
              <Text style={styles.cardCondo}>{order.condo}</Text>
              {order.boletoExpiresAfterDays ? (
                <Text style={styles.cardCondo}>
                  Boleto: {order.boletoExpiresAfterDays}{" "}
                  {order.boletoExpiresAfterDays === 1 ? "dia" : "dias"} para vencimento
                </Text>
              ) : null}

              <View style={styles.cardBottomRow}>
                <View style={styles.itemsRow}>
                  {!!order.thumbnail && <Image source={{ uri: order.thumbnail }} style={styles.itemThumb} />}
                  <Text style={styles.itemsText}>{order.items} itens</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>{formatMoney(order.total)}</Text>
                  <ChevronRight color="#8C98A8" size={18} />
                </View>
              </View>

              {order.isPendingPayment && (
                <View style={styles.pendingDetails}>
                  <View style={styles.pendingTypePill}>
                    <Text style={styles.pendingTypeText}>
                      {order.paymentType === "boleto" ? "Boleto" : order.paymentType === "pix" ? "PIX" : "Pagamento"}
                    </Text>
                  </View>
                  {order.details?.boleto_expires_at && (
                    <Text style={styles.pendingText}>
                      Vencimento: {new Date(order.details.boleto_expires_at * 1000).toLocaleDateString("pt-BR")}
                    </Text>
                  )}
                  {order.details?.boleto_expires_after_days && (
                    <Text style={styles.pendingText}>
                      Prazo selecionado: {order.details.boleto_expires_after_days}{" "}
                      {order.details.boleto_expires_after_days === 1 ? "dia" : "dias"}
                    </Text>
                  )}
                  {order.details?.boleto_qr && (
                    <Image source={{ uri: order.details.boleto_qr }} style={styles.pendingQr} />
                  )}
                  {order.details?.pix_qr && (
                    <Image source={{ uri: order.details.pix_qr }} style={styles.pendingQr} />
                  )}
                  {order.details?.pix_expires_at && (
                    <Text style={styles.pendingText}>
                      Vencimento: {new Date(order.details.pix_expires_at * 1000).toLocaleDateString("pt-BR")}
                    </Text>
                  )}
                  {!order.details?.pix_expires_at && order.details?.pix_expires_after_days && (
                    <Text style={styles.pendingText}>
                      Prazo selecionado: {order.details.pix_expires_after_days}{" "}
                      {order.details.pix_expires_after_days === 1 ? "dia" : "dias"}
                    </Text>
                  )}
                  {order.details?.boleto_line && (
                    <View style={styles.pendingCodeBox}>
                      <Text style={styles.pendingCodeText} numberOfLines={2}>
                        {order.details.boleto_line}
                      </Text>
                    </View>
                  )}
                  {order.details?.pix_code && (
                    <View style={styles.pendingCodeBox}>
                      <Text style={styles.pendingCodeText} numberOfLines={2}>
                        {order.details.pix_code}
                      </Text>
                    </View>
                  )}
                  <View style={styles.pendingActions}>
                    {order.details?.boleto_url && (
                      <Pressable
                        style={[styles.pendingActionButton, styles.pendingActionPrimary]}
                        onPress={async () => {
                          const canOpen = await Linking.canOpenURL(order.details?.boleto_url || "");
                          if (canOpen) {
                            await Linking.openURL(order.details?.boleto_url || "");
                          } else {
                            toast.error("Não foi possível abrir o boleto.");
                          }
                        }}
                      >
                        <Text style={styles.pendingActionText}>Abrir boleto</Text>
                      </Pressable>
                    )}
                    {(order.details?.boleto_line || order.details?.pix_code) && (
                      <Pressable
                        style={[styles.pendingActionButton, styles.pendingActionGhost]}
                        onPress={async () => {
                          const value = order.details?.boleto_line || order.details?.pix_code || "";
                          try {
                            const Clipboard = await import("expo-clipboard");
                            await Clipboard.setStringAsync(value);
                            toast.success("Código copiado.");
                          } catch {
                            toast.error("Não foi possível copiar.");
                          }
                        }}
                      >
                        <Text style={styles.pendingActionText}>
                          {order.details?.boleto_line ? "Copiar linha" : "Copiar PIX"}
                        </Text>
                      </Pressable>
                    )}
                    {ENABLE_TEST_BOLETO && __DEV__ && order.paymentType === "boleto" && (
                      <Pressable
                        style={[styles.pendingActionButton, styles.pendingActionGhost]}
                        onPress={() => handleTestBoleto(order.payment_collection_id)}
                        disabled={testPaymentId === order.payment_collection_id}
                      >
                        <Text style={styles.pendingActionText}>
                          {testPaymentId === order.payment_collection_id ? "Confirmando..." : "Pagar em teste"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  {order.details?.client_secret && (
                    <Pressable
                      style={[styles.pendingActionButton, styles.pendingActionClear]}
                      onPress={async () => {
                        setIsActionLoading(true);
                        try {
                          const result = await finalizePendingBoleto(order.details?.client_secret || "");
                          if (result.status === "completed") {
                            toast.success(`Pagamento confirmado! ${result.orderId ? `#${result.orderId}` : ""}`.trim());
                            await queryClient.invalidateQueries({ queryKey: ["orders"] });
                            const local = await getPendingPayments();
                            const remote = await fetchPendingPaymentsFromBackend();
                            setPendingPayments(mergePendingPayments(local, remote));
                          } else {
                            toast.info("Pagamento ainda pendente.");
                          }
                        } finally {
                          setIsActionLoading(false);
                        }
                      }}
                    >
                      <Text style={styles.pendingActionText}>Verificar pagamento</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {order.showPendingDetails && order.details && (
                <View style={styles.pendingDetails}>
                  <View style={styles.pendingTypePill}>
                    <Text style={styles.pendingTypeText}>
                      {order.details?.method === "boleto" ? "Boleto" : order.details?.method === "pix" ? "PIX" : "Pagamento"}
                    </Text>
                  </View>
                  {order.details?.boleto_expires_at && (
                    <Text style={styles.pendingText}>
                      Vencimento: {new Date(order.details.boleto_expires_at * 1000).toLocaleDateString("pt-BR")}
                    </Text>
                  )}
                  {order.details?.boleto_expires_after_days && (
                    <Text style={styles.pendingText}>
                      Prazo selecionado: {order.details.boleto_expires_after_days}{" "}
                      {order.details.boleto_expires_after_days === 1 ? "dia" : "dias"}
                    </Text>
                  )}
                  {order.details?.boleto_qr && (
                    <Image source={{ uri: order.details.boleto_qr }} style={styles.pendingQr} />
                  )}
                  {order.details?.pix_qr && (
                    <Image source={{ uri: order.details.pix_qr }} style={styles.pendingQr} />
                  )}
                  {order.details?.pix_expires_at && (
                    <Text style={styles.pendingText}>
                      Vencimento: {new Date(order.details.pix_expires_at * 1000).toLocaleDateString("pt-BR")}
                    </Text>
                  )}
                  {!order.details?.pix_expires_at && order.details?.pix_expires_after_days && (
                    <Text style={styles.pendingText}>
                      Prazo selecionado: {order.details.pix_expires_after_days}{" "}
                      {order.details.pix_expires_after_days === 1 ? "dia" : "dias"}
                    </Text>
                  )}
                  {order.details?.boleto_line && (
                    <View style={styles.pendingCodeBox}>
                      <Text style={styles.pendingCodeText} numberOfLines={2}>
                        {order.details.boleto_line}
                      </Text>
                    </View>
                  )}
                  {order.details?.pix_code && (
                    <View style={styles.pendingCodeBox}>
                      <Text style={styles.pendingCodeText} numberOfLines={2}>
                        {order.details.pix_code}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
            );
          })
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  orderSkeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  orderSkeletonTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderSkeletonTag: {
    width: 80,
    height: 12,
    borderRadius: 8,
  },
  orderSkeletonPill: {
    width: 110,
    height: 20,
    borderRadius: 999,
  },
  orderSkeletonLine: {
    height: 14,
    borderRadius: 8,
  },
  orderSkeletonLineShort: {
    height: 12,
    width: "75%",
    borderRadius: 8,
  },
  orderSkeletonLineShorter: {
    height: 12,
    width: "55%",
    borderRadius: 8,
  },
  orderSkeletonBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  orderSkeletonThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  orderSkeletonPrice: {
    width: 90,
    height: 14,
    borderRadius: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(24, 28, 36, 0.9)",
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabFull: {
    flexBasis: "100%",
  },
  tabActive: {
    backgroundColor: "rgba(52, 59, 70, 0.9)",
    borderColor: "#5DA2E6",
  },
  tabText: {
    color: "#8C98A8",
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#E6E8EA",
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5DA2E6",
  },
  tabBadgeText: {
    color: "#0B0F14",
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    color: "#8C98A8",
    fontSize: 11,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  cardCondo: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 4,
  },
  cardBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  itemsText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  totalText: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingDetails: {
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(70, 78, 90, 0.5)",
  },
  pendingTypePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.4)",
  },
  pendingTypeText: {
    color: "#E6E8EA",
    fontSize: 11,
    fontWeight: "600",
  },
  pendingText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  pendingQr: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
  },
  pendingCodeBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(11, 15, 20, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  pendingCodeText: {
    color: "#E6E8EA",
    fontSize: 12,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 8,
  },
  pendingActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingActionPrimary: {
    backgroundColor: "#5DA2E6",
  },
  pendingActionGhost: {
    backgroundColor: "rgba(93, 162, 230, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.5)",
  },
  pendingActionClear: {
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.5)",
    marginTop: 4,
  },
  pendingActionText: {
    color: "#E6E8EA",
    fontSize: 12,
    fontWeight: "600",
  },
});
