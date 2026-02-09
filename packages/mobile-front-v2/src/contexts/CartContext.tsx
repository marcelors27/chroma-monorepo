import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStripe } from "@stripe/stripe-react-native";
import {
  addShippingMethod,
  addLineItem,
  completeCart,
  createCart,
  deleteLineItem,
  earnCompanyPoints,
  ensureCart,
  listShippingOptions,
  mapCartToItems,
  notifyPendingPayment,
  PendingPayment,
  PendingPaymentDetails,
  retrieveCart,
  removePendingPayment,
  removePendingPaymentFromBackend,
  getPendingPayments,
  confirmStripePaymentServerSide,
  createPaymentSessions,
  setCartShippingAddress,
  setPaymentSession,
  setPendingPayment,
  syncPendingPaymentToBackend,
  updateLineItem,
} from "@/lib/medusa";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";

const DEBUG = process.env.EXPO_PUBLIC_DEBUG_FRONT === "true";
const ENABLE_PIX = process.env.EXPO_PUBLIC_ENABLE_PIX === "true";
const PIX_PROVIDER = process.env.EXPO_PUBLIC_PIX_PROVIDER || "stripe";

export interface CartItem {
  productId: string;
  variantId: string;
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
}

export interface AddItemInput {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  category?: string;
  image?: string;
  quantity?: number;
}

interface CartContextType {
  cartId: string | null;
  items: CartItem[];
  itemsCount: number;
  lastAddId: number;
  lastAddQty: number;
  addItem: (product: AddItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isAddingItem: boolean;
  completeBackendCheckout: (
    address: Record<string, any>,
    paymentMethod: string,
    shippingOptionId?: string | null,
    options?: { boletoExpiresAfterDays?: number; pixExpiresAfterDays?: number }
  ) => Promise<{
    status: "completed" | "pending";
    orderId?: string | null;
    pendingDetails?: PendingPaymentDetails;
    pendingPayment?: PendingPayment;
  }>;
  finalizePendingBoleto: (clientSecret: string) => Promise<{ status: "pending" | "completed"; orderId?: string | null }>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutLocked, setCheckoutLocked] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [lastAddId, setLastAddId] = useState(0);
  const [lastAddQty, setLastAddQty] = useState(1);
  const { initPaymentSheet, presentPaymentSheet, retrievePaymentIntent, confirmPayment } = useStripe();
  const { activeCondo } = useCondo();

  useEffect(() => {
    refreshCart();
  }, []);

  const refreshCart = async () => {
    if (DEBUG) console.debug("[cart] refreshCart:start");
    try {
      const cart = await ensureCart();
      if (DEBUG) console.debug("[cart] refreshCart:loaded", { cartId: cart?.id, items: cart?.items?.length });
      setCartId(cart?.id || null);
      setItems(mapCartToItems(cart));
    } catch (err: any) {
      if (DEBUG) console.debug("[cart] refreshCart:error", err?.message || err);
      setCartId(null);
      setItems([]);
    }
  };

