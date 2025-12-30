import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  addDefaultShippingMethod,
  addLineItem,
  completeCart,
  createCart,
  createPaymentSessions,
  deleteLineItem,
  ensureCart,
  mapCartToItems,
  MedusaPaymentCollection,
  PendingPaymentDetails,
  removePendingPayment,
  removePendingPaymentFromBackend,
  retrieveCart,
  setPendingPayment,
  syncPendingPaymentToBackend,
  setPaymentSession,
  setCartShippingAddress,
  updateLineItem,
  notifyPendingPayment,
} from "@/lib/medusa";
import { toast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
const DEBUG = import.meta.env.VITE_DEBUG_FRONT === "true";
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

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
  addItem: (product: AddItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  completeBackendCheckout: (
    address: Record<string, any>,
    paymentMethod: string
  ) => Promise<{
    status: "completed" | "pending";
    orderId?: string | null;
    paymentCollectionId?: string | null;
    cartId?: string | null;
  }>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutLocked, setCheckoutLocked] = useState(false);

  useEffect(() => {
    refreshCart();
  }, []);

  const refreshCart = async () => {
    if (DEBUG) console.debug("[cart] refreshCart:start");
    try {
      const cart = await ensureCart();
      if (DEBUG) console.debug("[cart] refreshCart:loaded", { cartId: cart.id, items: cart.items?.length });
      setCartId(cart.id);
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
        variant: "destructive",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] addItem", product);
    try {
      const cart = await ensureCart();
      setCartId(cart.id);

      const existing = items.find((item) => item.variantId === product.variantId);
      const nextQty = (existing?.quantity || 0) + (product.quantity || 1);

      const updatedCart = existing
        ? await updateLineItem(cart.id, existing.id, nextQty)
        : await addLineItem(cart.id, product.variantId, product.quantity || 1);

      setItems(mapCartToItems(updatedCart));
      toast({
        title: "Produto adicionado",
        description: `${product.name} foi adicionado ao carrinho.`,
      });
    } catch (err: any) {
      if (DEBUG) console.debug("[cart] addItem:error", err?.message || err);
      toast({
        title: "Não foi possível adicionar",
        description: err?.message || "Verifique se há estoque disponível.",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (id: string) => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
        variant: "destructive",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] removeItem", { id, cartId });
    if (!cartId) return;
    try {
      const updatedCart = await deleteLineItem(cartId, id);
      setItems(mapCartToItems(updatedCart));
    } catch (err: any) {
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
        variant: "destructive",
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
      if (DEBUG) console.debug("[cart] updateQuantity:error", err?.message || err);
      toast({
        title: "Não foi possível atualizar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetCartState = async (keepPending: boolean) => {
    setCartId(null);
    setItems([]);
    if (!keepPending) {
      removePendingPayment({ cart_id: cartId || "" });
      await removePendingPaymentFromBackend({ cart_id: cartId || "" });
    }
    await createCart();
  };

  const clearCart = async () => {
    if (checkoutLocked) {
      toast({
        title: "Checkout em andamento",
        description: "Finalize o pagamento antes de alterar o carrinho.",
        variant: "destructive",
      });
      return;
    }
    if (DEBUG) console.debug("[cart] clearCart", { cartId });
    await resetCartState(false);
  };

  const resolvePaymentProvider = (paymentMethod: string) => {
    switch (paymentMethod) {
      case "credit":
        return {
          providerId: "pp_stripe_stripe",
          data: { payment_method_types: ["card"], capture_method: "automatic" },
        };
      case "boleto":
        return {
          providerId: "pp_stripe_stripe",
          data: { payment_method_types: ["boleto"], capture_method: "automatic" },
        };
      case "pix":
        return {
          providerId: "pp_stripe_stripe",
          data: { payment_method_types: ["pix"], capture_method: "automatic" },
        };
      default:
        return { providerId: "manual" };
    }
  };

  const findStripeSession = (
    collection: MedusaPaymentCollection | null,
    providerId: string
  ) => {
    if (!collection?.payment_sessions?.length) return null;
    return (
      collection.payment_sessions.find(
        (session) => session?.provider_id === providerId
      ) || null
    );
  };

  const extractStripeDetailsFromIntent = (
    intent: Record<string, any> | null | undefined
  ): PendingPaymentDetails => {
    if (!intent) return {};
    const nextAction = intent?.next_action || {};
    const boleto = nextAction?.boleto_display_details || {};
    const pix = nextAction?.pix_display_qr_code || nextAction?.pix_display_details || {};

    return {
      boleto_line: boleto?.number || boleto?.barcode || boleto?.line,
      boleto_url: boleto?.hosted_voucher_url || boleto?.url,
      boleto_expires_at: boleto?.expires_at,
      pix_code: pix?.data || pix?.emv || pix?.qr_code?.data,
      pix_qr: pix?.image_url || pix?.qr_code?.image_url || pix?.image,
    };
  };

  const extractStripeDetailsFromSession = (
    session: Record<string, any> | null
  ): PendingPaymentDetails => {
    if (!session) return {};
    const data = session?.data || {};
    const intent =
      data?.payment_intent?.payment_intent ||
      data?.payment_intent ||
      data;
    return extractStripeDetailsFromIntent(intent);
  };

  const buildPendingDetails = (
    method: string,
    collection: MedusaPaymentCollection | null,
    providerId: string,
    stripeDetails?: PendingPaymentDetails
  ): PendingPaymentDetails => {
    const details = { ...stripeDetails };
    if (method === "boleto" || method === "pix") {
      const session = findStripeSession(collection, providerId);
      const sessionDetails = extractStripeDetailsFromSession(session);
      return { ...sessionDetails, ...details, method };
    }
    return { ...details, method };
  };

  const confirmStripePayment = async (
    collection: MedusaPaymentCollection | null,
    providerId: string,
    method: string,
    address: Record<string, any>
  ): Promise<PendingPaymentDetails | null> => {
    if (!stripePromise) {
      throw new Error("Stripe não configurado no frontend.");
    }
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error("Stripe não disponível.");
    }

    const session = findStripeSession(collection, providerId);
    const clientSecret = session?.data?.client_secret;
    if (!clientSecret) {
      throw new Error("Session do Stripe sem client_secret.");
    }
    const status =
      session?.data?.status ||
      session?.data?.payment_intent?.status ||
      session?.data?.payment_intent?.payment_intent?.status;
    if (status === "succeeded") {
      return null;
    }

    if (method === "credit") {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: "pm_card_visa",
      });
      if (result.error) {
        throw result.error;
      }
      return null;
    }

    if (method === "boleto") {
      const name = `${address?.first_name || ""} ${address?.last_name || ""}`.trim() || "Cliente";
      const billingAddress = {
        line1: address?.address_1 || "Endereco nao informado",
        line2: address?.address_2 || undefined,
        city: address?.city || "Cidade",
        state: address?.province || address?.state || "SP",
        postal_code: address?.postal_code || "00000-000",
        country: (address?.country_code || "br").toUpperCase(),
      };
      const result = await stripe.confirmBoletoPayment(clientSecret, {
        payment_method: {
          boleto: { tax_id: "00000000000" },
          billing_details: {
            name,
            email: "cliente@exemplo.com",
            address: billingAddress,
          },
        },
      });
      if (result.error) {
        throw result.error;
      }
      return extractStripeDetailsFromIntent(result?.paymentIntent || null);
    }

    if (method === "pix") {
      const name = `${address?.first_name || ""} ${address?.last_name || ""}`.trim() || "Cliente";
      const confirmPixPayment = (stripe as any).confirmPixPayment;
      if (!confirmPixPayment) {
        throw new Error("PIX não suportado pelo Stripe configurado.");
      }
      const result = await confirmPixPayment(clientSecret, {
        payment_method: {
          billing_details: {
            name,
            email: "cliente@exemplo.com",
          },
        },
      });
      if (result.error) {
        throw result.error;
      }
      return extractStripeDetailsFromIntent(result?.paymentIntent || null);
    }

    return null;
  };

  const isStripeAlreadySucceededError = (err: any) => {
    const code = err?.code || err?.error?.code;
    const message = err?.message || err?.error?.message;
    return (
      code === "payment_intent_unexpected_state" ||
      (typeof message === "string" && message.includes("already succeeded"))
    );
  };

  const completeBackendCheckout = async (address: Record<string, any>, paymentMethod: string) => {
    if (DEBUG) console.debug("[cart] completeBackendCheckout:start", { cartId, address, paymentMethod });
    if (!cartId) throw new Error("Carrinho não encontrado");
    const isAsyncPayment = paymentMethod !== "credit";
    try {
      const { providerId, data } = resolvePaymentProvider(paymentMethod);
      let cartSnapshot = await retrieveCart(cartId);
      let paymentCollection = await createPaymentSessions(cartSnapshot.id);

      if (providerId.startsWith("pp_stripe")) {
        const existingSession = findStripeSession(paymentCollection, providerId);
        const status =
          existingSession?.data?.status ||
          existingSession?.data?.payment_intent?.status ||
          existingSession?.data?.payment_intent?.payment_intent?.status;
        if (status === "succeeded") {
          setCheckoutLocked(true);
          const orderId = await completeCart(cartSnapshot.id);
          if (DEBUG) console.debug("[cart] completeBackendCheckout:success", { orderId });
          await refreshCart();
          removePendingPayment({ cart_id: cartSnapshot.id });
          return { status: "completed", orderId };
        }
      }

      if (!cartSnapshot?.shipping_address?.address_1) {
        cartSnapshot = await setCartShippingAddress(cartSnapshot.id, address);
      }
      if (!cartSnapshot?.shipping_methods?.length) {
        cartSnapshot = await addDefaultShippingMethod(cartSnapshot.id);
      }

      if (!paymentCollection?.id || paymentCollection?.id === "") {
        paymentCollection = await createPaymentSessions(cartSnapshot.id);
      }

      if (providerId.startsWith("pp_stripe")) {
        const existingSession = findStripeSession(paymentCollection, providerId);
        if (!existingSession?.data?.client_secret) {
          paymentCollection = await setPaymentSession(cartSnapshot.id, providerId, data);
        }
        setCheckoutLocked(true);
        let stripeDetails: PendingPaymentDetails | null = null;
        try {
          stripeDetails = await confirmStripePayment(
            paymentCollection,
            providerId,
            paymentMethod,
            address
          );
        } catch (err: any) {
          if (isStripeAlreadySucceededError(err)) {
            if (DEBUG) console.debug("[cart] completeBackendCheckout:stripe-already-succeeded");
            const orderId = await completeCart(cartSnapshot.id);
            if (DEBUG) console.debug("[cart] completeBackendCheckout:success", { orderId });
            await refreshCart();
            removePendingPayment({ cart_id: cartSnapshot.id });
            await removePendingPaymentFromBackend({ cart_id: cartSnapshot.id });
            return { status: "completed", orderId };
          }
          throw err;
        }
        if (isAsyncPayment) {
          const pending = {
            cart_id: cartSnapshot.id,
            payment_collection_id: paymentCollection?.id || "",
            method: paymentMethod,
            created_at: new Date().toISOString(),
            details: buildPendingDetails(
              paymentMethod,
              paymentCollection,
              providerId,
              stripeDetails || undefined
            ),
          };
          setPendingPayment(pending);
          await syncPendingPaymentToBackend(pending);
          if (paymentMethod === "boleto" || paymentMethod === "pix") {
            try {
              await notifyPendingPayment({
                payment_method: paymentMethod,
                payment_collection_id: pending.payment_collection_id,
                company_id: address?.metadata?.company_id || null,
                details: pending.details,
              });
            } catch (err: any) {
              if (DEBUG) console.debug("[cart] notifyPendingPayment:error", err?.message || err);
            }
          }
          await resetCartState(true);
          return {
            status: "pending",
            paymentCollectionId: paymentCollection?.id || null,
            cartId: cartSnapshot.id,
          };
        }
      } else {
        await setPaymentSession(cartSnapshot.id, providerId, data);
      }
      if (isAsyncPayment) {
        const pending = {
          cart_id: cartSnapshot.id,
          payment_collection_id: paymentCollection?.id || "",
          method: paymentMethod,
          created_at: new Date().toISOString(),
          details: buildPendingDetails(paymentMethod, paymentCollection, providerId),
        };
        setPendingPayment(pending);
        await syncPendingPaymentToBackend(pending);
        if (paymentMethod === "boleto" || paymentMethod === "pix") {
          try {
            await notifyPendingPayment({
              payment_method: paymentMethod,
              payment_collection_id: pending.payment_collection_id,
              company_id: address?.metadata?.company_id || null,
              details: pending.details,
            });
          } catch (err: any) {
            if (DEBUG) console.debug("[cart] notifyPendingPayment:error", err?.message || err);
          }
        }
        await resetCartState(true);
        return {
          status: "pending",
          paymentCollectionId: paymentCollection?.id || null,
          cartId: cartSnapshot.id,
        };
      }
      const orderId = await completeCart(cartSnapshot.id);
      if (DEBUG) console.debug("[cart] completeBackendCheckout:success", { orderId });
      await refreshCart();
      removePendingPayment({ cart_id: cartSnapshot.id });
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartId,
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        completeBackendCheckout,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
