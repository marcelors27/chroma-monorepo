import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addDefaultShippingMethod,
  addLineItem,
  completeCart,
  createCart,
  createPaymentSessions,
  deleteLineItem,
  ensureCart,
  mapCartToItems,
  retrieveCart,
  setCartShippingAddress,
  setPaymentSession,
  updateLineItem,
} from "@/lib/medusa";
import { toast } from "@/lib/toast";

const DEBUG = process.env.EXPO_PUBLIC_DEBUG_FRONT === "true";

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
  completeBackendCheckout: (address: Record<string, any>, paymentMethod: string) => Promise<string | null>;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutLocked, setCheckoutLocked] = useState(false);
  const [lastAddId, setLastAddId] = useState(0);
  const [lastAddQty, setLastAddQty] = useState(1);

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
    try {
      const cart = await ensureCart();
      if (!cart?.id) throw new Error("Carrinho não encontrado");
      setCartId(cart.id);

      const existing = items.find((item) => item.variantId === product.variantId);
      const nextQty = (existing?.quantity || 0) + (product.quantity || 1);

      const updatedCart = existing
        ? await updateLineItem(cart.id, existing.id, nextQty)
        : await addLineItem(cart.id, product.variantId, product.quantity || 1);

      setItems(mapCartToItems(updatedCart));
      setLastAddQty(product.quantity || 1);
      setLastAddId((prev) => prev + 1);
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

  const resolvePaymentProvider = (paymentMethod: string) => {
    return {
      providerId: "manual",
      data: { payment_method: paymentMethod },
    };
  };

  const completeBackendCheckout = async (address: Record<string, any>, paymentMethod: string) => {
    if (DEBUG) console.debug("[cart] completeBackendCheckout:start", { cartId, address, paymentMethod });
    if (!cartId) throw new Error("Carrinho não encontrado");
    try {
      const { providerId, data } = resolvePaymentProvider(paymentMethod);
      let cartSnapshot = await retrieveCart(cartId);
      if (!cartSnapshot?.id) {
        throw new Error("Carrinho não encontrado");
      }
      await createPaymentSessions(cartSnapshot.id);

      if (!cartSnapshot?.shipping_address?.address_1) {
        cartSnapshot = await setCartShippingAddress(cartSnapshot.id, address);
      }
      if (!cartSnapshot?.shipping_methods?.length) {
        cartSnapshot = await addDefaultShippingMethod(cartSnapshot.id);
      }

      await setPaymentSession(cartSnapshot.id, providerId, data);
      setCheckoutLocked(true);
      const orderId = await completeCart(cartSnapshot.id);
      if (DEBUG) console.debug("[cart] completeBackendCheckout:success", { orderId });
      await refreshCart();
      return orderId;
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
        completeBackendCheckout,
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
