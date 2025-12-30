import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import homeBg from "@/assets/home-bg.jpg";

const newsData = [
  {
    id: "1",
    title: "Nova linha de produtos sustentáveis",
    summary: "Chegaram produtos eco-friendly para seu condomínio. Confira as opções que ajudam o meio ambiente.",
    content: `
      <p>Estamos muito felizes em anunciar a chegada da nossa nova linha de produtos sustentáveis, desenvolvida especialmente para condomínios que se preocupam com o meio ambiente.</p>
      
      <h3>O que você vai encontrar</h3>
      <p>Nossa nova linha inclui produtos de limpeza biodegradáveis, materiais reciclados para áreas comuns, e soluções de iluminação LED de alta eficiência energética.</p>
      
      <h3>Benefícios para seu condomínio</h3>
      <ul>
        <li>Redução de até 40% no consumo de energia</li>
        <li>Produtos de limpeza mais seguros para moradores e pets</li>
        <li>Embalagens recicláveis em 100% dos produtos</li>
        <li>Certificação ambiental reconhecida</li>
      </ul>
      
      <h3>Promoção de lançamento</h3>
      <p>Para celebrar o lançamento, estamos oferecendo 15% de desconto em toda a linha sustentável durante este mês. Aproveite!</p>
    `,
    date: "2024-12-15",
    category: "Novidades",
    readTime: "3 min",
    author: "Equipe Chroma",
  },
  {
    id: "2",
    title: "Dicas de economia para síndicos",
    summary: "Aprenda como reduzir custos do condomínio com compras inteligentes e planejamento.",
    content: `
      <p>Ser síndico é uma grande responsabilidade, especialmente quando se trata de gerenciar o orçamento do condomínio. Neste artigo, compartilhamos dicas valiosas para economizar sem comprometer a qualidade.</p>
      
      <h3>1. Planeje suas compras</h3>
      <p>Evite compras de emergência. Mantenha um estoque mínimo de produtos essenciais e faça pedidos programados para aproveitar melhores condições de pagamento.</p>
      
      <h3>2. Compare preços regularmente</h3>
      <p>O mercado muda constantemente. Revise seus fornecedores a cada trimestre e não hesite em negociar.</p>
      
      <h3>3. Invista em qualidade</h3>
      <p>Produtos de qualidade superior geralmente duram mais e reduzem custos de manutenção a longo prazo.</p>
      
      <h3>4. Aproveite promoções sazonais</h3>
      <p>Muitos produtos têm variação de preço ao longo do ano. Antecipe compras quando encontrar boas ofertas.</p>
      
      <h3>5. Considere compras em grupo</h3>
      <p>Converse com outros síndicos da região. Compras conjuntas podem garantir descontos significativos.</p>
    `,
    date: "2024-12-10",
    category: "Dicas",
    readTime: "5 min",
    author: "Maria Silva",
  },
  {
    id: "3",
    title: "Promoção de fim de ano chegando",
    summary: "Fique atento às ofertas especiais que estamos preparando para o período de festas.",
    content: `
      <p>O fim de ano está chegando e preparamos ofertas imperdíveis para ajudar seu condomínio a economizar!</p>
      
      <h3>O que esperar</h3>
      <p>Nossa promoção de fim de ano trará descontos de até 50% em produtos selecionados, incluindo itens de decoração, iluminação e manutenção.</p>
      
      <h3>Datas importantes</h3>
      <ul>
        <li><strong>20/12:</strong> Início da promoção</li>
        <li><strong>24/12:</strong> Super desconto de Natal</li>
        <li><strong>31/12:</strong> Último dia com frete grátis</li>
      </ul>
      
      <h3>Como aproveitar</h3>
      <p>Cadastre-se em nossa newsletter para receber avisos exclusivos e cupons especiais. Clientes cadastrados terão acesso antecipado às ofertas!</p>
      
      <h3>Categorias em promoção</h3>
      <p>Iluminação, limpeza, segurança, jardinagem e muito mais. Fique de olho!</p>
    `,
    date: "2024-12-08",
    category: "Promoções",
    readTime: "2 min",
    author: "Equipe Chroma",
  },
  {
    id: "4",
    title: "Manutenção preventiva: por que investir?",
    summary: "Entenda a importância de manter os equipamentos do condomínio sempre em dia.",
    content: `
      <p>A manutenção preventiva é um dos pilares de uma boa gestão condominial. Investir em prevenção evita gastos maiores com reparos emergenciais.</p>
      
      <h3>O que é manutenção preventiva?</h3>
      <p>São ações programadas para manter equipamentos e estruturas em bom estado, evitando falhas e prolongando sua vida útil.</p>
      
      <h3>Principais benefícios</h3>
      <ul>
        <li>Redução de custos com reparos emergenciais</li>
        <li>Maior segurança para moradores</li>
        <li>Valorização do imóvel</li>
        <li>Previsibilidade no orçamento</li>
      </ul>
      
      <h3>Itens que precisam de atenção</h3>
      <ul>
        <li><strong>Elevadores:</strong> Manutenção mensal obrigatória</li>
        <li><strong>Bombas d'água:</strong> Verificação trimestral</li>
        <li><strong>Extintores:</strong> Recarga anual</li>
        <li><strong>Portões:</strong> Lubrificação semestral</li>
        <li><strong>Iluminação:</strong> Verificação mensal</li>
      </ul>
      
      <h3>Crie um calendário</h3>
      <p>Organize um cronograma de manutenções e siga-o rigorosamente. Isso facilita o planejamento financeiro e evita surpresas.</p>
    `,
    date: "2024-12-05",
    category: "Dicas",
    readTime: "4 min",
    author: "João Santos",
  },
];

const NewsDetails = () => {
  const { id } = useParams();
  const news = newsData.find((n) => n.id === id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copiado!",
      description: "O link da notícia foi copiado para sua área de transferência.",
    });
  };

  if (!news) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Notícia não encontrada</h1>
        <Link to="/home">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Home
          </Button>
        </Link>
      </div>
    );
  }

  const relatedNews = newsData.filter((n) => n.id !== id && n.category === news.category).slice(0, 2);

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
      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
      {/* Back Button */}
      <Link to="/home">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </Link>

      {/* Article Header */}
      <div className="space-y-4">
        <Badge variant="secondary">{news.category}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">{news.title}</h1>
        <p className="text-lg text-muted-foreground">{news.summary}</p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(news.date)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {news.readTime} de leitura
          </div>
          <span>Por {news.author}</span>
          <Button variant="outline" size="sm" className="ml-auto gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Article Content */}
      <Card className="border-2">
        <CardContent className="p-6 md:p-8">
          <div 
            className="prose prose-lg max-w-none dark:prose-invert
              [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-foreground
              [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-muted-foreground
              [&_li]:mb-2 [&_li]:text-muted-foreground
              [&_strong]:text-foreground [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: news.content }}
          />
        </CardContent>
      </Card>

      {/* Related News */}
      {relatedNews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Notícias Relacionadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedNews.map((item) => (
              <Link key={item.id} to={`/news/${item.id}`}>
                <Card className="border-2 hover:border-primary transition-colors cursor-pointer h-full">
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
};

export default NewsDetails;
