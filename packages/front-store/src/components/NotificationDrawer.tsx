import { Bell, CheckCheck, Newspaper, Package, Truck, Wallet } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useNotifications } from "@/contexts/NotificationContext"

const STATUS_META: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  confirmed: { icon: CheckCheck, label: "Pedido confirmado", color: "text-blue-300" },
  preparing: { icon: Package, label: "Pedido em preparo", color: "text-amber-300" },
  shipping: { icon: Truck, label: "Saiu para entrega", color: "text-fuchsia-300" },
  delivered: { icon: CheckCheck, label: "Entregue", color: "text-emerald-300" },
  order_updated: { icon: Package, label: "Pedido atualizado", color: "text-sky-300" },
  delivery_updated: { icon: Truck, label: "Entrega atualizada", color: "text-emerald-300" },
  pending_pix: { icon: Wallet, label: "PIX gerado", color: "text-amber-300" },
  pending_boleto: { icon: Wallet, label: "Boleto gerado", color: "text-violet-300" },
  news: { icon: Newspaper, label: "Novidade", color: "text-primary" },
}

const NotificationDrawer = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-2" data-testid="notifications-trigger">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/70">
            <SheetTitle className="flex items-center justify-between gap-3">
              <span>Notificações</span>
              {notifications.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={markAllAsRead}>
                    Marcar todas
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearNotifications}>
                    Limpar
                  </Button>
                </div>
              ) : null}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="border border-border/60 bg-background/60 rounded-xl p-5 text-center">
                <Bell className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação até o momento.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const status = STATUS_META[notification.status] || STATUS_META.news
                const Icon = status.icon
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className={`w-full text-left border rounded-xl p-3 bg-background/60 hover:bg-background/80 transition-colors ${
                      notification.read ? "border-border/60" : "border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${status.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${notification.read ? "text-foreground" : "text-primary"}`}>
                            {notification.title}
                          </p>
                          {!notification.read ? <span className="h-2 w-2 rounded-full bg-primary mt-1" /> : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{status.label}</p>
                        <p className="text-sm text-foreground/90 mt-1 break-words">{notification.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default NotificationDrawer
