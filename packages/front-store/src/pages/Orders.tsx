import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import condosBg from "@/assets/condos-bg.jpg";
import { toast } from "@/hooks/use-toast";
import {
  createRecurrence,
  fetchPendingPaymentsFromBackend,
  getPendingPayments,
  getActiveCondo,
  listOrders,
  MedusaOrder,
  mergePendingPayments,
  PendingPayment,
} from "@/lib/medusa";

type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  processing: { label: "Processando", icon: <Clock className="h-4 w-4" />, variant: "secondary" },
  shipped: { label: "Enviado", icon: <Truck className="h-4 w-4" />, variant: "default" },
  delivered: { label: "Entregue", icon: <CheckCircle className="h-4 w-4" />, variant: "outline" },
  cancelled: { label: "Cancelado", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
};

const trackingIcons: Record<string, React.ReactNode> = {
  created: <Clock className="h-4 w-4" />,
  processing: <Package className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  delivered: <PackageCheck className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const resolveStatus = (order: MedusaOrder): OrderStatus => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") return "cancelled";
  if (order.fulfillment_status === "shipped" || order.fulfillment_status === "partially_shipped") return "shipped";
  if (order.fulfillment_status === "delivered") return "delivered";
  return "processing";
};

const Orders = () => {
  const [selectedOrder, setSelectedOrder] = useState<MedusaOrder | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [recurrenceOrder, setRecurrenceOrder] = useState<MedusaOrder | null>(null);
  const [recurrenceName, setRecurrenceName] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("5");
  const [recurrencePayment, setRecurrencePayment] = useState<"credit" | "pix" | "boleto">("pix");
  const [recurrenceSaving, setRecurrenceSaving] = useState(false);
  const { data, isLoading, isError } = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const orders = data?.orders || [];

  const formatDate = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  const formatLineItemPrice = (price?: number) => {
    if (!price) return "0,00";
    return price.toFixed(2).replace(".", ",");
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
    setRecurrencePayment("pix");
  };

  const openRecurrenceDialog = (order: MedusaOrder) => {
    setRecurrenceOrder(order);
    resetRecurrenceForm();
  };

  const buildRecurrenceItemsFromOrder = (order: MedusaOrder) => {
    return (order.items || [])
      .filter((item) => item.variant_id)
      .map((item) => ({
        variant_id: item.variant_id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        title: item.title,
        price: (item.unit_price || 0) / 100,
        category: "Recorrente",
      }));
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

  const orderStatus = selectedOrder ? resolveStatus(selectedOrder) : "processing";

  useEffect(() => {
    let active = true;
    const load = async () => {
      const local = getPendingPayments();
      const remote = await fetchPendingPaymentsFromBackend();
      const merged = mergePendingPayments(local, remote);
      if (active) {
        setPendingPayments(merged);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${condosBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
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
            {pendingPayments.length > 0 && (
              <div className="space-y-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Pagamentos pendentes</h2>
                  <p className="text-muted-foreground text-sm">
                    Estes pagamentos ainda aguardam compensação.
                  </p>
                </div>
                {pendingPayments.map((pending) => (
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
                            • ID cobrança {pending.payment_collection_id}
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
                              </div>
                              {pending.details?.boleto_expires_at && (
                                <p className="mt-2">
                                  Vencimento: {formatUnixDate(pending.details.boleto_expires_at)}
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
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" className="gap-2 border-2" asChild>
                        <Link to={`/checkout?pending=${encodeURIComponent(pending.payment_collection_id)}`}>
                          Ver instruções
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {orders.map((order) => {
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
                          <p className="text-primary font-bold text-lg mt-2">
                            R$ {total.toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="gap-2 border-2" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {orders.length === 0 && pendingPayments.length === 0 && (
              <div className="border-2 border-border p-12 bg-card text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-4">Você ainda não realizou nenhum pedido.</p>
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
                <p className="text-lg font-bold text-primary">
                  Total: R$ {((selectedOrder.total || 0) / 100).toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Itens</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-border p-3 bg-background">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {item.quantity} • R$ {formatLineItemPrice(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        R$ {formatLineItemPrice((item.unit_price || 0) * (item.quantity || 1))}
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

              <div className="space-y-2">
                <h3 className="font-semibold">Linha do tempo</h3>
                <div className="space-y-2">
                  {[
                    { key: "created", label: "Pedido criado", date: selectedOrder.created_at },
                    { key: selectedOrder.fulfillment_status || "processing", label: `Status: ${selectedOrder.fulfillment_status || "processando"}`, date: selectedOrder.updated_at },
                    { key: selectedOrder.payment_status || "processing", label: `Pagamento: ${selectedOrder.payment_status || "processando"}`, date: selectedOrder.updated_at },
                  ].map((event, idx) => (
                    <div key={`${event.key}-${idx}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="text-primary">{trackingIcons[event.key] || <Clock className="h-4 w-4" />}</div>
                      <div>
                        <p className="font-medium text-foreground">{event.label}</p>
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
                <option value="pix">PIX</option>
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
