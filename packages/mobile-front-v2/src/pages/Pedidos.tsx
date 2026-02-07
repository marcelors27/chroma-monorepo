import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, ClipboardList, ChevronRight, Truck, Check, X } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import {
  fetchPendingPaymentsFromBackend,
  formatMoney,
  getPendingPayments,
  listOrders,
  MedusaOrder,
  mergePendingPayments,
  PendingPayment,
} from "@/lib/medusa";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

type StatusTone = "info" | "warning" | "success" | "danger";

const resolveStatusLabel = (order: MedusaOrder) => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") return "Cancelado";
  if (order.fulfillment_status === "delivered") return "Entregue";
  if (order.fulfillment_status === "shipped" || order.fulfillment_status === "partially_shipped") return "Em trânsito";
  if (order.payment_status === "captured") return "Pago";
  return "Processando";
};

const resolveStatusTone = (order: MedusaOrder): StatusTone => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") return "danger";
  if (order.fulfillment_status === "delivered") return "success";
  if (order.fulfillment_status === "shipped" || order.fulfillment_status === "partially_shipped") return "info";
  return "warning";
};

export default function Pedidos() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { finalizePendingBoleto } = useCart();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const { data } = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);

  useEffect(() => {
    const loadPending = async () => {
      const local = await getPendingPayments();
      const remote = await fetchPendingPaymentsFromBackend();
      setPendingPayments(mergePendingPayments(local, remote));
    };
    loadPending();
  }, []);

  const orders = useMemo(() => {
    return (data?.orders || []).map((order) => {
      const statusTone = resolveStatusTone(order);
      const condoName =
        order.shipping_address?.metadata?.company_name ||
        order.shipping_address?.address_1 ||
        "Condomínio";
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
      };
    });
  }, [data]);

  const { pendingCount, historyCount } = useMemo(() => {
    const pending = orders.filter((order) => ["info", "warning"].includes(order.statusTone)).length + pendingPayments.length;
    const history = orders.filter((order) => ["success", "danger"].includes(order.statusTone)).length;
    return { pendingCount: pending, historyCount: history };
  }, [orders, pendingPayments.length]);

  const pendingByCollection = useMemo(() => {
    const map = new Map<string, PendingPayment>();
    pendingPayments.forEach((pending) => {
      if (pending.payment_collection_id) {
        map.set(pending.payment_collection_id, pending);
      }
    });
    return map;
  }, [pendingPayments]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "history") {
      return orders
        .filter((order) => ["success", "danger"].includes(order.statusTone))
        .map((order) => {
          const pending = order.payment_collection_id
            ? pendingByCollection.get(order.payment_collection_id)
            : undefined;
          return {
            ...order,
            details: pending?.details,
            paymentType: pending?.details?.method || "pagamento",
            showPendingDetails: Boolean(pending?.details),
          };
        });
    }
    const pendingMapped = pendingPayments.map((pending) => ({
      id: pending.payment_collection_id,
      status: "Pagamento pendente",
      statusTone: "warning" as StatusTone,
      date: pending.created_at ? new Date(pending.created_at).toLocaleDateString("pt-BR") : "",
      condo: pending.details?.company_name || "Condomínio",
      total: pending.details?.amount || 0,
      items: 0,
      thumbnail: pending.details?.pix_qr || pending.details?.boleto_qr || "",
      details: pending.details,
      rawId: pending.cart_id,
      isPendingPayment: true,
      paymentType: pending.details?.method || "pagamento",
      payment_collection_id: pending.payment_collection_id,
    }));
    const pendingOrders = orders.filter((order) => ["info", "warning"].includes(order.statusTone));
    return [...pendingMapped, ...pendingOrders];
  }, [activeTab, orders, pendingPayments, pendingByCollection]);

  return (
    <AuthenticatedLayout>
      <Header title="Meus Pedidos" showCondoSelector showNotification={false} />

      <ScrollView style={styles.scrollContent}>
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
            onPress={() => setActiveTab("history")}
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
          >
            <ClipboardList color={activeTab === "history" ? "#E6E8EA" : "#8C98A8"} size={16} />
            <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
              Histórico
            </Text>
          </Pressable>
        </View>

        {visibleOrders.map((order) => {
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
                  </View>
                  {order.details?.client_secret && (
                    <Pressable
                      style={[styles.pendingActionButton, styles.pendingActionClear]}
                      onPress={async () => {
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
        })}
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(24, 28, 36, 0.9)",
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
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
