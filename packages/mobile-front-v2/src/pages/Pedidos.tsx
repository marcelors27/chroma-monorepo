import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, ClipboardList, ChevronRight, Truck, Check, X } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const orders = [
  {
    id: "ORD-2024-001",
    status: "Em trânsito",
    statusTone: "info" as const,
    date: "28/01/2024",
    condo: "Residencial Aurora",
    total: 489.7,
    items: 2,
    thumbnail: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: "ORD-2024-002",
    status: "Pendente",
    statusTone: "warning" as const,
    date: "25/01/2024",
    condo: "Edifício Central",
    total: 299.9,
    items: 1,
    thumbnail: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: "ORD-2024-003",
    status: "Entregue",
    statusTone: "success" as const,
    date: "20/01/2024",
    condo: "Residencial Aurora",
    total: 756.5,
    items: 2,
    thumbnail: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: "ORD-2024-004",
    status: "Entregue",
    statusTone: "success" as const,
    date: "15/01/2024",
    condo: "Condomínio Parque Verde",
    total: 189.9,
    items: 1,
    thumbnail: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=200&auto=format&fit=crop&q=60",
  },
  {
    id: "ORD-2024-005",
    status: "Cancelado",
    statusTone: "danger" as const,
    date: "10/01/2024",
    condo: "Edifício Central",
    total: 599.8,
    items: 1,
    thumbnail: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&auto=format&fit=crop&q=60",
  },
];

export default function Pedidos() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const { pendingCount, historyCount } = useMemo(() => {
    const pending = orders.filter((order) => ["info", "warning"].includes(order.statusTone)).length;
    const history = orders.filter((order) => ["success", "danger"].includes(order.statusTone)).length;
    return { pendingCount: pending, historyCount: history };
  }, []);

  const visibleOrders = useMemo(() => {
    if (activeTab === "history") {
      return orders.filter((order) => ["success", "danger"].includes(order.statusTone));
    }
    return orders.filter((order) => ["info", "warning"].includes(order.statusTone));
  }, [activeTab]);

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
              onPress={() => navigation.navigate("Rastreamento" as never, { id: order.id } as never)}
              style={styles.card}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardDate}>{order.date}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusStyles.backgroundColor }]}>
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

              <View style={styles.cardBottomRow}>
                <View style={styles.itemsRow}>
                  <Image source={{ uri: order.thumbnail }} style={styles.itemThumb} />
                  <Text style={styles.itemsText}>{order.items} itens</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>R$ {order.total.toFixed(2)}</Text>
                  <ChevronRight color="#8C98A8" size={18} />
                </View>
              </View>
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
    paddingBottom: 24,
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
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  cardCondo: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  itemsText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalText: {
    color: "#5DA2E6",
    fontSize: 14,
    fontWeight: "600",
  },
});
