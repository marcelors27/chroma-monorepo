import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "@/lib/toast";

export interface OrderNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  status: 'confirmed' | 'preparing' | 'shipping' | 'delivered';
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: OrderNotification[];
  unreadCount: number;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  addNotification: (notification: Omit<OrderNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      const saved = await AsyncStorage.getItem("orderNotifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("orderNotifications", JSON.stringify(notifications));
  }, [notifications]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setHasPermission(true);
    toast({
      title: "Notificações ativadas",
      description: "Você receberá atualizações sobre seus pedidos.",
    });
    return true;
  }, []);

  const addNotification = useCallback((notification: Omit<OrderNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: OrderNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
    });

  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasPermission,
        requestPermission,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
