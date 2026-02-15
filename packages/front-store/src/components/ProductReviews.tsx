import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Gift, Star, User } from "lucide-react";
import {
  createProductReview,
  getActiveCondo,
  listProductReviews,
  MedusaProductReview,
} from "@/lib/medusa";

interface ProductReviewsProps {
  productId: string;
}

const StarRating = ({
  rating,
  onRatingChange,
  interactive = false,
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

const formatReviewDate = (value?: string | null) => {
  if (!value) return "Agora";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return "Agora";
  }
};

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeCondo = getActiveCondo();
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: "",
  });

  const reviewsQuery = useQuery({
    queryKey: ["product-reviews", productId, activeCondo?.id || "all"],
    queryFn: () =>
      listProductReviews({
        productId,
        companyId: activeCondo?.id || undefined,
        limit: 100,
      }),
    enabled: Boolean(productId),
  });

  const reviews = (reviewsQuery.data?.reviews || []) as MedusaProductReview[];
  const averageRating = Number(reviewsQuery.data?.summary?.average_rating || 0);
  const totalReviews = Number(reviewsQuery.data?.summary?.total_count || 0);
  const eligibility = reviewsQuery.data?.eligibility;
  const canReview = Boolean(eligibility?.can_review);
  const pointsPerReview = Number(eligibility?.points_per_review || 0);

  const calloutText = useMemo(() => {
    if (canReview && pointsPerReview > 0) {
      return `Avalie este produto e ganhe +${pointsPerReview} pontos para ${activeCondo?.name || "seu condomínio"}.`;
    }
    if (canReview) {
      return "Avalie este produto e compartilhe sua experiência.";
    }
    return "As avaliações ficam disponíveis após a compra concluída deste produto.";
  }, [activeCondo?.name, canReview, pointsPerReview]);

  const submitReview = useMutation({
    mutationFn: async () => {
      return createProductReview({
        productId,
        companyId: activeCondo?.id || undefined,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
      });
    },
    onSuccess: (result) => {
      const pointsEarned = Number(result?.points?.points_earned || 0);
      setNewReview({ rating: 0, comment: "" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId, activeCondo?.id || "all"] });
      window.dispatchEvent(new CustomEvent("chroma:condos-refresh"));
      toast({
        title: "Avaliação enviada",
        description:
          pointsEarned > 0
            ? `Obrigado pelo feedback. Você ganhou +${pointsEarned} pontos.`
            : "Obrigado pelo feedback!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Não foi possível enviar",
        description: error?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.rating < 1 || newReview.comment.trim().length < 5) {
      toast({
        title: "Complete sua avaliação",
        description: "Selecione de 1 a 5 estrelas e escreva ao menos 5 caracteres.",
        variant: "destructive",
      });
      return;
    }
    submitReview.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300/30 bg-amber-100/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-amber-300/20 p-2 text-amber-300">
            <Gift className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{calloutText}</p>
            {eligibility?.remaining_reviews ? (
              <p className="text-sm text-muted-foreground mt-1">
                Você ainda pode avaliar {eligibility.remaining_reviews} compra(s) deste item.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Avaliações</h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={Math.round(averageRating)} />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowForm((prev) => !prev)}
            disabled={!canReview || reviewsQuery.isLoading}
          >
            {showForm ? "Cancelar" : pointsPerReview > 0 ? `Avaliar e ganhar +${pointsPerReview}` : "Escrever avaliação"}
          </Button>
        </div>
      </div>

      {showForm && canReview && (
        <form onSubmit={handleSubmit} className="border-2 border-border p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Sua nota</label>
            <StarRating
              rating={newReview.rating}
              onRatingChange={(rating) => setNewReview((prev) => ({ ...prev, rating }))}
              interactive
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Seu comentário</label>
            <Textarea
              value={newReview.comment}
              onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Conte sua experiência com o produto..."
              rows={4}
              maxLength={500}
            />
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={submitReview.isPending}>
            {submitReview.isPending ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {reviewsQuery.isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando avaliações...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma avaliação ainda. Seja o primeiro a avaliar.
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
                    <span className="font-semibold">{review.author_name || "Cliente"}</span>
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-muted-foreground">{formatReviewDate(review.created_at)}</span>
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
