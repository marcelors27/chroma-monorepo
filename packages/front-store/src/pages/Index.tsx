import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Hexagon, 
  ShoppingCart, 
  Users, 
  Shield,
  Building2,
  ShieldCheck,
  Wrench,
  Truck,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const useCases = [
  {
    title: "Reposição de itens essenciais",
    description: "Compras recorrentes de limpeza, portaria e escritório com previsibilidade.",
    icon: Building2,
  },
  {
    title: "Manutenção preventiva",
    description: "Peças, insumos e serviços para manter elevadores e áreas comuns em dia.",
    icon: Wrench,
  },
  {
    title: "Compras emergenciais",
    description: "Reposição rápida com controle de preço e histórico de pedidos.",
    icon: Truck,
  },
  {
    title: "Segurança e conformidade",
    description: "Produtos homologados e fornecedores avaliados pelo condomínio.",
    icon: ShieldCheck,
  },
  {
    title: "Compras colaborativas",
    description: "Cotações transparentes e aprovação com conselho e síndicos.",
    icon: Users,
  },
];

const testimonials = [
  {
    quote:
      "Centralizamos as compras do condomínio e reduzimos o tempo de aprovação pela metade.",
    name: "Carla Mendes",
    role: "Síndica - Residencial Vale Verde",
  },
  {
    quote:
      "Os preços são consistentes e a reposição de itens essenciais ficou muito mais simples.",
    name: "Rafael Torres",
    role: "Administrador - Cond. Horizonte",
  },
  {
    quote:
      "A plataforma trouxe histórico e transparência, ajudando nas prestações de contas.",
    name: "Marina Lopes",
    role: "Conselheira - Parque das Águas",
  },
  {
    quote:
      "Conseguimos atender emergências com rapidez sem perder o controle do orçamento.",
    name: "Paulo Ribeiro",
    role: "Síndico - Jardim Central",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hexagon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight text-primary">Chroma</span>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?mode=register">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="border-b-2 border-border relative"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.85) 40%, hsl(var(--background) / 0.6) 100%), url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      >
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              <span className="text-primary">E-commerce</span> exclusivo para{" "}
              <span className="text-accent">condomínios</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              Plataforma de compras centralizada para seu condomínio. 
              Gerencie múltiplos CNPJs e tenha acesso a ofertas exclusivas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth?mode=register">Começar agora</Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">
            Por que escolher o <span className="text-primary">Chroma</span>?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="Acesso Controlado"
              description="Somente usuários autenticados podem acessar a plataforma. Login com email/senha ou redes sociais."
            />
            <FeatureCard
              icon={<Hexagon className="h-8 w-8 text-accent" />}
              title="Multi-CNPJ"
              description="Cadastre e gerencie múltiplos condomínios com diferentes CNPJs em uma única conta."
            />
            <FeatureCard
              icon={<ShoppingCart className="h-8 w-8 text-primary" />}
              title="Compras Centralizadas"
              description="Acesse um catálogo de produtos exclusivos para condomínios com preços especiais."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t-2 border-border py-20 bg-secondary/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">
            Casos de uso para o dia a dia do condomínio
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="border-2 border-border p-6 bg-card hover:border-primary transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="py-20 relative"
        style={{
          backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.96)), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl font-bold mb-4">
            Relatos de clientes
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            Condomínios que já usam o Chroma para compras mais rápidas e transparentes.
          </p>
          <Carousel
            className="relative"
            opts={{ align: "start", loop: true }}
          >
            <CarouselContent>
              {testimonials.map((item) => (
                <CarouselItem key={item.name} className="md:basis-1/2">
                  <div className="border-2 border-border p-6 bg-card hover:border-primary transition-colors h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.role}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">“{item.quote}”</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:inline-flex" />
            <CarouselNext className="hidden md:inline-flex" />
          </Carousel>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-border bg-secondary">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Cadastre seu condomínio e comece a economizar hoje mesmo.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" asChild>
            <Link to="/auth?mode=register">Criar conta gratuita</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-border py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">Chroma</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 Chroma. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => (
  <div className="border-2 border-border p-8 bg-card hover:border-primary transition-colors">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default Index;
