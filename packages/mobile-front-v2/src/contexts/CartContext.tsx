import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface CartContextType {
  itemsCount: number;
  lastAddId: number;
  lastAddQty: number;
  addItem: (quantity?: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemsCount, setItemsCount] = useState(0);
  const [lastAddId, setLastAddId] = useState(0);
  const [lastAddQty, setLastAddQty] = useState(1);

  const addItem = (quantity = 1) => {
    setItemsCount((prev) => prev + quantity);
    setLastAddQty(quantity);
    setLastAddId((prev) => prev + 1);
  };

  const value = useMemo(
    () => ({
      itemsCount,
      lastAddId,
      lastAddQty,
      addItem,
    }),
    [itemsCount, lastAddId, lastAddQty]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
