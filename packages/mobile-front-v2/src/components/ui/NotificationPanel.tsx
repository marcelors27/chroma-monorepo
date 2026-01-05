import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bell, Check, CheckCheck, Package, Trash2, Truck } from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotifications, OrderNotification } from "@/contexts/NotificationContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusIcons = {
  confirmed: Check,
  preparing: Package,
  shipping: Truck,
  delivered: CheckCheck,
};

const statusColors = {
  confirmed: "text-blue-400 bg-blue-400/10",
  preparing: "text-amber-400 bg-amber-400/10",
  shipping: "text-purple-400 bg-purple-400/10",
  delivered: "text-green-400 bg-green-400/10",
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
      className={cn(
        "w-full p-4 border-b border-border/50",
        !notification.read && "bg-primary/10",
      )}
    >
      <View className="flex-row gap-3">
        <View className={cn("p-2 rounded-full", statusColors[notification.status])}>
          <Icon color="white" size={16} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className={cn("font-medium text-sm text-foreground", !notification.read && "text-primary")}>
              {notification.title}
            </Text>
            {!notification.read && <View className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
          </View>
          <Text className="text-sm text-muted-foreground mt-0.5">{notification.message}</Text>
          <Text className="text-xs text-muted-foreground mt-1">
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
      <SheetContent side="right" className="p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Notificações</Text>
            <View className="flex-row items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onPress={markAllAsRead}>
                    <Text className="text-xs text-foreground">Marcar todas</Text>
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
          <View className="p-4 bg-primary/5 border-b border-border/50">
            <Text className="text-sm text-muted-foreground mb-2">
              Ative as notificações para receber atualizações em tempo real.
            </Text>
            <Button size="sm" onPress={requestPermission} className="w-full">
              <Text className="text-sm text-primary-foreground">Ativar notificações</Text>
            </Button>
          </View>
        )}

        <ScrollView className="max-h-[520px]">
          {notifications.length === 0 ? (
            <View className="items-center justify-center py-12 text-center px-4">
              <View className="p-4 rounded-full bg-secondary mb-4">
                <Bell color="hsl(215 15% 55%)" size={28} />
              </View>
              <Text className="text-muted-foreground">Nenhuma notificação ainda</Text>
              <Text className="text-xs text-muted-foreground mt-1">
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
});
