import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { resolveBusinessBackground } from "@/lib/business-background";
import {
  completeCart,
  createRecurrence,
  earnCompanyPoints,
  fetchSavedPaymentMethodsFromBackend,
  fetchPendingPaymentsFromBackend,
  getActiveCondo,
  getCustomerMe,
  getPendingPayments,
  mergePendingPayments,
  PendingPaymentDetails,
  SavedPaymentMethod,
  formatMoney,
  getTokenValue,
  listShippingOptions,
  removePendingPayment,
  removePendingPaymentFromBackend,
  retrieveCart,
  upsertSavedPaymentMethod,
} from "@/lib/medusa";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type PaymentMethod = "credit" | "pix" | "boleto";
type RecurrenceOption = "unica" | "semanal" | "quinzenal" | "mensal";

const ENABLE_PIX = import.meta.env.VITE_ENABLE_PIX === "true";

const Checkout = () => {
  const { items, totalPrice, clearCart, completeBackendCheckout, cartId, isCartLoading } = useCart();
  const { terms, activeBusinessType, activeBusinessTypeKey, resolvePaymentPolicy } = useBusinessTerms();
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
  const [errors, setErrors] = useState<{
    paymentMethod?: string;
    condo?: string;
    shippingMethod?: string;
  }>({});
  const [pixExpiresAfterDays, setPixExpiresAfterDays] = useState(15);
  const [recurrenceByItem, setRecurrenceByItem] = useState<Record<string, RecurrenceOption>>({});
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [billingEmails, setBillingEmails] = useState<string[]>([]);
  const [shippingOptions, setShippingOptions] = useState<{ id: string; name?: string }[]>([]);
  const [shippingOptionId, setShippingOptionId] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [boletoExpiresAfterDays, setBoletoExpiresAfterDays] = useState(3);
  const activeCondo = getActiveCondo();
  const paymentPolicy = resolvePaymentPolicy(activeCondo?.business_type || null);
  const allowedPaymentMethods = (
    [
      paymentPolicy.methods.credit ? "credit" : null,
      ENABLE_PIX && paymentPolicy.methods.pix ? "pix" : null,
      paymentPolicy.methods.boleto ? "boleto" : null,
    ] as Array<PaymentMethod | null>
  ).filter(Boolean) as PaymentMethod[];
  const availableBoletoDays = paymentPolicy.boleto.allowedDays;
  const availablePixDays = paymentPolicy.pix.allowedDays;
  const availableSavedMethods = savedPaymentMethods.filter(
    (method) =>
      allowedPaymentMethods.includes(method.type) &&
      (ENABLE_PIX || method.type !== "pix")
  );

  useEffect(() => {
    if (paymentMethod !== "pix") return;
    if (!availablePixDays.includes(pixExpiresAfterDays)) {
      setPixExpiresAfterDays(paymentPolicy.pix.defaultDay);
    }
  }, [paymentMethod, pixExpiresAfterDays, availablePixDays, paymentPolicy.pix.defaultDay]);

  useEffect(() => {
    const pendingId = searchParams.get("pending");
    if (!pendingId || orderStatus) return;

    toast({
      title: "Pagamento pendente",
      description: "Confira as instruções na tela de pedidos.",
    });
    navigate("/orders");
  }, [orderStatus, paymentMethod, searchParams]);

  useEffect(() => {
    if (paymentMethod) return;
    const method = searchParams.get("method");
    if (
      (method === "credit" && allowedPaymentMethods.includes("credit")) ||
      (method === "pix" && ENABLE_PIX && allowedPaymentMethods.includes("pix")) ||
      (method === "boleto" && allowedPaymentMethods.includes("boleto"))
    ) {
      setPaymentMethod(method);
    }
  }, [paymentMethod, searchParams, ENABLE_PIX, allowedPaymentMethods]);

  useEffect(() => {
    const normalizeEmails = (value: unknown) => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === "string" && value.trim()) {
        return value
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean);
      }
      return [];
    };
    const active = getActiveCondo();
    setBillingEmails(normalizeEmails(active?.billing_emails));
    fetchSavedPaymentMethodsFromBackend().then(setSavedPaymentMethods);
    getCustomerMe()
      .then((data) => setCustomerEmail(data?.customer?.email || ""))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (paymentMethod) return;
    const savedDefault =
      availableSavedMethods.find((method) => method.is_default) || availableSavedMethods[0];
    if (savedDefault) {
      setPaymentMethod(savedDefault.type);
      if (savedDefault.type === "boleto") {
        const days = savedDefault.details?.boleto_expires_after_days;
        if (typeof days === "number" && availableBoletoDays.includes(days)) {
          setBoletoExpiresAfterDays(days);
        }
      }
      return;
    }
    setPaymentMethod(allowedPaymentMethods[0] || "");
  }, [
    paymentMethod,
    availableSavedMethods,
    availableBoletoDays,
    allowedPaymentMethods,
  ]);

  useEffect(() => {
    if (paymentMethod && !allowedPaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(allowedPaymentMethods[0] || "");
    }
  }, [paymentMethod, allowedPaymentMethods]);

  useEffect(() => {
    if (paymentMethod !== "boleto") return;
    if (!availableBoletoDays.includes(boletoExpiresAfterDays)) {
      setBoletoExpiresAfterDays(paymentPolicy.boleto.defaultDay);
    }
  }, [paymentMethod, boletoExpiresAfterDays, availableBoletoDays, paymentPolicy.boleto.defaultDay]);

  useEffect(() => {
    if (!cartId) return;
    let active = true;
    const loadOptions = async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const options = await listShippingOptions(cartId);
        if (!active) return;
        setShippingOptions(options);
        if (!shippingOptionId && options.length) {
          const preferred =
            options.find((opt) => /retira|buscar|pickup/i.test(opt.name || "")) ||
            options.find((opt) => /1\\s?dia|express|rápida|rapida/i.test(opt.name || "")) ||
            options[0];
          if (preferred?.id) setShippingOptionId(preferred.id);
        }
      } catch (err: any) {
        if (!active) return;
        setShippingError(err?.message || "Não foi possível carregar opções de entrega.");
      } finally {
        if (active) setShippingLoading(false);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, [cartId, shippingOptionId]);

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
    if (orderStatus !== "pending" || !pendingCartId) return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let retry: number | null = null;
    let attempts = 0;
    const WS_URL = import.meta.env.VITE_PAYMENTS_WS_URL || import.meta.env.VITE_ORDERS_WS_URL || "";

    const clearRetry = () => {
      if (retry) {
        window.clearTimeout(retry);
        retry = null;
      }
    };

    const finalizePendingIfPaid = async () => {
      try {
        const cart = await retrieveCart(pendingCartId);
        if (!isPaymentSucceeded(cart)) return;
        const newOrderId = await completeCart(pendingCartId);
        if (!cancelled && newOrderId) {
          setOrderId(newOrderId);
          setOrderStatus("completed");
          removePendingPayment({ cart_id: pendingCartId });
          await removePendingPaymentFromBackend({ cart_id: pendingCartId });
          await clearCart();
          const activeCondo = getActiveCondo();
          if (activeCondo?.id) {
            try {
              await earnCompanyPoints(activeCondo.id, newOrderId);
            } catch {
              // Ignore points failures in realtime flow
            }
          }
        }
      } catch {
        // keep pending state; next ws event will retry
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
          finalizePendingIfPaid().catch(() => undefined);
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"));
            const type = String(payload?.type || payload?.event || "").toLowerCase();
            const eventCartId =
              payload?.cart_id || payload?.data?.cart_id || payload?.order?.cart_id || null;
            if (eventCartId && String(eventCartId) !== String(pendingCartId)) return;
            if (type.includes("payment") || type.includes("order") || type.includes("cart")) {
              finalizePendingIfPaid().catch(() => undefined);
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
  }, [orderStatus, pendingCartId, clearCart]);

  const formatUnixDate = (value?: number) => {
    if (!value) return "";
    const date = new Date(value * 1000);
    return date.toLocaleDateString("pt-BR");
  };

  const resolveShippingLabel = (name?: string | null) => {
    const value = (name || "").toLowerCase();
    if (/(retira|buscar|pickup)/i.test(value)) return "Buscar na loja";
    if (/(1\\s?dia|express|rápida|rapida)/i.test(value)) return "Receber em um dia";
    return name || "Entrega";
  };

  const pixExpiresAt = pendingDetails?.pix_expires_at;

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
    const newErrors: { paymentMethod?: string; condo?: string; shippingMethod?: string } = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = "Selecione uma forma de pagamento";
    }
    if (!deliveryData.condo?.trim()) {
      newErrors.condo = `Informe ${terms.articleSingular} ${terms.labelLower}`;
    }
    if (!shippingOptionId) {
      newErrors.shippingMethod = "Selecione uma forma de entrega";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    setRecurrenceByItem((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = "unica";
        }
      });
      Object.keys(next).forEach((id) => {
        if (!items.some((item) => item.id === id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [items]);

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
      const shippingAddress = {
      first_name: terms.label,
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
          boleto_expires_after_days:
            paymentMethod === "boleto" ? boletoExpiresAfterDays : undefined,
          pix_expires_after_days:
            paymentMethod === "pix" ? pixExpiresAfterDays : undefined,
        },
      };

      const result = await completeBackendCheckout(
        shippingAddress,
        paymentMethod,
        shippingOptionId || null,
        paymentMethod === "boleto"
          ? { boletoExpiresAfterDays }
          : paymentMethod === "pix"
            ? { pixExpiresAfterDays }
            : undefined
      );
      const recurringItems = items.filter(
        (item) => recurrenceByItem[item.id] && recurrenceByItem[item.id] !== "unica"
      );
      if (recurringItems.length) {
        try {
          for (const item of recurringItems) {
            const selectedRecurrence = recurrenceByItem[item.id];
            const frequency =
              selectedRecurrence === "semanal"
                ? "weekly"
                : selectedRecurrence === "quinzenal"
                  ? "biweekly"
                  : "monthly";
            await createRecurrence({
              name: `Recorrência ${item.name || activeCondo?.name || ""}`.trim(),
              frequency,
              payment_method: paymentMethod,
              items: [
                {
                  variant_id: item.variantId,
                  product_id: item.productId,
                  quantity: item.quantity,
                  title: item.name,
                  price: item.price,
                  category: item.category,
                },
              ],
              company_id: activeCondo?.id || null,
            });
          }
          toast({
            title: "Recorrência criada",
            description: "Os produtos recorrentes foram salvos com sucesso.",
          });
        } catch (error: any) {
          toast({
            title: "Recorrência não criada",
            description: error?.message || "Não foi possível salvar a recorrência.",
            variant: "destructive",
          });
        }
      }

      try {
        const boletoEmailsResolved = billingEmails.length
          ? billingEmails.join(", ")
          : customerEmail || "";
        const label =
          paymentMethod === "credit"
            ? "Cartão"
            : paymentMethod === "pix"
              ? "PIX"
              : boletoEmailsResolved
                ? `Boleto (${boletoEmailsResolved})`
                : "Boleto";
        await upsertSavedPaymentMethod({
          type: paymentMethod,
          label,
          details:
            paymentMethod === "boleto"
              ? {
                  email: boletoEmailsResolved || undefined,
                  boleto_expires_after_days: boletoExpiresAfterDays,
                }
              : undefined,
          setDefault: true,
        });
      } catch {
        // Ignore failures to persist payment method
      }
      if (result.status === "completed") {
        setOrderId(result.orderId || "");
        setPaymentCollectionId(result.paymentCollectionId || "");
        setPendingCartId(result.cartId || "");
        setOrderStatus(result.status);
        await clearCart();
      } else {
        toast({
          title: "Pagamento pendente",
          description: "Confira as instruções na tela de pedidos.",
        });
        navigate("/orders");
        return;
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
      (orderTotal / 100).toFixed(2) +
      "5802BR5925CONDOMINIO PARQUE FLORES6009SAO PAULO62070503***6304";

  const boletoLine =
    pendingDetails?.boleto_line ||
    "34191.79001 01043.510047 91020.150008 4 12345678901234";

  const boletoEmailList = billingEmails.length
    ? billingEmails
    : customerEmail
      ? [customerEmail]
      : [];
  const boletoEmailText = boletoEmailList.length ? boletoEmailList.join(", ") : "E-mail não informado";

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
          backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.78), hsl(var(--background) / 0.86)), url(${resolveBusinessBackground(activeBusinessTypeKey, terms.labelLower, activeBusinessType?.terms || null)})`,
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
                Valor: <span className="font-bold text-foreground">{formatMoney(orderTotal)}</span>
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
              {(pixExpiresAt || pendingDetails?.pix_expires_after_days) && (
                <div className="flex items-center justify-center gap-2 mt-3 p-2 border-2 border-primary/30 bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                  {pixExpiresAt ? (
                    <p className="text-sm font-medium">
                      Vencimento:{" "}
                      <span className="font-bold text-primary">{formatUnixDate(pixExpiresAt)}</span>
                    </p>
                  ) : (
                    <p className="text-sm font-medium">
                      Prazo selecionado:{" "}
                      <span className="font-bold text-primary">
                        {pendingDetails?.pix_expires_after_days}{" "}
                        {pendingDetails?.pix_expires_after_days === 1 ? "dia" : "dias"}
                      </span>
                    </p>
                  )}
                </div>
              )}
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
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.78), hsl(var(--background) / 0.86)), url(${resolveBusinessBackground(activeBusinessTypeKey, terms.labelLower, activeBusinessType?.terms || null)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Finalizar Pedido</h1>

        {isCartLoading ? (
          <div className="border-2 border-border p-12 bg-card text-center" data-testid="checkout-loading">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size={18} />
              <span>Carregando carrinho...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="border-2 border-border p-12 bg-card text-center" data-testid="checkout-empty">
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
                      <Label htmlFor="condo">{terms.label}</Label>
                      {errors.condo && (
                        <p className="text-sm text-destructive mt-1">{errors.condo}</p>
                      )}
                      <Input
                        id="condo"
                        placeholder={`Digite ${terms.articleSingular} ${terms.labelLower}`}
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

                {/* Delivery Method */}
                <div className="border-2 border-border p-6 bg-card">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Método de Entrega
                  </h2>
                  {errors.shippingMethod && (
                    <p className="text-sm text-destructive mb-3">{errors.shippingMethod}</p>
                  )}
                  {shippingError && (
                    <p className="text-sm text-destructive mb-3">{shippingError}</p>
                  )}
                  {shippingLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoadingSpinner size={18} />
                      <span>Carregando opções...</span>
                    </div>
                  ) : shippingOptions.length === 0 ? (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Sem opções de entrega disponíveis para este carrinho.</p>
                      <p>
                        Cadastre no admin:{" "}
                        <span className="font-medium">Configurações → Logística → Opções de envio</span>.
                      </p>
                    </div>
                  ) : (
                    <RadioGroup
                      value={shippingOptionId}
                      onValueChange={(value) => {
                        setShippingOptionId(value);
                        if (errors.shippingMethod) {
                          setErrors({ ...errors, shippingMethod: undefined });
                        }
                      }}
                      className="space-y-3"
                    >
                      {shippingOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                            shippingOptionId === option.id
                              ? "border-primary bg-primary/5"
                              : errors.shippingMethod
                                ? "border-destructive"
                                : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value={option.id} id={`ship-${option.id}`} />
                          <div>
                            <p className="font-medium">{resolveShippingLabel(option.name)}</p>
                            {option.name && (
                              <p className="text-sm text-muted-foreground">{option.name}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
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
                  {allowedPaymentMethods.length === 0 && (
                    <p className="text-sm text-destructive mb-3">
                      Nenhuma forma de pagamento está liberada para o segmento {terms.articleSingular} {terms.labelLower}.
                    </p>
                  )}
                  {availableSavedMethods.length > 0 && (
                    <div className="mb-4 border-2 border-border p-3 bg-background/40">
                      <p className="text-xs text-muted-foreground mb-2">Métodos salvos</p>
                      <div className="space-y-2">
                        {availableSavedMethods.map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className={`w-full text-left p-2 border-2 transition-colors ${
                              paymentMethod === method.type
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setPaymentMethod(method.type)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{method.label}</span>
                              {method.is_default && (
                                <span className="text-xs text-muted-foreground">Padrão</span>
                              )}
                            </div>
                            {method.type === "boleto" &&
                              method.details?.boleto_expires_after_days && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Vencimento: {method.details.boleto_expires_after_days}{" "}
                                  {method.details.boleto_expires_after_days === 1
                                    ? "dia"
                                    : "dias"}
                                </p>
                              )}
                          </button>
                        ))}
                      </div>
                    </div>
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
                    {allowedPaymentMethods.includes("credit") && (
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
                    )}
                    {ENABLE_PIX && allowedPaymentMethods.includes("pix") && (
                      <label 
                        className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                          paymentMethod === "pix" ? "border-primary bg-primary/5" : errors.paymentMethod ? "border-destructive" : "border-border hover:border-primary/50"
                        }`}
                        data-testid="checkout-payment-pix"
                      >
                        <RadioGroupItem value="pix" id="pix" />
                        <QrCode className="h-5 w-5" />
                        <div className="flex-1">
                          <p className="font-medium">PIX</p>
                          <p className="text-sm text-muted-foreground">
                            Vencimento em {pixExpiresAfterDays} dias
                          </p>
                          {paymentMethod === "pix" && (
                            <div className="mt-3">
                              <Label className="text-xs">Prazo de vencimento</Label>
                              <select
                                className="mt-1 h-10 border-2 rounded-md bg-background px-3 w-full text-sm"
                                value={pixExpiresAfterDays}
                                onChange={(e) => setPixExpiresAfterDays(Number(e.target.value))}
                              >
                                {availablePixDays.map((days) => (
                                  <option key={days} value={days}>
                                    {days} {days === 1 ? "dia" : "dias"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </label>
                    )}
                    {allowedPaymentMethods.includes("boleto") && (
                      <label 
                        className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${
                          paymentMethod === "boleto" ? "border-primary bg-primary/5" : errors.paymentMethod ? "border-destructive" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem value="boleto" id="boleto" />
                        <Barcode className="h-5 w-5" />
                        <div className="flex-1">
                          <p className="font-medium">Boleto</p>
                          <p className="text-sm text-muted-foreground">
                            Vencimento em {boletoExpiresAfterDays} dias
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enviaremos o boleto para:{" "}
                            <span className="font-semibold text-foreground">{boletoEmailText}</span>
                          </p>
                          {paymentMethod === "boleto" && (
                            <div className="mt-3">
                              <Label className="text-xs">Prazo de vencimento</Label>
                              <select
                                className="mt-1 h-10 border-2 rounded-md bg-background px-3 w-full text-sm"
                                value={boletoExpiresAfterDays}
                                onChange={(e) => setBoletoExpiresAfterDays(Number(e.target.value))}
                              >
                                {availableBoletoDays.map((days) => (
                                  <option key={days} value={days}>
                                    {days} {days === 1 ? "dia" : "dias"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </label>
                    )}
                  </RadioGroup>

                </div>

              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-1">
                <div className="border-2 border-border p-6 bg-card sticky top-4">
                  <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                  
                  <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
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
                          {!orderStatus && (
                            <div className="mt-2 space-y-2">
                              <span className="text-xs text-muted-foreground">Recorrência</span>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: "unica", title: "Única" },
                                  { id: "semanal", title: "Semanal" },
                                  { id: "quinzenal", title: "Quinzenal" },
                                  { id: "mensal", title: "Mensal" },
                                ].map((option) => {
                                  const active = recurrenceByItem[item.id] === option.id;
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() =>
                                        setRecurrenceByItem((current) => ({
                                          ...current,
                                          [item.id]: option.id as RecurrenceOption,
                                        }))
                                      }
                                      className={`px-2 py-1 text-xs border-2 transition-colors ${
                                        active
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border text-muted-foreground hover:border-primary/50"
                                      }`}
                                    >
                                      {option.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-sm">
                          {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatMoney(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete</span>
                      <span className="text-primary font-medium">Grátis</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-border">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatMoney(totalPrice)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    size="lg"
                    disabled={isProcessing}
                    data-testid="checkout-submit"
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
