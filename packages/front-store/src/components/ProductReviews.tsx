import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Star, User } from "lucide-react";

interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProductReviewsProps {
  productId: string;
}

const STORAGE_KEY = "product_reviews";

const getStoredReviews = (): Review[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveReviews = (reviews: Review[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
};

const StarRating = ({ 
  rating, 
  onRatingChange, 
  interactive = false 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= (hoverRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({
    author: "",
    rating: 0,
    comment: "",
  });

  useEffect(() => {
    const allReviews = getStoredReviews();
    setReviews(allReviews.filter((r) => r.productId === productId));
  }, [productId]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReview.author.trim() || !newReview.comment.trim() || newReview.rating === 0) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome, avaliação e comentário são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      productId,
      author: newReview.author.trim(),
      rating: newReview.rating,
      comment: newReview.comment.trim(),
      date: new Date().toLocaleDateString("pt-BR"),
    };

    const allReviews = getStoredReviews();
    const updatedReviews = [review, ...allReviews];
    saveReviews(updatedReviews);
    setReviews([review, ...reviews]);
    setNewReview({ author: "", rating: 0, comment: "" });
    setShowForm(false);
    
    toast({
      title: "Avaliação enviada",
      description: "Obrigado pelo seu feedback!",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Avaliações</h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={Math.round(averageRating)} />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})
            </span>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Escrever avaliação"}
        </Button>
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border-2 border-border p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Seu nome</label>
            <Input
              value={newReview.author}
              onChange={(e) => setNewReview({ ...newReview, author: e.target.value })}
              placeholder="Digite seu nome"
              maxLength={50}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Sua avaliação</label>
            <StarRating
              rating={newReview.rating}
              onRatingChange={(rating) => setNewReview({ ...newReview, rating })}
              interactive
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Seu comentário</label>
            <Textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Conte sua experiência com o produto..."
              rows={4}
              maxLength={500}
            />
          </div>
          
          <Button type="submit" className="w-full sm:w-auto">
            Enviar avaliação
          </Button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma avaliação ainda. Seja o primeiro a avaliar!
          </p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-2 border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-semibold">{review.author}</span>
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">{review.comment}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
