import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MapPin,
  PackageCheck,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { resolveBusinessBackground } from "@/lib/business-background";
import {
  createRecurrence,
  fetchPendingPaymentsFromBackend,
  getTokenValue,
  getPendingPayments,
  getActiveCondo,
  listOrders,
  syncStripePayments,
  MedusaOrder,
  mergePendingPayments,
  PendingPayment,
  formatMoney,
  removePendingPayment,
  removePendingPaymentFromBackend,
  testBoletoPayment,
} from "@/lib/medusa";

type OrderStatus =
  | "processing"
  | "separating"
  | "partial_fulfilled"
  | "ready"
  | "partial_shipped"
  | "shipped"
  | "delivered"
  | "cancelled";

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  processing: { label: "Processando", icon: <Clock className="h-4 w-4" />, variant: "secondary" },
  separating: { label: "Em separação", icon: <Package className="h-4 w-4" />, variant: "secondary" },
  partial_fulfilled: { label: "Separação parcial", icon: <Package className="h-4 w-4" />, variant: "secondary" },
  ready: { label: "Separado", icon: <Package className="h-4 w-4" />, variant: "secondary" },
  partial_shipped: { label: "Envio parcial", icon: <Truck className="h-4 w-4" />, variant: "default" },
  shipped: { label: "Em trânsito", icon: <Truck className="h-4 w-4" />, variant: "default" },
  delivered: { label: "Entregue", icon: <CheckCircle className="h-4 w-4" />, variant: "outline" },
  cancelled: { label: "Cancelado", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
};

