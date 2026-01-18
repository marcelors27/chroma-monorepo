import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "@/lib/toast";
import { listNews } from "@/lib/medusa";

type NotificationStatus = "confirmed" | "preparing" | "shipping" | "delivered" | "news";

export interface AppNotification {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  status: NotificationStatus;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasPermission, setHasPermission] = useState(true);
  const newsLastSeenRef = useRef<string | null>(null);
  const newsPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const NEWS_LAST_SEEN_KEY = "chroma_mobile_news_last_seen";
  const NEWS_POLLING_INTERVAL = 2 * 60 * 1000;

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
    const loadNewsLastSeen = async () => {
      const saved = await AsyncStorage.getItem(NEWS_LAST_SEEN_KEY);
      newsLastSeenRef.current = saved;
    };
    loadNewsLastSeen();
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

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: AppNotification = {
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

  useEffect(() => {
    const checkNews = async () => {
      try {
        const response = await listNews({ limit: 1 });
        const latest = response?.news?.[0];
        if (!latest?.id) return;

        const lastSeen = newsLastSeenRef.current;
        if (lastSeen && lastSeen !== latest.id && hasPermission) {
          addNotification({
            title: "Nova noticia publicada",
            message: latest.title,
            status: "news",
            orderId: latest.id,
          });
        }

        if (!lastSeen || lastSeen !== latest.id) {
          newsLastSeenRef.current = latest.id;
          await AsyncStorage.setItem(NEWS_LAST_SEEN_KEY, latest.id);
        }
      } catch {
        // ignore polling errors
      }
    };

    checkNews();
    newsPollingRef.current = setInterval(checkNews, NEWS_POLLING_INTERVAL);

    return () => {
      if (newsPollingRef.current) {
        clearInterval(newsPollingRef.current);
      }
    };
  }, [addNotification, hasPermission]);

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
