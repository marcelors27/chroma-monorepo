import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tag, 
  Newspaper, 
  ArrowRight, 
  Percent, 
  Clock,
  ShoppingCart
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import homeBg from "@/assets/home-bg.jpg";
import { getProductCategory, getProductImage, getVariant, getVariantPricing, listProducts, MedusaProduct } from "@/lib/medusa";

const news = [
  {
    id: "1",
    title: "Nova linha de produtos sustentáveis",
    summary: "Chegaram produtos eco-friendly para seu condomínio. Confira as opções que ajudam o meio ambiente.",
    date: "2024-12-15",
    category: "Novidades",
  },
  {
    id: "2",
    title: "Dicas de economia para síndicos",
    summary: "Aprenda como reduzir custos do condomínio com compras inteligentes e planejamento.",
    date: "2024-12-10",
    category: "Dicas",
  },
  {
    id: "3",
    title: "Promoção de fim de ano chegando",
    summary: "Fique atento às ofertas especiais que estamos preparando para o período de festas.",
    date: "2024-12-08",
    category: "Promoções",
  },
  {
    id: "4",
    title: "Manutenção preventiva: por que investir?",
    summary: "Entenda a importância de manter os equipamentos do condomínio sempre em dia.",
    date: "2024-12-05",
    category: "Dicas",
  },
];

const Home = () => {
  const { addItem } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["home-products"], queryFn: listProducts });

  const promotions = useMemo(() => {
    const items = data?.products || [];
    return items
      .map((product: MedusaProduct) => {
        const variant = getVariant(product);
        const pricing = getVariantPricing(variant);
        return {
          id: product.id,
          title: product.title,
          description: product.description || "Oferta especial para condomínios.",
          originalPrice: pricing.basePrice ?? undefined,
          salePrice: pricing.finalPrice,
          discount: pricing.discountPercent,
          onSale: pricing.onSale,
          image: getProductImage(product),
          validUntil: "",
          variantId: variant?.id,
          category: getProductCategory(product),
        };
      })
      .filter((promo) => promo.onSale)
      .slice(0, 3);
  }, [data]);

  const handleAddToCart = (promo: (typeof promotions)[0]) => {
    if (!promo?.variantId) {
      toast({
        title: "Produto indisponível",
        description: "Não foi possível adicionar esta oferta.",
        variant: "destructive",
      });
      return;
    }
    addItem({
      productId: promo.id,
      variantId: promo.variantId,
      name: promo.title,
      price: promo.salePrice,
      category: promo.category,
      image: promo.image,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${homeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Olá, bem-vindo!</h1>
        <p className="text-muted-foreground mt-1">
          Confira as melhores ofertas e novidades para seu condomínio
        </p>
      </div>

      {/* Promotions Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Promoções em Destaque</h2>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" className="gap-1">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={`promo-skeleton-${idx}`} className="border-2 animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}

          {!isLoading && promotions.length === 0 && (
            <Card className="border-2">
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma oferta disponível no momento. Volte mais tarde.
              </CardContent>
            </Card>
          )}

          {!isLoading &&
            promotions.map((promo) => {
              const showDiscount =
                promo.originalPrice && promo.originalPrice > promo.salePrice && promo.discount;
              return (
                <Card
                  key={promo.id}
                  className="overflow-hidden border-2 hover:border-primary transition-colors group flex flex-col h-full"
                >
                  <div className="relative aspect-video bg-secondary">
                    <img
                      src={promo.image}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                    {showDiscount && (
                      <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                        <Percent className="h-3 w-3 mr-1" />
                        {promo.discount}% OFF
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-lg line-clamp-1">{promo.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {promo.description}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      {showDiscount && (
                        <span className="text-muted-foreground line-through text-sm">
                          R$ {promo.originalPrice?.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-primary">
                        R$ {promo.salePrice.toFixed(2)}
                      </span>
                    </div>
                    {promo.validUntil && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        Válido até {formatDate(promo.validUntil)}
                      </div>
                    )}
                    <Button
                      className="w-full mt-auto gap-2"
                      onClick={() => handleAddToCart(promo)}
                      disabled={!promo.variantId}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar ao Carrinho
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </section>

      {/* News Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Notícias e Dicas</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.map((item) => (
            <Link key={item.id} to={`/news/${item.id}`}>
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {item.summary}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Ver Produtos</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/orders">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Clock className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Meus Pedidos</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/condos">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Tag className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Condomínios</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Newspaper className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Configurações</span>
            </CardContent>
          </Card>
        </Link>
      </section>
      </div>
    </div>
  );
};

export default Home;