const trackingIcons: Record<string, React.ReactNode> = {
  created: <Clock className="h-4 w-4" />,
  processing: <Package className="h-4 w-4" />,
  separating: <Package className="h-4 w-4" />,
  partial_fulfilled: <Package className="h-4 w-4" />,
  ready: <Package className="h-4 w-4" />,
  partial_shipped: <Truck className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  delivered: <PackageCheck className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const buildTrackingSteps = (createdAt?: string) => {
  const base = createdAt ? new Date(createdAt) : null;
  const format = (value: Date | null) => (value ? value.toLocaleDateString("pt-BR") : "--");
  const addDays = (days: number) =>
    base ? new Date(base.getTime() + days * 24 * 60 * 60 * 1000) : null;
  return [
    { key: "confirmed", title: "Pedido confirmado", date: format(base) },
    { key: "separation", title: "Em separação", date: format(addDays(1)) },
    { key: "transit", title: "Em transporte", date: format(addDays(2)) },
    { key: "out_for_delivery", title: "Saiu para entrega", date: format(addDays(3)) },
  ];
};

const resolveFulfillmentStatus = (order?: MedusaOrder | null) => {
  if (!order) return undefined;
  return (order.metadata?.manual_fulfillment_status as string | undefined) || order.fulfillment_status;
};

const formatOrderStatusLabel = (status?: string) => {
  switch (status) {
    case "pending":
      return "Pendente";
    case "requires_action":
      return "Requer ação";
    case "completed":
      return "Concluído";
    case "canceled":
      return "Cancelado";
    default:
      return status || "—";
  }
};

const formatFulfillmentStatusLabel = (status?: string) => {
  switch (status) {
    case "not_fulfilled":
      return "Em separação";
    case "partially_fulfilled":
      return "Separação parcial";
    case "fulfilled":
      return "Separado";
    case "shipped":
      return "Em trânsito";
    case "partially_shipped":
      return "Envio parcial";
    case "partially_delivered":
      return "Entrega parcial";
    case "delivered":
      return "Entregue";
    case "canceled":
      return "Cancelado";
    default:
      return status || "—";
  }
};

const formatPaymentStatusLabel = (status?: string) => {
  switch (status) {
    case "captured":
      return "Pago";
    case "authorized":
      return "Autorizado";
    case "pending":
      return "Pendente";
    case "canceled":
      return "Cancelado";
    case "refunded":
      return "Reembolsado";
    default:
      return status || "—";
  }
};

type TrackingStage = "done" | "current" | "pending" | "blocked";

const resolveTrackingStage = (order: MedusaOrder, index: number): TrackingStage => {
  const fulfillmentStatus = resolveFulfillmentStatus(order);
  const isCancelled = order.status === "canceled" || fulfillmentStatus === "canceled";
  if (isCancelled) {
    return index === 0 ? "done" : "blocked";
  }

  switch (fulfillmentStatus) {
    case "not_fulfilled":
    case "partially_fulfilled":
      if (index === 0) return "done";
      if (index === 1) return "current";
      return "pending";
    case "fulfilled":
      if (index <= 1) return "done";
      return "pending";
    case "shipped":
    case "partially_shipped":
      if (index <= 1) return "done";
      if (index === 2) return "current";
      return "pending";
    case "partially_delivered":
      if (index <= 2) return "done";
      if (index === 3) return "current";
      return "pending";
    case "delivered":
      return "done";
    default:
      if (index === 0) return "current";
      return "pending";
  }
};

const resolveStatus = (order: MedusaOrder): OrderStatus => {
  const fulfillmentStatus = resolveFulfillmentStatus(order);
  if (order.status === "canceled" || fulfillmentStatus === "canceled") return "cancelled";
  if (order.status === "completed") return "delivered";
  switch (fulfillmentStatus) {
    case "delivered":
      return "delivered";
    case "shipped":
      return "shipped";
    case "partially_shipped":
      return "partial_shipped";
    case "fulfilled":
      return "ready";
    case "partially_fulfilled":
      return "partial_fulfilled";
    case "not_fulfilled":
      return "separating";
    default:
      return "processing";
  }
};

const ENABLE_PIX = import.meta.env.VITE_ENABLE_PIX === "true";
const ENABLE_TEST_BOLETO = import.meta.env.VITE_ENABLE_TEST_BOLETO === "true";
const IS_DEV = import.meta.env.DEV === true;

const Orders = () => {
  const { terms, activeBusinessType, activeBusinessTypeKey } = useBusinessTerms();
  const [selectedOrder, setSelectedOrder] = useState<MedusaOrder | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [pendingPaymentsLoaded, setPendingPaymentsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "progress" | "history">("pending");
  const [autoTab, setAutoTab] = useState(true);
  const [testPaymentId, setTestPaymentId] = useState<string | null>(null);
  const [recurrenceOrder, setRecurrenceOrder] = useState<MedusaOrder | null>(null);
  const [recurrenceName, setRecurrenceName] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("5");
  const [recurrencePayment, setRecurrencePayment] = useState<"credit" | "pix" | "boleto">(
    ENABLE_PIX ? "pix" : "boleto"
  );
  const [recurrenceItemId, setRecurrenceItemId] = useState("");
  const [recurrenceSaving, setRecurrenceSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: listOrders,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const orders = data?.orders || [];
  const pendingCollections = new Set(
    (pendingPayments || [])
      .map((pending) => pending?.payment_collection_id)
      .filter(Boolean) as string[]
  );
  const visibleOrders = orders.filter(
    (order) => !pendingCollections.has(order.payment_collection_id || "")
  );
  const isHistoryOrder = (order: MedusaOrder) => {
    const status = resolveStatus(order);
    return status === "delivered" || status === "cancelled";
  };
  const inProgressOrders = visibleOrders.filter((order) => !isHistoryOrder(order));
  const historyOrders = visibleOrders.filter(isHistoryOrder);
  const pendingCount = pendingPayments.length;
  const progressCount = inProgressOrders.length;
  const historyCount = historyOrders.length;

  const formatDate = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  const formatLineItemPrice = (price?: number) => {
    return formatMoney(price || 0);
  };

  const formatUnixDate = (value?: number) => {
    if (!value) return "";
    const date = new Date(value * 1000);
    return date.toLocaleDateString("pt-BR");
  };

  const resetRecurrenceForm = () => {
    setRecurrenceName("");
    setRecurrenceFrequency("monthly");
    setRecurrenceDayOfWeek("1");
    setRecurrenceDayOfMonth("5");
    setRecurrencePayment(ENABLE_PIX ? "pix" : "boleto");
  };

  const openRecurrenceDialog = (order: MedusaOrder) => {
    setRecurrenceOrder(order);
    resetRecurrenceForm();
    const firstItem = (order.items || []).find((item) => item.variant_id);
    setRecurrenceItemId(firstItem?.id || "");
  };

  const buildRecurrenceItemsFromOrder = (order: MedusaOrder) => {
    const target = (order.items || []).find(
      (item) => item.variant_id && item.id === recurrenceItemId
    );
    if (!target || !target.variant_id) return [];
    return [
      {
        variant_id: target.variant_id,
        product_id: target.product_id,
        quantity: target.quantity || 1,
        title: target.title,
        price: target.unit_price || 0,
        category: "Recorrente",
      },
    ];
  };

  const handleCreateRecurrenceFromOrder = async () => {
    if (!recurrenceOrder) return;
    const items = buildRecurrenceItemsFromOrder(recurrenceOrder);
    if (!items.length) {
      toast({
        title: "Itens inválidos",
        description: "Este pedido não possui itens válidos para recorrência.",
        variant: "destructive",
      });
      return;
    }

    const activeCondo = getActiveCondo();
    setRecurrenceSaving(true);
    try {
      await createRecurrence({
        name: recurrenceName.trim() || `Recorrência ${recurrenceOrder.display_id || ""}`.trim(),
        frequency: recurrenceFrequency,
        day_of_week: recurrenceFrequency === "monthly" ? undefined : Number(recurrenceDayOfWeek),
        day_of_month: recurrenceFrequency === "monthly" ? Number(recurrenceDayOfMonth) : undefined,
        payment_method: recurrencePayment,
        items,
        company_id:
          recurrenceOrder?.shipping_address?.metadata?.company_id ||
          activeCondo?.id ||
          null,
      });
      toast({
        title: "Recorrência criada",
        description: "A compra foi transformada em recorrente.",
      });
      setRecurrenceOrder(null);
      resetRecurrenceForm();
      setRecurrenceItemId("");
    } catch (error: any) {
      toast({
        title: "Erro ao criar recorrência",
        description: error?.message || "Não foi possível salvar a recorrência.",
        variant: "destructive",
      });
    } finally {
      setRecurrenceSaving(false);
    }
  };

  const copyText = (value: string, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const formatPendingMethod = (method?: string) => {
    if (method === "pix") return "PIX";
    if (method === "boleto") return "Boleto";
    if (method === "credit") return "Cartão";
    return "Pagamento";
  };

  const resolveOrderCondo = (order: MedusaOrder) => {
    return (
      order?.shipping_address?.metadata?.company_name ||
      order?.shipping_address?.address_1 ||
      terms.label
    );
  };

  const resolvePendingCondo = (pending: PendingPayment) => {
    return pending?.details?.company_name || terms.label;
  };

  const resolveFriendlyOrderId = (order?: MedusaOrder | null) => {
    if (!order) return "";
    if (order.display_id) return `#${order.display_id}`;
    if (order.id) return `#${order.id.slice(0, 6)}`;
    return "";
  };

  const resolvePendingOrderId = (pending: PendingPayment) => {
    const match = orders.find(
      (order) =>
        order.payment_collection_id &&
        pending.payment_collection_id &&
        order.payment_collection_id === pending.payment_collection_id
    );
    const friendly = resolveFriendlyOrderId(match);
    if (friendly) return friendly;
    if (pending.payment_collection_id) {
      return `#${pending.payment_collection_id.slice(0, 6)}`;
    }
    if (pending.cart_id) {
      return `#${pending.cart_id.slice(0, 6)}`;
    }
    return "—";
  };

  const handleTestBoleto = async (pending: PendingPayment) => {
    if (!pending?.payment_collection_id || testPaymentId) return;
    if (!IS_DEV) return;
    const confirmed = window.confirm(
      "Confirmar pagamento de boleto em modo de teste?"
    );
    if (!confirmed) return;
    setTestPaymentId(pending.payment_collection_id);
    try {
      await testBoletoPayment({ payment_collection_id: pending.payment_collection_id });
      removePendingPayment({ payment_collection_id: pending.payment_collection_id });
      await removePendingPaymentFromBackend({ payment_collection_id: pending.payment_collection_id });
      const local = getPendingPayments();
      const remote = await fetchPendingPaymentsFromBackend();
      setPendingPayments(mergePendingPayments(local, remote));
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Pagamento confirmado (teste)",
        description: "O boleto foi marcado como pago.",
      });
    } catch (error: any) {
      toast({
        title: "Falha no pagamento teste",
        description: error?.message || "Não foi possível confirmar o boleto.",
        variant: "destructive",
      });
    } finally {
      setTestPaymentId(null);
    }
  };

  const orderStatus = selectedOrder ? resolveStatus(selectedOrder) : "processing";
  const timelineEvents = selectedOrder
    ? (() => {
        const history = Array.isArray(selectedOrder.metadata?.status_history)
          ? selectedOrder.metadata.status_history
          : [];
        if (history.length) {
          return history
            .slice()
            .reverse()
            .map((entry: any, idx: number) => {
              const status = entry?.to_status || entry?.status || selectedOrder.status || "—";
              const fulfillment =
                entry?.to_fulfillment_status ||
                entry?.fulfillment_status ||
                resolveFulfillmentStatus(selectedOrder) ||
                "—";
              const payment = entry?.payment_status || selectedOrder.payment_status || "—";
              return {
                key: `history-${idx}`,
                icon: "processing",
                label: `Entrega: ${formatFulfillmentStatusLabel(fulfillment)}`,
                detail: `Pedido: ${formatOrderStatusLabel(status)} • Pagamento: ${formatPaymentStatusLabel(payment)}`,
                date: entry?.at || selectedOrder.updated_at,
              };
            });
        }
        return [
          {
            key: "created",
            icon: "created",
            label: `Entrega: ${formatFulfillmentStatusLabel(resolveFulfillmentStatus(selectedOrder))}`,
            detail: "Pedido realizado",
            date: selectedOrder.created_at,
          },
          {
            key: "fulfillment",
            icon: "processing",
            label: `Entrega: ${formatFulfillmentStatusLabel(resolveFulfillmentStatus(selectedOrder))}`,
            detail: `Pedido: ${formatOrderStatusLabel(selectedOrder.status)} • Pagamento: ${formatPaymentStatusLabel(selectedOrder.payment_status)}`,
            date: selectedOrder.updated_at,
          },
          {
            key: "payment",
            icon: "processing",
            label: `Entrega: ${formatFulfillmentStatusLabel(resolveFulfillmentStatus(selectedOrder))}`,
            detail: `Pagamento: ${formatPaymentStatusLabel(selectedOrder.payment_status)}`,
            date: selectedOrder.updated_at,
          },
        ];
      })()
    : [];

  const refreshOrdersData = async () => {
    await syncStripePayments();
    const local = getPendingPayments();
    const remote = await fetchPendingPaymentsFromBackend();
    const merged = mergePendingPayments(local, remote);
    setPendingPayments(merged);
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  useEffect(() => {
    let active = true;
    refreshOrdersData()
      .catch(() => undefined)
      .finally(() => {
        if (active) setPendingPaymentsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retry: number | null = null;
    let attempts = 0;
    const WS_URL = import.meta.env.VITE_ORDERS_WS_URL || "";

    const clearRetry = () => {
      if (retry) {
        window.clearTimeout(retry);
        retry = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (retry) return;
      const delay = Math.min(30000, 1000 * 2 ** attempts);
      retry = window.setTimeout(() => {
        retry = null;
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
        const url = token ? `${WS_URL}${hasQuery ? "&" : "?"}token=${encodeURIComponent(token)}` : WS_URL;
        ws = new WebSocket(url);
        ws.onopen = () => {
          attempts = 0;
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"));
            const type = String(payload?.type || payload?.event || "").toLowerCase();
            if (type.includes("order") || type.includes("payment") || type.includes("cart")) {
              refreshOrdersData().catch(() => undefined);
            }
          } catch {
            // ignore malformed ws payload
          }
        };
        ws.onclose = () => {
          attempts += 1;
          scheduleReconnect();
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        attempts += 1;
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      cancelled = true;
      clearRetry();
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (!autoTab) return;
    if (!pendingPaymentsLoaded || isLoading || isError) return;
    if (pendingPayments.length > 0) {
      if (activeTab !== "pending") {
        setActiveTab("pending");
      }
      return;
    }
    if (inProgressOrders.length > 0) {
      if (activeTab !== "progress") {
        setActiveTab("progress");
      }
      return;
    }
    if (historyOrders.length > 0 && activeTab !== "history") {
      setActiveTab("history");
    }
  }, [
    activeTab,
    autoTab,
    historyOrders.length,
    inProgressOrders.length,
    isError,
    isLoading,
    pendingPayments.length,
    pendingPaymentsLoaded,
  ]);

  return (
    <div
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.78), hsl(var(--background) / 0.86)), url(${resolveBusinessBackground(activeBusinessTypeKey, terms.labelLower, activeBusinessType?.terms || null)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="orders-title">
              Meus Pedidos
            </h1>
            <p className="text-muted-foreground">Acompanhe o status dos seus pedidos</p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="border-2 border-border p-6 bg-card animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="border-2 border-border p-6 bg-card text-center space-y-3">
            <h3 className="text-lg font-bold">Não foi possível carregar seus pedidos</h3>
            <p className="text-muted-foreground text-sm">
              Verifique se você está autenticado e tente novamente.
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              <Button
                variant={activeTab === "pending" ? "default" : "outline"}
                className="w-full justify-center gap-2 border-2"
                onClick={() => {
                  setActiveTab("pending");
                  setAutoTab(false);
                }}
              >
                <Clock className="h-4 w-4" />
                Pendentes
                {pendingCount > 0 && <span className="ml-1 text-xs">({pendingCount})</span>}
              </Button>
              <Button
                variant={activeTab === "progress" ? "default" : "outline"}
                className="w-full justify-center gap-2 border-2"
                onClick={() => {
                  setActiveTab("progress");
                  setAutoTab(false);
                }}
              >
                <Truck className="h-4 w-4" />
                Em andamento
                {progressCount > 0 && <span className="ml-1 text-xs">({progressCount})</span>}
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "outline"}
                className="w-full justify-center gap-2 border-2"
                onClick={() => {
                  setActiveTab("history");
                  setAutoTab(false);
                }}
              >
                <ClipboardList className="h-4 w-4" />
                Histórico
                {historyCount > 0 && <span className="ml-1 text-xs">({historyCount})</span>}
              </Button>
            </div>

            {activeTab === "pending" && (
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Pendentes</h2>
                  <p className="text-muted-foreground text-sm">
                    Estes pagamentos ainda aguardam compensação.
                  </p>
                </div>
                {pendingPayments.length === 0 ? (
                  <div className="border-2 border-border p-6 bg-card text-center">
                    <p className="text-muted-foreground text-sm">Nenhum pagamento pendente.</p>
                  </div>
                ) : (
                  pendingPayments.map((pending) => (
                    <div
                      key={pending.payment_collection_id}
                      className="border-2 border-border p-6 bg-card"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-secondary border-2 border-border">
                            <Clock className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-lg">
                                {formatPendingMethod(pending.method)} pendente
                              </h3>
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-4 w-4" />
                                Aguardando pagamento
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {pending.created_at
                                ? formatDate(pending.created_at)
                                : "Data indisponível"}{" "}
                              • Pedido {resolvePendingOrderId(pending)} • Cobrança {pending.payment_collection_id}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {terms.label}: {resolvePendingCondo(pending)}
                            </p>
                            {pending.details?.boleto_line && (
                              <div className="mt-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <span>Linha digitável:</span>
                                  <span className="font-medium text-foreground">
                                    {pending.details.boleto_line}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-2"
                                    onClick={() =>
                                      copyText(pending.details?.boleto_line || "", "Linha digitável")
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                    Copiar
                                  </Button>
                                  {pending.details?.boleto_url && (
                                    <Button variant="outline" size="sm" className="border-2" asChild>
                                      <a href={pending.details.boleto_url} target="_blank" rel="noreferrer">
                                        Abrir boleto
                                      </a>
                                    </Button>
                                  )}
                                  {ENABLE_TEST_BOLETO && IS_DEV && pending.method === "boleto" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-2"
                                      disabled={testPaymentId === pending.payment_collection_id}
                                      onClick={() => handleTestBoleto(pending)}
                                    >
                                      {testPaymentId === pending.payment_collection_id
                                        ? "Confirmando..."
                                        : "Pagar em teste"}
                                    </Button>
                                  )}
                                </div>
                                {pending.details?.boleto_expires_at && (
                                  <p className="mt-2">
                                    Vencimento: {formatUnixDate(pending.details.boleto_expires_at)}
                                  </p>
                                )}
                                {pending.details?.boleto_expires_after_days && (
                                  <p className="mt-1">
                                    Prazo selecionado: {pending.details.boleto_expires_after_days}{" "}
                                    {pending.details.boleto_expires_after_days === 1 ? "dia" : "dias"}
                                  </p>
                                )}
                              </div>
                            )}
                            {pending.details?.pix_code && (
                              <div className="mt-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <span>Código PIX:</span>
                                  <span className="font-medium text-foreground">
                                    {pending.details.pix_code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-2"
                                    onClick={() =>
                                      copyText(pending.details?.pix_code || "", "Código PIX")
                                    }
                                  >
                                    <Copy className="h-4 w-4" />
                                    Copiar
                                  </Button>
                                  {pending.details?.pix_qr && (
                                    <Button variant="outline" size="sm" className="border-2" asChild>
                                      <a href={pending.details.pix_qr} target="_blank" rel="noreferrer">
                                        Ver QR
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                {pending.details?.pix_expires_at && (
                                  <p className="mt-2">
                                    Vencimento: {formatUnixDate(pending.details.pix_expires_at)}
                                  </p>
                                )}
                                {!pending.details?.pix_expires_at && pending.details?.pix_expires_after_days && (
                                  <p className="mt-1">
                                    Prazo selecionado: {pending.details.pix_expires_after_days}{" "}
                                    {pending.details.pix_expires_after_days === 1 ? "dia" : "dias"}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab !== "pending" && (
              <div className="space-y-4">
                {(activeTab === "progress" ? inProgressOrders : historyOrders).map((order) => {
                  const status = resolveStatus(order);
                  const cfg = statusConfig[status];
                  const itemsCount = order.items?.length || 0;
                  const total = order.total || 0;

                  return (
                    <div
                      key={order.id}
                      className="border-2 border-border p-6 bg-card hover:border-primary transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-secondary border-2 border-border">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-lg">Pedido {order.display_id || order.id}</h3>
                              <Badge variant={cfg.variant} className="gap-1">
                                {cfg.icon}
                                {cfg.label}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {formatDate(order.created_at)} • {itemsCount} {itemsCount === 1 ? "item" : "itens"}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {terms.label}: {resolveOrderCondo(order)}
                            </p>
                            <p className="text-primary font-bold text-lg mt-2">
                              {formatMoney(total)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="gap-2 border-2"
                          onClick={() => setSelectedOrder(order)}
                          data-testid="orders-details"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "progress" && inProgressOrders.length === 0 && (
              <div className="border-2 border-border p-12 bg-card text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Nenhum pedido em andamento</h3>
                <p className="text-muted-foreground mb-4">
                  Seus pedidos em andamento aparecerão aqui.
                </p>
                <Button asChild>
                  <Link to="/dashboard">Ir às compras</Link>
                </Button>
              </div>
            )}

            {activeTab === "history" && historyOrders.length === 0 && (
              <div className="border-2 border-border p-12 bg-card text-center">
                <PackageCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Sem histórico</h3>
                <p className="text-muted-foreground mb-4">
                  Seus pedidos concluídos aparecerão aqui.
                </p>
                <Button asChild>
                  <Link to="/dashboard">Ir às compras</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="border-2 border-border bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Pedido {selectedOrder?.display_id || selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusConfig[orderStatus].variant} className="gap-1">
                  {statusConfig[orderStatus].icon}
                  {statusConfig[orderStatus].label}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Realizado em {formatDate(selectedOrder.created_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {terms.label}: {resolveOrderCondo(selectedOrder)}
                </p>
                <p className="text-lg font-bold text-primary">
                  Total: {formatMoney(selectedOrder.total || 0)}
                </p>
                {selectedOrder.shipping_address?.metadata?.boleto_expires_after_days && (
                  <p className="text-sm text-muted-foreground">
                    Boleto: {selectedOrder.shipping_address.metadata.boleto_expires_after_days}{" "}
                    {selectedOrder.shipping_address.metadata.boleto_expires_after_days === 1
                      ? "dia"
                      : "dias"} para vencimento
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Itens</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-border p-3 bg-background">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                        Quantidade: {item.quantity} • {formatLineItemPrice(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatLineItemPrice((item.unit_price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.shipping_address && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Entrega</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedOrder.shipping_address.address_1}
                    {selectedOrder.shipping_address.city && `, ${selectedOrder.shipping_address.city}`}
                    {selectedOrder.shipping_address.postal_code && ` - ${selectedOrder.shipping_address.postal_code}`}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold">Rastreamento</h3>
                <div className="border border-border p-3 bg-background space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Código de rastreio: BR123456789
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2"
                    onClick={() => copyText("BR123456789", "Código de rastreio")}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar código
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="border-l-2 border-border pl-6 space-y-4">
                    {buildTrackingSteps(selectedOrder.created_at).map((step, index) => {
                      const stage = resolveTrackingStage(selectedOrder, index);
                      const isDone = stage === "done";
                      const isCurrent = stage === "current";
                      const isBlocked = stage === "blocked";
                      const stageLabel = isBlocked
                        ? "Interrompida"
                        : isCurrent
                          ? "Em andamento"
                          : isDone
                            ? "Concluída"
                            : "Prevista";
                      const stageClass = isBlocked
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : isCurrent
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : isDone
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                            : "border-border bg-muted/20 text-muted-foreground";
                      return (
                        <div key={step.key} className="relative">
                          <span
                            className={`absolute -left-3 top-2 h-3 w-3 rounded-full border-2 ${
                              isCurrent
                                ? "border-primary bg-primary/80 animate-pulse"
                                : isDone
                                  ? "border-emerald-500 bg-emerald-500/80"
                                  : isBlocked
                                    ? "border-destructive bg-destructive/70"
                                : "border-muted bg-muted"
                            }`}
                          />
                          <div
                            className={`flex items-center justify-between border border-border p-3 bg-background ${
                              isCurrent
                                ? "border-primary/60"
                                : isDone
                                  ? "border-emerald-500/40"
                                  : isBlocked
                                    ? "border-destructive/40"
                                    : ""
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{step.title}</span>
                              <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] ${stageClass}`}>
                                {stageLabel}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{step.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Linha do tempo</h3>
                <div className="space-y-2">
                  {timelineEvents.map((event) => (
                    <div key={event.key} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="text-primary">{trackingIcons[event.icon] || <Clock className="h-4 w-4" />}</div>
                      <div>
                        <p className="font-medium text-foreground">{event.label}</p>
                        {event.detail ? <p className="text-xs">{event.detail}</p> : null}
                        <p>{formatDate(event.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="border-2"
                  onClick={() => openRecurrenceDialog(selectedOrder)}
                  data-testid="orders-recurrence"
                >
                  Tornar recorrente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!recurrenceOrder} onOpenChange={(open) => !open && setRecurrenceOrder(null)}>
        <DialogContent className="border-2 border-border bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Compra recorrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {recurrenceOrder?.items?.length ? (
              <div className="space-y-2">
                <Label>Produto</Label>
                <select
                  className="h-12 border-2 rounded-md bg-background px-3 w-full"
                  value={recurrenceItemId}
                  onChange={(e) => setRecurrenceItemId(e.target.value)}
                >
                  {(recurrenceOrder.items || [])
                    .filter((item) => item.variant_id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} (x{item.quantity || 1})
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="recurrenceOrderName">Nome</Label>
              <Input
                id="recurrenceOrderName"
                className="h-12 border-2"
                value={recurrenceName}
                onChange={(e) => setRecurrenceName(e.target.value)}
                placeholder="Ex: Reposição mensal"
              />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={recurrencePayment}
                onChange={(e) => setRecurrencePayment(e.target.value as "credit" | "pix" | "boleto")}
              >
                <option value="credit">Cartão</option>
                {ENABLE_PIX && <option value="pix">PIX</option>}
                <option value="boleto">Boleto</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <select
                className="h-12 border-2 rounded-md bg-background px-3 w-full"
                value={recurrenceFrequency}
                onChange={(e) =>
                  setRecurrenceFrequency(e.target.value as "weekly" | "biweekly" | "monthly")
                }
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            {recurrenceFrequency === "monthly" ? (
              <div className="space-y-2">
                <Label>Dia do mês</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="h-12 border-2"
                  value={recurrenceDayOfMonth}
                  onChange={(e) => setRecurrenceDayOfMonth(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <select
                  className="h-12 border-2 rounded-md bg-background px-3 w-full"
                  value={recurrenceDayOfWeek}
                  onChange={(e) => setRecurrenceDayOfWeek(e.target.value)}
                >
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-2"
                onClick={() => setRecurrenceOrder(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateRecurrenceFromOrder}
                disabled={recurrenceSaving}
              >
                {recurrenceSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
