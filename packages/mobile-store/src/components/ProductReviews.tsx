import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import TextField from "./TextField";
import Button from "./Button";
import { showToast } from "../hooks/useToast";

type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
};

type ProductReviewsProps = {
  productId: string;
};

const STORAGE_KEY = "product_reviews";

const getStoredReviews = async (): Promise<Review[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveReviews = async (reviews: Review[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
};

const StarRating = ({
  rating,
  onRatingChange,
  interactive = false,
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}) => {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRatingChange?.(star)}
          disabled={!interactive}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={18}
            color={star <= rating ? "#facc15" : colors.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    author: "",
    rating: 0,
    comment: "",
  });

  useEffect(() => {
    let active = true;
    getStoredReviews()
      .then((all) => {
        if (!active) return;
        setReviews(all.filter((review) => review.productId === productId));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = async () => {
    if (!newReview.author.trim() || !newReview.comment.trim() || newReview.rating === 0) {
      showToast({
        title: "Preencha todos os campos",
        description: "Nome, avaliacao e comentario sao obrigatorios.",
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

    const allReviews = await getStoredReviews();
    const updated = [review, ...allReviews];
    await saveReviews(updated);
    setReviews([review, ...reviews]);
    setNewReview({ author: "", rating: 0, comment: "" });
    setShowForm(false);

    showToast({ title: "Avaliacao enviada", description: "Obrigado pelo feedback!" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Avaliacoes</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={Math.round(averageRating)} />
            <Text style={styles.muted}>
              {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "avaliacao" : "avaliacoes"})
            </Text>
          </View>
        </View>
        <Button
          title={showForm ? "Cancelar" : "Escrever avaliacao"}
          variant="outline"
          onPress={() => setShowForm((prev) => !prev)}
        />
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextField
            label="Seu nome"
            value={newReview.author}
            onChangeText={(value) => setNewReview({ ...newReview, author: value })}
            placeholder="Digite seu nome"
          />
          <Text style={styles.label}>Sua avaliacao</Text>
          <StarRating
            rating={newReview.rating}
            onRatingChange={(rating) => setNewReview({ ...newReview, rating })}
            interactive
          />
          <TextField
            label="Seu comentario"
            value={newReview.comment}
            onChangeText={(value) => setNewReview({ ...newReview, comment: value })}
            placeholder="Conte sua experiencia..."
            multiline
          />
          <Button title="Enviar avaliacao" onPress={handleSubmit} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Carregando avaliacoes...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma avaliacao ainda. Seja o primeiro a avaliar!</Text>
      ) : (
        <View style={styles.list}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.author}</Text>
                <StarRating rating={review.rating} />
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  form: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
    gap: 8,
  },
  list: {
    gap: 12,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  reviewAuthor: {
    color: colors.text,
    fontWeight: "600",
  },
  reviewDate: {
    color: colors.muted,
    fontSize: 12,
  },
  reviewComment: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default ProductReviews;
