import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CreditCard, 
  QrCode,
  Barcode,
  CheckCircle,
  MapPin,
    Truck,
    Copy,
    Clock
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import {
  completeCart,
  createRecurrence,
  fetchPendingPaymentsFromBackend,
  getActiveCondo,
  getPendingPayments,
  mergePendingPayments,
  PendingPaymentDetails,
  removePendingPayment,
  removePendingPaymentFromBackend,
  retrieveCart,
} from "@/lib/medusa";
import { toast } from "@/hooks/use-toast";
import condosBg from "@/assets/condos-bg.jpg";

type PaymentMethod = "credit" | "pix" | "boleto";

const Checkout = () => {
  const { items, totalPrice, clearCart, completeBackendCheckout } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"completed" | "pending" | null>(null);
  const [orderId, setOrderId] = useState("");
  const [paymentCollectionId, setPaymentCollectionId] = useState("");
  const [pendingCartId, setPendingCartId] = useState("");
  const [pendingDetails, setPendingDetails] = useState<PendingPaymentDetails | null>(null);
  const [orderTotal, setOrderTotal] = useState(totalPrice);
  const [errors, setErrors] = useState<{ paymentMethod?: string; condo?: string }>({});
  const [pixExpirationTime, setPixExpirationTime] = useState(30 * 60); // 30 minutes in seconds
  const [saveAsRecurring, setSaveAsRecurring] = useState(false);
  const [recurrenceName, setRecurrenceName] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("5");

  useEffect(() => {
    if (orderStatus && paymentMethod === "pix" && pixExpirationTime > 0) {
      const timer = setInterval(() => {
        setPixExpirationTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [orderStatus, paymentMethod, pixExpirationTime]);

  useEffect(() => {
    const pendingId = searchParams.get("pending");
    if (!pendingId || orderStatus) return;

    let active = true;
    const loadPending = async () => {
      const local = getPendingPayments();
      const remote = await fetchPendingPaymentsFromBackend();
      const merged = mergePendingPayments(local, remote);
      const pending = merged.find(
        (item) => item.payment_collection_id === pendingId
      );
      if (!pending || !active) return;
      setOrderStatus("pending");
      setPaymentCollectionId(pending.payment_collection_id || "");
      setPendingCartId(pending.cart_id || "");
      if (pending.method && !paymentMethod) {
        setPaymentMethod(pending.method as PaymentMethod);
      }
      setPendingDetails(pending.details || null);
    };

    loadPending();
    return () => {
      active = false;
    };
  }, [orderStatus, paymentMethod, searchParams]);

  useEffect(() => {
    if (paymentMethod) return;
    const method = searchParams.get("method");
    if (method === "credit" || method === "pix" || method === "boleto") {
      setPaymentMethod(method);
    }
  }, [paymentMethod, searchParams]);

  const isPaymentSucceeded = (cart: any) => {
    const sessions = cart?.payment_sessions || [];
    const session = sessions[0];
    const status =
      session?.status ||
      session?.data?.status ||
      session?.data?.payment_intent?.status ||
      session?.data?.payment_intent?.payment_intent?.status;
    if (!status) return false;
    return status === "succeeded" || status === "captured" || status === "CAPTURED";
  };

  useEffect(() => {
    if (orderStatus !== "pending") return;
    if (!pendingCartId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const cart = await retrieveCart(pendingCartId);
        if (isPaymentSucceeded(cart)) {
          const newOrderId = await completeCart(pendingCartId);
          if (!cancelled && newOrderId) {
            setOrderId(newOrderId);
            setOrderStatus("completed");
            removePendingPayment({ cart_id: pendingCartId });
            await removePendingPaymentFromBackend({ cart_id: pendingCartId });
            await clearCart();
          }
        }
      } catch {
        // Keep pending state; next poll will retry.
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderStatus, clearCart]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatUnixDate = (value?: number) => {
    if (!value) return "";
    const date = new Date(value * 1000);
    return date.toLocaleDateString("pt-BR");
  };

  const isPixExpired = pixExpirationTime <= 0;

  const [deliveryData, setDeliveryData] = useState(() => ({
    condo: getActiveCondo()?.name || "",
    observation: "",
  }));

  useEffect(() => {
    if (deliveryData.condo) return;
    const active = getActiveCondo();
    if (active?.name) {
      setDeliveryData((current) => ({ ...current, condo: active.name }));
    }
  }, [deliveryData.condo]);

  const hasPendingInstructions =
    paymentMethod === "pix" ||
    paymentMethod === "boleto" ||
    !!pendingDetails?.pix_code ||
    !!pendingDetails?.boleto_line;

  const validateForm = () => {
    const newErrors: { paymentMethod?: string; condo?: string } = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = "Selecione uma forma de pagamento";
    }
    if (!deliveryData.condo?.trim()) {
      newErrors.condo = "Informe o condomínio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildRecurrenceItems = () => {
    return items.map((item) => ({
      variant_id: item.variantId,
      product_id: item.productId,
      quantity: item.quantity,
      title: item.name,
      price: item.price,
      category: item.category,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const totalBefore = totalPrice;
      setOrderTotal(totalBefore);
      const recurrenceItemsSnapshot = saveAsRecurring ? buildRecurrenceItems() : [];

      const activeCondo = getActiveCondo();
      const shippingAddress = {
        first_name: "Condomínio",
        last_name: "Compras",
        address_1: deliveryData.condo,
        city: "São Paulo",
        country_code: "br",
        postal_code: "00000-000",
        phone: "",
        metadata: {
          observation: deliveryData.observation,
          company_id: activeCondo?.id || null,
          company_name: activeCondo?.name || null,
          company_cnpj: activeCondo?.cnpj || null,
        },
      };

      const result = await completeBackendCheckout(shippingAddress, paymentMethod);
      if (saveAsRecurring) {
        try {
          await createRecurrence({
            name: recurrenceName.trim() || `Recorrência ${activeCondo?.name || ""}`.trim(),
            frequency: recurrenceFrequency,
            day_of_week: recurrenceFrequency === "monthly" ? undefined : Number(recurrenceDayOfWeek),
            day_of_month: recurrenceFrequency === "monthly" ? Number(recurrenceDayOfMonth) : undefined,
            payment_method: paymentMethod,
            items: recurrenceItemsSnapshot,
            company_id: activeCondo?.id || null,
          });
          toast({
            title: "Recorrência criada",
            description: "Esta compra foi salva como recorrente.",
          });
        } catch (error: any) {
          toast({
            title: "Recorrência não criada",
            description: error?.message || "Não foi possível salvar a recorrência.",
            variant: "destructive",
          });
        }
      }
      setOrderId(result.orderId || "");
      setPaymentCollectionId(result.paymentCollectionId || "");
      setPendingCartId(result.cartId || "");
      setOrderStatus(result.status);
      if (result.status === "completed") {
        await clearCart();
      } else {
        if (result.paymentCollectionId) {
          const pending = getPendingPayments().find(
            (item) => item.payment_collection_id === result.paymentCollectionId
          );
          setPendingDetails(pending?.details || null);
        }
        toast({
          title: "Pagamento pendente",
          description: "Seu carrinho foi reiniciado. Aguardando confirmação do pagamento.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Não foi possível concluir",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pixCode =
    pendingDetails?.pix_code ||
    "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540" +
      orderTotal.toFixed(2) +
      "5802BR5925CONDOMINIO PARQUE FLORES6009SAO PAULO62070503***6304";

  const boletoLine =
    pendingDetails?.boleto_line ||
    "34191.79001 01043.510047 91020.150008 4 12345678901234";

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast({
      title: "Código copiado!",
      description: "Cole o código no seu aplicativo de banco.",
    });
  };

  const copyBoletoLine = () => {
    navigator.clipboard.writeText(boletoLine.replace(/\s/g, ""));
    toast({
      title: "Linha digitável copiada!",
      description: "Cole a linha digitável no seu app de banco.",
    });
  };

  if (orderStatus) {
    return (
      <div 
        className="min-h-full flex items-center justify-center py-8"
        style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${condosBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-md w-full mx-4 border-2 border-border bg-card p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 border-2 border-primary mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {orderStatus === "completed" ? "Pedido Confirmado!" : "Pagamento Pendente"}
          </h1>
          {orderStatus === "completed" ? (
            <p className="text-muted-foreground mb-4">
              Seu pedido <span className="font-bold text-primary">{orderId}</span> foi realizado com sucesso.
            </p>
          ) : (
            <p className="text-muted-foreground mb-4">
              Aguardando confirmação do pagamento. ID da cobrança{" "}
              <span className="font-bold text-primary">
                {paymentCollectionId || "indisponível"}
              </span>
              .
            </p>
          )}
          {!hasPendingInstructions && (
            <div className="mb-6 p-4 border-2 border-border bg-card text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível localizar as instruções desse pagamento. Ele pode ter expirado
                ou já ter sido confirmado.
              </p>
              <Button asChild variant="outline" className="border-2 mt-3">
                <Link to="/orders">Voltar para pedidos</Link>
              </Button>
            </div>
          )}

          {/* PIX Payment Section */}
          {paymentMethod === "pix" && (pendingDetails?.pix_code || pendingDetails?.pix_qr) && (
            <div className="mb-6 p-4 border-2 border-primary/30 bg-primary/5 text-left">
              <p className="text-sm font-medium text-center mb-4">Escaneie o QR Code ou copie o código PIX</p>
              <div className="flex justify-center mb-4">
                <div className="w-40 h-40 bg-background border-2 border-border p-2 flex items-center justify-center">
                  {pendingDetails?.pix_qr ? (
                    <img
                      src={pendingDetails.pix_qr}
                      alt="QR Code PIX"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="0" y="0" width="100" height="100" fill="white"/>
                    <rect x="5" y="5" width="25" height="25" fill="black"/>
                    <rect x="8" y="8" width="19" height="19" fill="white"/>
                    <rect x="11" y="11" width="13" height="13" fill="black"/>
                    <rect x="70" y="5" width="25" height="25" fill="black"/>
                    <rect x="73" y="8" width="19" height="19" fill="white"/>
                    <rect x="76" y="11" width="13" height="13" fill="black"/>
                    <rect x="5" y="70" width="25" height="25" fill="black"/>
                    <rect x="8" y="73" width="19" height="19" fill="white"/>
                    <rect x="11" y="76" width="13" height="13" fill="black"/>
                    <rect x="35" y="5" width="5" height="5" fill="black"/>
                    <rect x="45" y="5" width="5" height="5" fill="black"/>
                    <rect x="55" y="5" width="5" height="5" fill="black"/>
                    <rect x="35" y="15" width="5" height="5" fill="black"/>
                    <rect x="50" y="15" width="5" height="5" fill="black"/>
                    <rect x="60" y="15" width="5" height="5" fill="black"/>
                    <rect x="40" y="25" width="5" height="5" fill="black"/>
                    <rect x="55" y="25" width="5" height="5" fill="black"/>
                    <rect x="5" y="35" width="5" height="5" fill="black"/>
                    <rect x="15" y="35" width="5" height="5" fill="black"/>
                    <rect x="25" y="40" width="5" height="5" fill="black"/>
                    <rect x="5" y="50" width="5" height="5" fill="black"/>
                    <rect x="20" y="50" width="5" height="5" fill="black"/>
                    <rect x="5" y="60" width="5" height="5" fill="black"/>
                    <rect x="15" y="55" width="5" height="5" fill="black"/>
                    <rect x="35" y="35" width="5" height="5" fill="black"/>
                    <rect x="45" y="40" width="10" height="10" fill="black"/>
                    <rect x="60" y="35" width="5" height="5" fill="black"/>
                    <rect x="35" y="55" width="5" height="5" fill="black"/>
                    <rect x="55" y="55" width="5" height="5" fill="black"/>
                    <rect x="70" y="35" width="5" height="5" fill="black"/>
                    <rect x="80" y="40" width="5" height="5" fill="black"/>
                    <rect x="90" y="35" width="5" height="5" fill="black"/>
                    <rect x="75" y="50" width="5" height="5" fill="black"/>
                    <rect x="85" y="55" width="5" height="5" fill="black"/>
                    <rect x="70" y="60" width="5" height="5" fill="black"/>
                    <rect x="35" y="70" width="5" height="5" fill="black"/>
                    <rect x="45" y="75" width="5" height="5" fill="black"/>
                    <rect x="55" y="70" width="5" height="5" fill="black"/>
                    <rect x="40" y="85" width="5" height="5" fill="black"/>
                    <rect x="55" y="90" width="5" height="5" fill="black"/>
                    <rect x="70" y="70" width="25" height="5" fill="black"/>
                    <rect x="70" y="80" width="5" height="5" fill="black"/>
                    <rect x="80" y="80" width="5" height="5" fill="black"/>
                    <rect x="90" y="85" width="5" height="5" fill="black"/>
                    <rect x="75" y="90" width="5" height="5" fill="black"/>
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-3">
                Valor: <span className="font-bold text-foreground">R$ {orderTotal.toFixed(2).replace(".", ",")}</span>
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium">PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <Input 
                    value={pixCode} 
                    readOnly 
                    className="text-xs border-2 bg-background"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="border-2 flex-shrink-0"
                    onClick={copyPixCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className={`flex items-center justify-center gap-2 mt-3 p-2 border-2 ${isPixExpired ? "border-destructive bg-destructive/10" : "border-primary/30 bg-primary/10"}`}>
                <Clock className={`h-4 w-4 ${isPixExpired ? "text-destructive" : "text-primary"}`} />
                {isPixExpired ? (
                  <p className="text-sm font-medium text-destructive">Código expirado</p>
                ) : (
                  <p className="text-sm font-medium">
                    Expira em: <span className="font-bold text-primary">{formatTime(pixExpirationTime)}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {paymentMethod === "boleto" && (pendingDetails?.boleto_line || pendingDetails?.boleto_url) && (
            <div className="mb-6 p-4 border-2 border-primary/30 bg-primary/5 text-left">
              <p className="text-sm font-medium text-center mb-4">Pague com boleto usando a linha digitável</p>
              <div className="space-y-2">
                <p className="text-xs font-medium">Linha digitável:</p>
                <div className="flex gap-2">
                  <Input
                    value={boletoLine}
                    readOnly
                    className="text-xs border-2 bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-2 flex-shrink-0"
                    onClick={copyBoletoLine}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              {pendingDetails?.boleto_url && (
                <Button asChild variant="outline" className="border-2 w-full">
                  <a href={pendingDetails.boleto_url} target="_blank" rel="noreferrer">
                    Abrir boleto
                  </a>
                </Button>
              )}
            </div>
              {pendingDetails?.boleto_expires_at && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Vencimento: {formatUnixDate(pendingDetails.boleto_expires_at)}
                </p>
              )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              O boleto pode levar até 2 dias úteis para compensar.
            </p>
          </div>
        )}

          <p className="text-sm text-muted-foreground mb-6">
            Você pode acompanhar o status do seu pedido na página de pedidos.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/orders">Ver Meus Pedidos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-2">
              <Link to="/dashboard">Continuar Comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${condosBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Finalizar Pedido</h1>

        {items.length === 0 ? (
          <div className="border-2 border-border p-12 bg-card text-center">
            <h3 className="font-bold text-lg mb-2">Carrinho vazio</h3>
            <p className="text-muted-foreground mb-4">
              Adicione itens ao carrinho para continuar.
            </p>
            <Button asChild>
              <Link to="/dashboard">Ir às compras</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Delivery & Payment */}
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery Address */}
                <div className="border-2 border-border p-6 bg-card">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Endereço de Entrega
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="condo">Condomínio</Label>
                      {errors.condo && (
                        <p className="text-sm text-destructive mt-1">{errors.condo}</p>
                      )}
                      <Input
                        id="condo"
                        placeholder="Digite o condomínio"
                        value={deliveryData.condo}
                        onChange={(e) =>
                          setDeliveryData({ ...deliveryData, condo: e.target.value })
                        }
                        className="border-2 mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="observation">Observação (opcional)</Label>
                      <Input
                        id="observation"
                        placeholder="Deixar na portaria, etc."
                        value={deliveryData.observation}
                        onChange={(e) => setDeliveryData({ ...deliveryData, observation: e.target.value })}
                        className="border-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="border-2 border-border p-6 bg-card">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Forma de Pagamento
                  </h2>
                  {errors.paymentMethod && (
                    <p className="text-sm text-destructive mb-3">{errors.paymentMethod}</p>
                  )}
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => {
                      setPaymentMethod(value as PaymentMethod);
                      if (errors.paymentMethod) {
                        setErrors({ ...errors, paymentMethod: undefined });
                      }
                    }}
                    className="space-y-3"
                  >
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                        paymentMethod === "credit" ? "border-primary bg-primary/5" : errors.paymentMethod ? "border-destructive" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="credit" id="credit" />
                      <CreditCard className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="font-medium">Cartão de Crédito/Débito</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Pagamento na entrega
                        </p>
                      </div>
                    </label>
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                        paymentMethod === "pix" ? "border-primary bg-primary/5" : errors.paymentMethod ? "border-destructive" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="pix" id="pix" />
                      <QrCode className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="font-medium">PIX</p>
                        <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                      </div>
                    </label>
                    <label 
                      className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                        paymentMethod === "boleto" ? "border-primary bg-primary/5" : errors.paymentMethod ? "border-destructive" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="boleto" id="boleto" />
                      <Barcode className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="font-medium">Boleto</p>
                        <p className="text-sm text-muted-foreground">Compensação em até 2 dias úteis</p>
                      </div>
                    </label>
                  </RadioGroup>

                </div>

                {!orderStatus && items.length > 0 && (
                  <div className="border-2 border-border p-6 bg-card space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={saveAsRecurring}
                        onCheckedChange={(checked) => setSaveAsRecurring(checked === true)}
                      />
                      <span className="font-medium">Tornar esta compra recorrente</span>
                    </div>
                    {saveAsRecurring && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurrenceName" className="block">Nome da recorrência</Label>
                          <Input
                            id="recurrenceName"
                            className="h-12 border-2"
                            placeholder="Ex: Reposição de limpeza"
                            value={recurrenceName}
                            onChange={(e) => setRecurrenceName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="block">Frequência</Label>
                            <select
                              className="h-12 border-2 rounded-md bg-background px-3 w-full"
                              value={recurrenceFrequency}
                              onChange={(e) =>
                                setRecurrenceFrequency(
                                  e.target.value as "weekly" | "biweekly" | "monthly"
                                )
                              }
                            >
                              <option value="weekly">Semanal</option>
                              <option value="biweekly">Quinzenal</option>
                              <option value="monthly">Mensal</option>
                            </select>
                          </div>
                          {recurrenceFrequency === "monthly" ? (
                            <div className="space-y-2">
                              <Label className="block">Dia do mês</Label>
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
                              <Label className="block">Dia da semana</Label>
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
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-1">
                <div className="border-2 border-border p-6 bg-card sticky top-4">
                  <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                  
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 border-2 border-border overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-sm">
                          R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete</span>
                      <span className="text-primary font-medium">Grátis</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-border">
                      <span>Total</span>
                      <span className="text-primary">
                        R$ {totalPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processando..." : "Confirmar Pedido"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Checkout;
