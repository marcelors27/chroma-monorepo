import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "@/lib/toast";
import { getTokenValue, listNews, listNotifications, markNotificationsAsRead } from "@/lib/medusa";

type NotificationStatus =
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "news"
  | "order_updated"
  | "delivery_updated"
  | "pending_pix"
  | "pending_boleto";

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
const NOTIFICATION_WS_URL = process.env.EXPO_PUBLIC_NOTIFICATION_WS_URL || "";
const NOTIFICATION_STORAGE_KEY = "orderNotifications";
const KNOWN_STATUS: NotificationStatus[] = [
  "confirmed",
  "preparing",
  "shipping",
  "delivered",
  "news",
  "order_updated",
  "delivery_updated",
  "pending_pix",
  "pending_boleto",
];

const normalizeStatus = (value?: unknown): NotificationStatus => {
  const raw = String(value || "").toLowerCase();
  const aliases: Record<string, NotificationStatus> = {
    shipped: "shipping",
    fulfilled: "shipping",
    delivery_updated: "delivery_updated",
    order_updated: "order_updated",
    pending_pix: "pending_pix",
    pending_boleto: "pending_boleto",
    pending: "order_updated",
    processing: "preparing",
    completed: "delivered",
  };
  if (KNOWN_STATUS.includes(raw as NotificationStatus)) {
    return raw as NotificationStatus;
  }
  if (aliases[raw]) return aliases[raw];
  return "news";
};

const buildNotificationKey = (notification: {
  title: string;
  message: string;
  status: NotificationStatus;
  orderId?: string;
}) => {
  return [notification.status, notification.orderId || "", notification.title, notification.message]
    .join("|")
    .toLowerCase();
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasPermission, setHasPermission] = useState(true);
  const newsLastSeenRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsAttemptsRef = useRef(0);
  const wsConnectedRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const seenKeysRef = useRef<Set<string>>(new Set());
  const NEWS_LAST_SEEN_KEY = "chroma_mobile_news_last_seen";

  useEffect(() => {
    const loadNotifications = async () => {
      const saved = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        setNotifications(normalized);
        normalized.forEach((item: AppNotification) => {
          seenKeysRef.current.add(buildNotificationKey(item));
        });
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
    AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
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
    if (!hasPermission) return;
    const dedupeKey = buildNotificationKey(notification);
    if (seenKeysRef.current.has(dedupeKey)) return;
    seenKeysRef.current.add(dedupeKey);
    if (seenKeysRef.current.size > 500) {
      const first = seenKeysRef.current.values().next().value;
      if (first) seenKeysRef.current.delete(first);
    }

    const now = new Date();
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
    });

  }, [hasPermission]);

  const mergeRemoteHistory = useCallback((items: any[]) => {
    if (!Array.isArray(items) || !items.length) return;
    setNotifications((previous) => {
      const map = new Map<string, AppNotification>();
      previous.forEach((item) => map.set(item.id, item));
      items.forEach((item) => {
        if (!item?.id || !item?.title || !item?.message) return;
        const merged: AppNotification = {
          id: String(item.id),
          orderId: item.order_id ? String(item.order_id) : undefined,
          title: String(item.title),
          message: String(item.message),
          status: normalizeStatus(item.status),
          timestamp: item.created_at ? new Date(item.created_at) : new Date(),
          read: Boolean(item.read),
        };
        map.set(merged.id, merged);
        seenKeysRef.current.add(buildNotificationKey(merged));
      });
      return Array.from(map.values()).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    });
  }, []);

  useEffect(() => {
    const loadRemoteNotifications = async () => {
      try {
        const response = await listNotifications();
        mergeRemoteHistory(response?.notifications || []);
      } catch {
        // ignore remote history fetch errors
      }
    };
    loadRemoteNotifications();
  }, [mergeRemoteHistory]);

  const parseWsNotification = (payload: any): Omit<AppNotification, "id" | "timestamp" | "read"> | null => {
    const root = payload?.notification || payload?.data || payload;
    if (!root || typeof root !== "object") return null;
    const title = root.title || root.subject || null;
    const message = root.message || root.body || root.description || null;
    if (!title || !message) return null;
    const status = normalizeStatus(root.status || root.type || payload?.type);
    const orderId =
      root.orderId ||
      root.order_id ||
      root.resource_id ||
      root.news_id ||
      undefined;
    return {
      title: String(title),
      message: String(message),
      status,
      orderId: orderId ? String(orderId) : undefined,
    };
  };

  const clearSocket = (close = true) => {
    if (wsReconnectRef.current) {
      clearTimeout(wsReconnectRef.current);
      wsReconnectRef.current = null;
    }
    if (close && wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore close errors
      }
    }
    wsRef.current = null;
    wsConnectedRef.current = false;
  };

  const resolveWsUrl = (token?: string | null) => {
    const fromEnv = NOTIFICATION_WS_URL.trim();
    if (!fromEnv) return null;
    const base = fromEnv;
    const hasQuery = base.includes("?");
    const query = token ? `token=${encodeURIComponent(token)}` : "";
    return query ? `${base}${hasQuery ? "&" : "?"}${query}` : base;
  };

  const scheduleReconnect = () => {
    if (isUnmountedRef.current) return;
    if (wsReconnectRef.current) return;
    const delay = Math.min(30000, 1000 * 2 ** wsAttemptsRef.current);
    wsReconnectRef.current = setTimeout(() => {
      wsReconnectRef.current = null;
      connectSocket();
    }, delay);
  };

  const connectSocket = async () => {
    if (isUnmountedRef.current) return;
    clearSocket(false);
    let token: string | null = null;
    try {
      token = getTokenValue();
    } catch {
      token = null;
    }
    const url = resolveWsUrl(token);
    if (!url) return;

    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        wsConnectedRef.current = true;
        wsAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data || "{}"));
          const parsed = parseWsNotification(payload);
          if (!parsed) return;
          addNotification(parsed);
        } catch {
          // ignore malformed ws payload
        }
      };

      socket.onerror = () => {
        wsConnectedRef.current = false;
      };

      socket.onclose = () => {
        wsConnectedRef.current = false;
        wsAttemptsRef.current += 1;
        scheduleReconnect();
      };
    } catch {
      wsConnectedRef.current = false;
      wsAttemptsRef.current += 1;
      scheduleReconnect();
    }
  };

  useEffect(() => {
    if (!NOTIFICATION_WS_URL.trim()) return;
    connectSocket();
    return () => {
      isUnmountedRef.current = true;
      clearSocket();
    };
  }, [NOTIFICATION_WS_URL]);

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
        // ignore initial load errors
      }
    };

    checkNews();

    return () => undefined;
  }, [addNotification, hasPermission]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    markNotificationsAsRead([id]).catch(() => undefined);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const ids = notifications.filter((item) => !item.read).map((item) => item.id);
    if (ids.length) {
      markNotificationsAsRead(ids).catch(() => undefined);
    }
  }, [notifications]);

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
