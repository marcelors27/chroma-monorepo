import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { resolveBusinessBackground } from "@/lib/business-background";
import { getNews, listNews, MedusaNews } from "@/lib/medusa";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const NewsDetails = () => {
  const { terms, activeBusinessTypeKey } = useBusinessTerms();
  const { id } = useParams();
  const { data: newsData, isLoading } = useQuery({
    queryKey: ["news-detail", id],
    queryFn: () => getNews(id || ""),
    enabled: !!id,
  });
  const { data: listData } = useQuery({
    queryKey: ["news-list"],
    queryFn: () => listNews({ limit: 6 }),
  });

  const news = newsData?.news as MedusaNews | undefined;

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <LoadingSpinner className="text-primary" />
        <h1 className="text-2xl font-bold">Carregando notícia...</h1>
      </div>
    );
  }

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

  const relatedNews = ((listData?.news || []) as MedusaNews[])
    .filter((n) => n.id !== id && n.category === news.category)
    .slice(0, 2);

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.78), hsl(var(--background) / 0.86)), url(${resolveBusinessBackground(activeBusinessTypeKey, terms.labelLower)})`,
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
        {news.image_url && (
          <div className="relative w-full h-64 md:h-80 overflow-hidden border-2 border-border">
            <img
              src={news.image_url}
              alt={news.title || "Notícia"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <Badge variant="secondary">{news.category || "Geral"}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">{news.title}</h1>
        <p className="text-lg text-muted-foreground">{news.summary}</p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {news.published_at ? formatDate(news.published_at) : "—"}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {news.read_time ? `${news.read_time} min` : "Leitura rápida"}
          </div>
          <span>Por {news.author || "Equipe Chroma"}</span>
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
            dangerouslySetInnerHTML={{ __html: news.content || "" }}
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
                  {item.image_url && (
                    <div className="relative w-full h-32 overflow-hidden border-b border-border/60">
                      <img
                        src={item.image_url}
                        alt={item.title || "Notícia"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2">{item.category || "Geral"}</Badge>
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
