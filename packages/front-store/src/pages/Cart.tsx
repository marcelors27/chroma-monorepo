import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { resolveBusinessBackground } from "@/lib/business-background";
import { getProductImageSrc, handleProductImageError } from "@/lib/product-image-fallback";
import { formatMoney } from "@/lib/medusa";
import { ShoppingCart, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Cart = () => {
  const { items, totalPrice, totalItems, removeItem, updateQuantity, clearCart, isCartLoading } = useCart();
  const { terms, activeBusinessType, activeBusinessTypeKey } = useBusinessTerms();
  const navigate = useNavigate();

  const hasItems = items.length > 0;
  const totalLabel = useMemo(() => formatMoney(totalPrice), [totalPrice]);

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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Carrinho
          </h1>
          {hasItems && (
            <Button variant="outline" className="border-2" onClick={clearCart}>
              Limpar carrinho
            </Button>
          )}
        </div>

        {isCartLoading ? (
          <div className="border-2 border-border p-12 bg-card text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size={18} />
              <span>Carregando carrinho...</span>
            </div>
          </div>
        ) : !hasItems ? (
          <div className="border-2 border-border p-12 bg-card text-center">
            <h3 className="font-bold text-lg mb-2">Seu carrinho está vazio</h3>
            <p className="text-muted-foreground mb-4">
              Adicione itens ao carrinho para continuar.
            </p>
            <Button asChild>
              <Link to="/dashboard">Ir às compras</Link>
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const maxQty = Math.max(10, item.quantity);
                const quantityOptions = Array.from({ length: maxQty }, (_, index) => index + 1);
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 border-2 border-border p-4 bg-card"
                  >
                    <div className="w-24 h-24 border-2 border-border overflow-hidden flex-shrink-0">
                      <img
                        src={getProductImageSrc(item.image)}
                        alt={item.name}
                        onError={handleProductImageError}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-accent font-medium">{item.category}</p>
                      <h4 className="font-bold text-base truncate">{item.name}</h4>
                      <p className="text-primary font-bold text-lg">
                        {formatMoney(item.price)}
                      </p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <Select
                          value={String(item.quantity)}
                          onValueChange={(value) => updateQuantity(item.id, Number(value))}
                        >
                          <SelectTrigger className="h-9 w-28 border-2 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {quantityOptions.map((qty) => (
                              <SelectItem key={qty} value={String(qty)}>
                                {qty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="border-2 border-border p-6 bg-card sticky top-4 space-y-4">
                <h2 className="text-xl font-bold">Resumo</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Itens</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{totalLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-primary font-medium">Grátis</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 border-border pt-4">
                  <span>Total</span>
                  <span className="text-primary">{totalLabel}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/checkout")}
                >
                  Finalizar pedido
                </Button>
                <Button variant="outline" className="w-full border-2" asChild>
                  <Link to="/dashboard">Continuar comprando</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
