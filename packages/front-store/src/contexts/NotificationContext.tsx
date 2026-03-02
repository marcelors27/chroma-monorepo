import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { getTokenValue, listNotifications, markNotificationsAsRead } from "@/lib/medusa"

export type UserNotificationItem = {
  id: string
  title: string
  message: string
  status: string
  orderId?: string
  companyId?: string
  createdAt: string
  read: boolean
}

type NotificationContextValue = {
  notifications: UserNotificationItem[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const STORAGE_KEY = "chroma_front_notifications"
const NOTIFICATION_WS_URL = import.meta.env.VITE_NOTIFICATION_WS_URL || ""

const normalizeStatus = (value?: string | null) => {
  const raw = String(value || "").toLowerCase().trim()
  const aliases: Record<string, string> = {
    shipped: "shipping",
    fulfilled: "shipping",
    pending: "order_updated",
    processing: "preparing",
    completed: "delivered",
  }
  return aliases[raw] || raw || "news"
}

const normalizeNotification = (value: any): UserNotificationItem | null => {
  if (!value) return null
  const id = String(value.id || "")
  const title = String(value.title || "")
  const message = String(value.message || "")
  if (!id || !title || !message) return null
  return {
    id,
    title,
    message,
    status: normalizeStatus(value.status),
    orderId: value.order_id ? String(value.order_id) : undefined,
    companyId: value.company_id ? String(value.company_id) : undefined,
    createdAt: value.created_at || new Date().toISOString(),
    read: Boolean(value.read),
  }
}

const sortByDateDesc = (items: UserNotificationItem[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const mergeNotifications = useCallback((incoming: UserNotificationItem[]) => {
    if (!incoming.length) return
    setNotifications((current) => {
      const map = new Map<string, UserNotificationItem>()
      current.forEach((item) => map.set(item.id, item))
      incoming.forEach((item) => {
        const previous = map.get(item.id)
        map.set(item.id, previous ? { ...item, read: previous.read || item.read } : item)
      })
      return sortByDateDesc(Array.from(map.values())).slice(0, 200)
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized = parsed.map(normalizeNotification).filter(Boolean) as UserNotificationItem[]
      setNotifications(sortByDateDesc(normalized).slice(0, 200))
    } catch {
      // ignore local cache parse failures
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    let mounted = true
    const loadInitial = async () => {
      try {
        const response = await listNotifications()
        if (!mounted) return
        const remote = (response?.notifications || [])
          .map(normalizeNotification)
          .filter(Boolean) as UserNotificationItem[]
        mergeNotifications(remote)
      } catch {
        // ignore bootstrap failures
      }
    }
    loadInitial()
    return () => {
      mounted = false
    }
  }, [mergeNotifications])

  useEffect(() => {
    if (!NOTIFICATION_WS_URL.trim()) return

    const clearReconnect = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (reconnectRef.current) return
      const delay = Math.min(30000, 1000 * 2 ** reconnectAttemptsRef.current)
      reconnectRef.current = setTimeout(() => {
        reconnectRef.current = null
        connect()
      }, delay)
    }

    const resolveWsUrl = async () => {
      let token: string | null = null
      try {
        token = getTokenValue()
      } catch {
        token = null
      }
      const hasQuery = NOTIFICATION_WS_URL.includes("?")
      if (!token) return NOTIFICATION_WS_URL
      return `${NOTIFICATION_WS_URL}${hasQuery ? "&" : "?"}token=${encodeURIComponent(token)}`
    }

    const connect = async () => {
      clearReconnect()
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }

      try {
        const url = await resolveWsUrl()
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"))
            const root = payload?.notification || payload?.data || payload
            const normalized = normalizeNotification({
              id: root?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title: root?.title || root?.subject,
              message: root?.message || root?.body || root?.description,
              status: root?.status || payload?.type,
              order_id: root?.order_id || root?.orderId,
              company_id: root?.company_id || root?.companyId,
              created_at: root?.created_at || payload?.ts || new Date().toISOString(),
              read: false,
            })
            if (normalized) mergeNotifications([normalized])
          } catch {
            // ignore malformed ws payload
          }
        }

        ws.onclose = () => {
          reconnectAttemptsRef.current += 1
          scheduleReconnect()
        }

        ws.onerror = () => {
          try {
            ws.close()
          } catch {
            // ignore
          }
        }
      } catch {
        reconnectAttemptsRef.current += 1
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      clearReconnect()
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }
      wsRef.current = null
    }
  }, [mergeNotifications])

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
    markNotificationsAsRead([id]).catch(() => undefined)
  }, [])

  const markAllAsRead = useCallback(() => {
    const unreadIds: string[] = []
    setNotifications((current) =>
      current.map((item) => {
        if (!item.read) unreadIds.push(item.id)
        return item.read ? item : { ...item, read: true }
      })
    )
    if (unreadIds.length) {
      markNotificationsAsRead(unreadIds).catch(() => undefined)
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider")
  }
  return context
}