  const addItem = async (product: AddItemInput) => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] addItem", product);
    setIsAddingItem(true);
    try {
      const cart = await ensureCart();
      if (!cart?.id) throw new Error("Carrinho não encontrado");
      setCartId(cart.id);

      const existing = items.find((item) => item.variantId === product.variantId);
      const nextQty = (existing?.quantity || 0) + (product.quantity || 1);

      const updatedCart = existing
        ? await updateLineItem(cart.id, existing.id, nextQty)
        : await addLineItem(cart.id, product.variantId, product.quantity || 1, {
            display_name: product.name,
            category: product.category,
          });

      setItems(mapCartToItems(updatedCart));
      setLastAddQty(product.quantity || 1);
      setLastAddId((prev) => prev + 1);
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("payment sessions")) {
        const nextItems = (() => {
          const existing = items.find((item) => item.variantId === product.variantId);
          if (existing) {
            return items.map((item) =>
              item.variantId === product.variantId
                ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                : item
            );
          }
          return [
            ...items,
            {
              id: "",
              productId: product.productId,
              variantId: product.variantId,
              name: product.name,
              price: product.price,
              category: product.category || "",
              image: product.image || "",
              quantity: product.quantity || 1,
            },
          ];
        })();
        await rebuildCartWithItems(nextItems);
        return;
      }
      if (DEBUG) console.debug("[cart] addItem:error", err?.message || err);
      toast({
        title: "Não foi possível adicionar",
        description: err?.message || "Verifique se há estoque disponível.",
        variant: "destructive",
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const removeItem = async (id: string) => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] removeItem", { id, cartId });
    if (!cartId) return;
    try {
      const updatedCart = await deleteLineItem(cartId, id);
      setItems(mapCartToItems(updatedCart));
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("payment sessions")) {
        const nextItems = items.filter((item) => item.id !== id);
        await rebuildCartWithItems(nextItems);
        return;
      }
      if (DEBUG) console.debug("[cart] removeItem:error", err?.message || err);
      toast({
        title: "Erro ao remover",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] updateQuantity", { id, quantity, cartId });
    if (!cartId) return;
    if (quantity <= 0) return removeItem(id);
    try {
      const updatedCart = await updateLineItem(cartId, id, quantity);
      setItems(mapCartToItems(updatedCart));
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("payment sessions")) {
        const nextItems =
          quantity <= 0
            ? items.filter((item) => item.id !== id)
            : items.map((item) =>
                item.id === id ? { ...item, quantity } : item
              );
        await rebuildCartWithItems(nextItems);
        return;
      }
      if (DEBUG) console.debug("[cart] updateQuantity:error", err?.message || err);
      toast({
        title: "Não foi possível atualizar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const rebuildCartWithItems = async (nextItems: CartItem[]) => {
    const newCart = await createCart();
    if (!newCart?.id) return;
    for (const item of nextItems) {
      try {
        await addLineItem(newCart.id, item.variantId, item.quantity, {
          display_name: item.name,
          category: item.category,
        });
      } catch (err: any) {
        if (DEBUG) console.debug("[cart] rebuild:addLineItem:error", err?.message || err);
      }
    }
    const refreshed = await retrieveCart(newCart.id);
    setCartId(newCart.id);
    setItems(mapCartToItems(refreshed));
  };

  const clearCart = async () => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] clearCart", { cartId });
    setCartId(null);
    setItems([]);
    await createCart();
  };

  const resetCartAfterPending = async () => {
    setCartId(null);
    setItems([]);
    await createCart();
    await refreshCart();
  };

  const resolvePaymentProvider = (
    paymentMethod: string,
    options?: { boletoExpiresAfterDays?: number; pixExpiresAfterDays?: number }
  ) => {
    switch (paymentMethod) {
      case "credit":
        return {
          providerId: "pp_stripe_stripe",
          data: { payment_method_types: ["card"], capture_method: "automatic" },
        };
      case "boleto":
        return {
          providerId: "pp_stripe_stripe",
          data: {
            payment_method_types: ["boleto"],
            capture_method: "automatic",
            payment_method_options: options?.boletoExpiresAfterDays
              ? { boleto: { expires_after_days: options.boletoExpiresAfterDays } }
              : undefined,
          },
        };
      case "pix":
        if (!ENABLE_PIX) {
          throw new Error("PIX não habilitado.");
        }
        if (PIX_PROVIDER === "manual") {
          return {
            providerId: "pp_pix_manual_pix_manual",
            data: {
              payment_method_types: ["pix"],
              payment_method_type: "pix",
              pix_expires_after_days: options?.pixExpiresAfterDays,
            },
          };
        }
        return {
          providerId: "pp_stripe_stripe",
          data: { payment_method_types: ["pix"], capture_method: "automatic" },
        };
      default:
        return { providerId: "manual" };
    }
  };

  const findStripeSession = (collection: any, providerId: string) => {
    if (!collection?.payment_sessions?.length) return null;
    return (
      collection.payment_sessions.find(
        (session: any) => session?.provider_id === providerId || session?.provider_id?.startsWith("pp_stripe")
      ) || null
    );
  };

  const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

  const buildBillingDetails = () => {
    if (!activeCondo) return null;
    const email =
      activeCondo.billingEmails?.find(Boolean) || activeCondo.email || undefined;
    const phone = activeCondo.phone || undefined;
    const line1 = [activeCondo.address, activeCondo.number].filter(Boolean).join(", ");
    const line2 = activeCondo.complemento || undefined;
    const city = activeCondo.city || undefined;
    const state = activeCondo.state || undefined;
    const postalCode = normalizeDigits(activeCondo.zip);
    const country = "BR";

    return {
      name: activeCondo.razaoSocial || activeCondo.name || "Condomínio",
      email,
      phone,
      address: {
        line1: line1 || undefined,
        line2,
        city,
        state,
        postalCode: postalCode || undefined,
        country,
      },
      cnpj: normalizeDigits(activeCondo.cnpj),
    };
  };

  const extractStripeDetailsFromIntent = (intent: Record<string, any> | null | undefined) => {
    if (!intent) return {};
    const nextAction = intent?.next_action || {};
    const boleto = nextAction?.boleto_display_details || {};
    const pix = nextAction?.pix_display_qr_code || nextAction?.pix_display_details || {};
    const qrImage =
      boleto?.qr_code?.image_url ||
      boleto?.qr_code_url ||
      boleto?.qr_code ||
      boleto?.image_url;
    return {
      boleto_line: boleto?.number || boleto?.barcode || boleto?.line,
      boleto_url: boleto?.hosted_voucher_url || boleto?.url,
      boleto_expires_at: boleto?.expires_at,
      boleto_qr: qrImage,
      pix_code: pix?.data || pix?.emv || pix?.qr_code?.data,
      pix_qr: pix?.image_url || pix?.qr_code?.image_url || pix?.image,
    };
  };

  const extractManualPixDetailsFromSession = (session: any) => {
    const data = session?.data || {};
    return {
      pix_code: data?.pix_code,
      pix_qr: data?.pix_qr,
      pix_txid: data?.pix_txid,
      pix_expires_at: data?.pix_expires_at,
      pix_expires_after_days: data?.pix_expires_after_days,
    };
  };

  const confirmBoletoPayment = async (clientSecret: string) => {
    const billingDetails = buildBillingDetails();
    const taxId = normalizeDigits(billingDetails?.cnpj);
    const hasAddress =
      Boolean(billingDetails?.address?.line1) &&
      Boolean(billingDetails?.address?.city) &&
      Boolean(billingDetails?.address?.state) &&
      Boolean(billingDetails?.address?.postalCode);
    if (!billingDetails?.name || !hasAddress) {
      throw new Error("Endereço do condomínio incompleto para gerar boleto.");
    }
    if (!taxId) {
      throw new Error("CNPJ do condomínio não informado.");
    }
    const response = await confirmStripePaymentServerSide({
      client_secret: clientSecret,
      payment_method: "boleto",
      billing_details: {
        name: billingDetails.name,
        email: billingDetails.email,
        phone: billingDetails.phone,
        address: billingDetails.address,
      },
      tax_id: taxId,
    });
    return {
      paymentIntent: response?.payment_intent,
      details: {
        ...extractStripeDetailsFromIntent(response?.payment_intent || null),
        client_secret: clientSecret,
      },
    };
  };

  const confirmPixPayment = async (clientSecret: string) => {
    const billingDetails = buildBillingDetails();
    const response = await confirmStripePaymentServerSide({
      client_secret: clientSecret,
      payment_method: "pix",
      billing_details: {
        name: billingDetails?.name,
        email: billingDetails?.email,
      },
    });
    return {
      paymentIntent: response?.payment_intent,
      details: {
        ...extractStripeDetailsFromIntent(response?.payment_intent || null),
        client_secret: clientSecret,
      },
    };
  };

  const applyPointsToOrder = async (orderId?: string | null, cartSnapshot?: any) => {
    if (!orderId) return;
    const companyId =
      cartSnapshot?.shipping_address?.metadata?.company_id ||
      cartSnapshot?.shipping_address?.metadata?.condo_id;
    if (!companyId) return;
    try {
      await earnCompanyPoints(companyId, orderId);
    } catch (err: any) {
      if (DEBUG) console.debug("[cart] points:error", err?.message || err);
    }
  };

  const finalizePendingBoleto = async (clientSecret: string) => {
    try {
      const intentResult = await retrievePaymentIntent(clientSecret);
      const status = intentResult?.paymentIntent?.status;
      if (status !== "succeeded") {
        return { status: "pending" as const };
      }
      const pendingList = await getPendingPayments();
      const match = pendingList.find((item) => item?.details?.client_secret === clientSecret);
      if (match?.payment_collection_id) {
        await removePendingPayment({ payment_collection_id: match.payment_collection_id });
        await removePendingPaymentFromBackend({ payment_collection_id: match.payment_collection_id });
      }
      return { status: "completed" as const };
    } catch (err: any) {
      if (DEBUG) console.debug("[cart] finalizePendingBoleto:error", err?.message || err);
      return { status: "pending" as const };
    }
  };

  const completeBackendCheckout = async (
    address: Record<string, any>,
    paymentMethod: string,
    shippingOptionId?: string | null,
    options?: { boletoExpiresAfterDays?: number; pixExpiresAfterDays?: number }
  ) => {
    if (DEBUG)
      console.debug("[cart] completeBackendCheckout:start", { cartId, address, paymentMethod, shippingOptionId });
    if (!cartId) throw new Error("Carrinho não encontrado");
    try {
      const applyPoints = async (orderId?: string | null, snapshot?: any) => {
        await applyPointsToOrder(orderId, snapshot);
      };
      const { providerId, data } = resolvePaymentProvider(paymentMethod, options);
      let cartSnapshot = await retrieveCart(cartId);
      if (!cartSnapshot?.id) {
        throw new Error("Carrinho não encontrado");
      }
      if (
        paymentMethod === "boleto" &&
        options?.boletoExpiresAfterDays &&
        cartSnapshot?.shipping_address?.address_1 &&
        cartSnapshot?.shipping_address?.metadata?.boleto_expires_after_days !==
          options.boletoExpiresAfterDays
      ) {
        cartSnapshot = await setCartShippingAddress(cartSnapshot.id, address);
      }
      if (!cartSnapshot?.shipping_address?.address_1) {
        cartSnapshot = await setCartShippingAddress(cartSnapshot.id, address);
      }
      if (!cartSnapshot?.shipping_methods?.length) {
        if (shippingOptionId) {
          cartSnapshot = await addShippingMethod(cartSnapshot.id, shippingOptionId);
        } else {
          const options = await listShippingOptions(cartSnapshot.id);
          const fallback = options?.[0]?.id;
          if (!fallback) {
            throw new Error("Nenhum metodo de entrega disponivel.");
          }
          cartSnapshot = await addShippingMethod(cartSnapshot.id, fallback);
        }
      }

      const collection = await createPaymentSessions(cartSnapshot.id);
      if (data && typeof data === "object") {
        data.payment_collection_id = collection?.id || undefined;
      }
      const paymentCollection = await setPaymentSession(cartSnapshot.id, providerId, data);

      if (providerId.startsWith("pp_stripe")) {
        const session = findStripeSession(paymentCollection, providerId);
        const clientSecret =
          session?.data?.client_secret ||
          session?.data?.payment_intent?.client_secret ||
          session?.data?.payment_intent?.payment_intent?.client_secret;
        if (!clientSecret) {
          throw new Error("Session do Stripe sem client_secret.");
        }

        if (paymentMethod === "boleto") {
          const { paymentIntent, details } = await confirmBoletoPayment(clientSecret);
          const status = paymentIntent?.status;
          if (status !== "succeeded") {
            if (DEBUG) console.debug("[cart] completeBackendCheckout:stripe-pending", { status });
            const pending: PendingPayment = {
              cart_id: cartSnapshot.id,
              payment_collection_id: paymentCollection?.id || "",
              method: paymentMethod,
              created_at: new Date().toISOString(),
              details: {
                ...details,
                method: paymentMethod,
                company_id: address?.metadata?.company_id || address?.metadata?.condo_id,
                company_name: address?.metadata?.company_name || address?.address_1,
                amount: cartSnapshot?.total,
                currency_code: cartSnapshot?.currency_code,
                boleto_expires_after_days: options?.boletoExpiresAfterDays,
              },
            };
            await setPendingPayment(pending);
            await syncPendingPaymentToBackend(pending);
            try {
              await notifyPendingPayment({
                payment_method: paymentMethod,
                payment_collection_id: pending.payment_collection_id,
                company_id:
                  address?.metadata?.company_id ||
                  pending.details?.company_id ||
                  address?.metadata?.condo_id ||
                  null,
                details: pending.details,
              });
            } catch (err: any) {
              if (DEBUG) console.debug("[cart] notifyPendingPayment:error", err?.message || err);
            }
            const orderId = await completeCart(cartSnapshot.id);
            await resetCartAfterPending();
            return { status: "pending", orderId, pendingDetails: details, pendingPayment: pending };
          }
        } else if (paymentMethod === "pix") {
          const { paymentIntent, details } = await confirmPixPayment(clientSecret);
          const status = paymentIntent?.status;
          if (status !== "succeeded") {
            if (DEBUG) console.debug("[cart] completeBackendCheckout:stripe-pending", { status });
            const pending: PendingPayment = {
              cart_id: cartSnapshot.id,
              payment_collection_id: paymentCollection?.id || "",
              method: paymentMethod,
              created_at: new Date().toISOString(),
              details: {
                ...details,
                method: paymentMethod,
                company_id: address?.metadata?.company_id || address?.metadata?.condo_id,
                company_name: address?.metadata?.company_name || address?.address_1,
                amount: cartSnapshot?.total,
                currency_code: cartSnapshot?.currency_code,
                pix_expires_after_days: options?.pixExpiresAfterDays,
              },
            };
            await setPendingPayment(pending);
            await syncPendingPaymentToBackend(pending);
            const orderId = await completeCart(cartSnapshot.id);
            await resetCartAfterPending();
            return { status: "pending", orderId, pendingDetails: details, pendingPayment: pending };
          }
        } else {
          const billingDetails = buildBillingDetails();
          const hasAddress =
            Boolean(billingDetails?.address?.line1) &&
            Boolean(billingDetails?.address?.city) &&
            Boolean(billingDetails?.address?.state) &&
            Boolean(billingDetails?.address?.postalCode);
          const billingDetailsCollectionConfiguration = {
            name: billingDetails?.name ? "never" : "automatic",
            email: billingDetails?.email ? "never" : "automatic",
            phone: billingDetails?.phone ? "never" : "automatic",
            address: hasAddress ? "never" : "automatic",
          } as const;

          const allowsDelayed = paymentMethod !== "credit";
          const initResult = await initPaymentSheet({
            paymentIntentClientSecret: clientSecret,
            merchantDisplayName: "Chroma",
            allowsDelayedPaymentMethods: allowsDelayed,
            defaultBillingDetails: billingDetails
              ? {
                  name: billingDetails.name,
                  email: billingDetails.email,
                  phone: billingDetails.phone,
                  address: billingDetails.address,
                }
              : undefined,
            billingDetailsCollectionConfiguration,
          });
          if (initResult.error) {
            throw new Error(initResult.error.message || "Falha ao iniciar pagamento.");
          }

          const presentResult = await presentPaymentSheet();
          if (presentResult.error) {
            throw new Error(presentResult.error.message || "Pagamento não concluído.");
          }

          const intentResult = await retrievePaymentIntent(clientSecret);
          const status = intentResult?.paymentIntent?.status;
          if (status !== "succeeded") {
            if (DEBUG) console.debug("[cart] completeBackendCheckout:stripe-pending", { status });
            const details = {
              ...extractStripeDetailsFromIntent(intentResult?.paymentIntent || null),
              client_secret: clientSecret,
            };
            const pending: PendingPayment = {
              cart_id: cartSnapshot.id,
              payment_collection_id: paymentCollection?.id || "",
              method: paymentMethod,
              created_at: new Date().toISOString(),
            details: {
              ...details,
              method: paymentMethod,
              company_id: address?.metadata?.company_id || address?.metadata?.condo_id,
              company_name: address?.metadata?.company_name || address?.address_1,
              currency_code: cartSnapshot?.currency_code,
            },
          };
            await setPendingPayment(pending);
            await syncPendingPaymentToBackend(pending);
            const orderId = await completeCart(cartSnapshot.id);
            await resetCartAfterPending();
            return { status: "pending", orderId, pendingDetails: details, pendingPayment: pending };
          }
        }
      } else if (paymentMethod === "pix") {
        const session = paymentCollection?.payment_sessions?.find(
          (item: any) => item?.provider_id === providerId
        );
        const manualDetails = extractManualPixDetailsFromSession(session);
        const pending: PendingPayment = {
          cart_id: cartSnapshot.id,
          payment_collection_id: paymentCollection?.id || "",
          method: paymentMethod,
          created_at: new Date().toISOString(),
          details: {
            ...manualDetails,
            method: paymentMethod,
            company_id: address?.metadata?.company_id || address?.metadata?.condo_id,
            company_name: address?.metadata?.company_name || address?.address_1,
            amount: cartSnapshot?.total,
            currency_code: cartSnapshot?.currency_code,
            pix_expires_after_days: options?.pixExpiresAfterDays,
          },
        };
        await setPendingPayment(pending);
        await syncPendingPaymentToBackend(pending);
        try {
          await notifyPendingPayment({
            payment_method: paymentMethod,
            payment_collection_id: pending.payment_collection_id,
            company_id:
              address?.metadata?.company_id ||
              pending.details?.company_id ||
              address?.metadata?.condo_id ||
              null,
            details: pending.details,
          });
        } catch (err: any) {
          if (DEBUG) console.debug("[cart] notifyPendingPayment:error", err?.message || err);
        }
        const orderId = await completeCart(cartSnapshot.id);
        await resetCartAfterPending();
        return { status: "pending", orderId, pendingDetails: manualDetails, pendingPayment: pending };
      }

      setCheckoutLocked(true);
      const orderId = await completeCart(cartSnapshot.id);
      if (DEBUG) console.debug("[cart] completeBackendCheckout:success", { orderId });
      await refreshCart();
      await applyPoints(orderId, cartSnapshot);
      await removePendingPayment({ cart_id: cartSnapshot.id });
      await removePendingPaymentFromBackend({ cart_id: cartSnapshot.id });
      return { status: "completed", orderId };
    } catch (err: any) {
      if (DEBUG) console.debug("[cart] completeBackendCheckout:error", err?.message || err);
      toast({
        title: "Não foi possível concluir",
        description: err?.message || "Tente novamente ou revise os dados.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setCheckoutLocked(false);
    }
  };

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        cartId,
        items,
        itemsCount: totalItems,
        lastAddId,
        lastAddQty,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        isAddingItem,
        completeBackendCheckout,
        finalizePendingBoleto,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
