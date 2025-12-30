import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, X, ArrowUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import dashboardBg from "@/assets/dashboard-bg.jpg";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listProducts,
  MedusaProduct,
} from "@/lib/medusa";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Nome (A-Z)" },
  { value: "name-desc", label: "Nome (Z-A)" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];

const ITEMS_PER_PAGE = 6;

type UiProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  onSale?: boolean;
  originalPrice?: number;
  variantId?: string;
  raw: MedusaProduct;
};

interface LayoutContext {
  selectedCondo: { id: string; name: string; cnpj?: string } | null;
}

const Dashboard = () => {
  const { selectedCondo } = useOutletContext<LayoutContext>();
  const [searchName, setSearchName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
    enabled: Boolean(selectedCondo),
  });

  const products: UiProduct[] = useMemo(() => {
    return (
      data?.products?.map((product) => {
        const variant = getVariant(product);
        const pricing = getVariantPricing(variant);
        return {
          id: product.id,
          name: product.title,
          price: pricing.finalPrice,
          category: getProductCategory(product),
          image: getProductImage(product),
          onSale: pricing.onSale,
          originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
          variantId: variant?.id,
          raw: product,
        } as UiProduct;
      }) || []
    );
  }, [data]);

  const categories = useMemo(() => {
    const uniques = new Set<string>();
    products.forEach((p) => uniques.add(p.category || "Geral"));
    return ["Todos", ...Array.from(uniques)];
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesName = product.name.toLowerCase().includes(searchName.toLowerCase());
      const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
      const matchesMinPrice = !minPrice || product.price >= parseFloat(minPrice);
      const matchesMaxPrice = !maxPrice || product.price <= parseFloat(maxPrice);
      const matchesOnSale = !onlyOnSale || product.onSale;

      return matchesName && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesOnSale;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [products, searchName, selectedCategory, minPrice, maxPrice, onlyOnSale, sortBy]);

  const visibleProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, visibleCount);
  }, [filteredAndSortedProducts, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedProducts.length;

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [products.length, searchName, selectedCategory, minPrice, maxPrice, onlyOnSale, sortBy]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore) {
      setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
    }
  }, [hasMore]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const saved = sessionStorage.getItem("dashboard-scroll");
    if (saved) {
      window.scrollTo(0, Number(saved));
    }
  }, []);

  const clearFilters = () => {
    setSearchName("");
    setSelectedCategory("Todos");
    setMinPrice("");
    setMaxPrice("");
    setOnlyOnSale(false);
    setSortBy("name-asc");
  };

  const hasActiveFilters = searchName || selectedCategory !== "Todos" || minPrice || maxPrice || onlyOnSale;

  const handleAddToCart = (product: UiProduct) => {
    if (!product.variantId) {
      return;
    }
    addItem({
      productId: product.id,
      variantId: product.variantId,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${dashboardBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">
              Comprando para:{" "}
              <span className="font-medium text-primary">
                {selectedCondo?.name || "Carregando empresa..."}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <CartDrawer />
            <Button asChild>
              <Link to="/condos" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Condomínio
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-2 border-border bg-card p-4 mb-6">
          {/* Search and Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  !
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preço mínimo</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço máximo</Label>
                <Input
                  type="number"
                  placeholder="R$ 999,99"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="block">Promoção</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="onSale"
                    checked={onlyOnSale}
                    onCheckedChange={(checked) => setOnlyOnSale(checked === true)}
                  />
                  <label htmlFor="onSale" className="text-sm cursor-pointer">
                    Apenas em promoção
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sort and Results count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
            {!selectedCondo
              ? "Aguardando empresa aprovada..."
              : isLoading
                ? "Carregando produtos..."
                : `${filteredAndSortedProducts.length} produto${
                    filteredAndSortedProducts.length !== 1 ? "s" : ""
                  } encontrado${filteredAndSortedProducts.length !== 1 ? "s" : ""}${
                    hasMore ? ` (mostrando ${visibleCount})` : ""
                  }`}
          </p>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedCondo && (
          <div className="border-2 border-border bg-card p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Carregando empresa aprovada ou verifique se há um CNPJ liberado.
            </p>
            <Button asChild>
              <Link to="/company-link">Cadastrar empresa</Link>
            </Button>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {isLoading &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="border-2 border-border bg-card p-3 sm:p-6 animate-pulse space-y-3"
              >
                <div className="aspect-square bg-muted" />
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ))}
          {!isLoading &&
            selectedCondo &&
            visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
        </div>

        {/* Infinite scroll loader */}
        {hasMore && (
          <div ref={loaderRef} className="flex justify-center py-8">
            <div className="text-muted-foreground text-sm">Carregando mais produtos...</div>
          </div>
        )}

        {!isLoading && filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border">
            <p className="text-muted-foreground">Nenhum produto encontrado com os filtros selecionados.</p>
            <Button variant="link" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductCard = ({
  product,
  onAdd,
}: {
  product: UiProduct;
  onAdd: (product: UiProduct) => void;
}) => {
  const canAdd = Boolean(product.variantId);

  return (
    <div className="border-2 border-border bg-card p-3 sm:p-6 hover:border-primary transition-colors relative flex flex-col h-full">
      {product.onSale && (
        <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 z-10">
          PROMO
        </span>
      )}
      <Link
        to={`/product/${product.id}`}
        className="block"
        onClick={() => {
          sessionStorage.setItem("dashboard-scroll", String(window.scrollY));
        }}
      >
        <div className="aspect-square bg-secondary mb-2 sm:mb-4 border-2 border-border overflow-hidden">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-xs sm:text-sm text-accent font-medium">{product.category}</span>
        <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
      </Link>
      <div className="mt-auto mb-2 sm:mb-4">
        {product.onSale && product.originalPrice && (
          <p className="text-xs sm:text-sm text-muted-foreground line-through">
            R$ {product.originalPrice.toFixed(2).replace(".", ",")}
          </p>
        )}
        <p className="text-lg sm:text-2xl font-bold text-primary">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </p>
      </div>
      <Button
        className="w-full text-xs sm:text-sm h-8 sm:h-10"
        onClick={() => onAdd(product)}
        disabled={!canAdd}
      >
        <span className="sm:hidden">Comprar</span>
        <span className="hidden sm:inline">Adicionar ao carrinho</span>
      </Button>
    </div>
  );
};

export default Dashboard;
