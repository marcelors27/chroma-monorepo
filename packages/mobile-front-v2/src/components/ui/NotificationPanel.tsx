import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bell, Check, CheckCheck, Package, Trash2, Truck } from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotifications, OrderNotification } from "@/contexts/NotificationContext";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const statusIcons = {
  confirmed: Check,
  preparing: Package,
  shipping: Truck,
  delivered: CheckCheck,
};

const statusColors = {
  confirmed: { color: "#60A5FA", backgroundColor: "rgba(96, 165, 250, 0.12)" },
  preparing: { color: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.12)" },
  shipping: { color: "#A855F7", backgroundColor: "rgba(168, 85, 247, 0.12)" },
  delivered: { color: "#34D399", backgroundColor: "rgba(52, 211, 153, 0.12)" },
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: OrderNotification;
  onRead: () => void;
}) {
  const Icon = statusIcons[notification.status];

  return (
    <Pressable
      onPress={onRead}
      style={[styles.notificationRow, !notification.read && styles.notificationUnread]}
    >
      <View style={styles.notificationRowInner}>
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: statusColors[notification.status].backgroundColor },
          ]}
        >
          <Icon color={statusColors[notification.status].color} size={16} />
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !notification.read && styles.notificationTitleUnread]}>
              {notification.title}
            </Text>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>
            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    hasPermission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const unreadLabel = useMemo(() => (unreadCount > 9 ? "9+" : unreadCount.toString()), [unreadCount]);

  return (
    <Sheet>
      <SheetTrigger>
        <View style={styles.trigger}>
          <Bell color="#FFFFFF" size={18} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadLabel}</Text>
            </View>
          )}
        </View>
      </SheetTrigger>
      <SheetContent side="right" style={styles.sheetContent}>
        <SheetHeader style={styles.sheetHeader}>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Notificações</Text>
            <View style={styles.sheetHeaderActions}>
              {notifications.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onPress={markAllAsRead}>
                    <Text style={styles.headerActionText}>Marcar todas</Text>
                  </Button>
                  <Button variant="ghost" size="sm" onPress={clearNotifications}>
                    <Trash2 color="hsl(0 72% 51%)" size={16} />
                  </Button>
                </>
              )}
            </View>
          </View>
        </SheetHeader>

        {!hasPermission && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionText}>
              Ative as notificações para receber atualizações em tempo real.
            </Text>
            <Button size="sm" onPress={requestPermission} width="100%">
              <Text style={styles.permissionButtonText}>Ativar notificações</Text>
            </Button>
          </View>
        )}

        <ScrollView style={styles.notificationsScroll}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Bell color="hsl(215 15% 55%)" size={28} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma notificação ainda</Text>
              <Text style={styles.emptySubtitle}>
                Você será notificado sobre atualizações dos seus pedidos
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
              />
            ))
          )}
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  sheetContent: {
    padding: 0,
  },
  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  headerActionText: {
    color: "#E6E8EA",
    fontSize: 12,
  },
  permissionBanner: {
    padding: 16,
    backgroundColor: "rgba(93, 162, 230, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  permissionText: {
    color: "#8C98A8",
    fontSize: 13,
    marginBottom: 8,
  },
  permissionButtonText: {
    color: "#0B0F14",
    fontSize: 13,
    fontWeight: "600",
  },
  notificationsScroll: {
    maxHeight: 520,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    padding: 16,
    borderRadius: 999,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#8C98A8",
  },
  emptySubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5DA2E6",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  notificationRow: {
    width: "100%",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  notificationUnread: {
    backgroundColor: "rgba(93, 162, 230, 0.12)",
  },
  notificationRowInner: {
    flexDirection: "row",
    gap: 12,
  },
  notificationIcon: {
    padding: 8,
    borderRadius: 999,
  },
  notificationBody: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  notificationTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  notificationTitleUnread: {
    color: "#5DA2E6",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
    marginTop: 4,
  },
  notificationMessage: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 4,
  },
  notificationTime: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 6,
  },
});
