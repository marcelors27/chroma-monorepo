import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Share2, BookmarkPlus, Clock } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { useShare } from "@/hooks/useShare";
import { getNews, MedusaNews } from "@/lib/medusa";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function NoticiaDetalhes() {
  const navigation = useNavigation();
  const route = useRoute();
  const { share } = useShare();
  const id = (route.params as { id?: string } | undefined)?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["news-detail", id],
    queryFn: () => getNews(id),
    enabled: Boolean(id),
  });
  const noticia = data?.news as MedusaNews | undefined;

  const formatNewsDate = (date?: string | null) => {
    if (!date) return "Agora";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const stripHtml = (content?: string | null) => {
    if (!content) return "";
    return content
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
  };

  const paragraphs = stripHtml(noticia?.content).split("\n").filter(Boolean);

  const handleShare = () => {
    if (!noticia) return;
    share({ title: noticia.title, text: noticia.summary, url: noticia.image_url || undefined });
    toast.success("Link copiado!");
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <View style={styles.loadingWrap}>
          <LoadingSpinner size={84} />
          <Text style={styles.title}>Carregando noticia...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!noticia) {
    return (
      <AuthenticatedLayout>
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.title}>Noticia nao encontrada.</Text>
        </ScrollView>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.hero}>
          {noticia.image_url ? (
            <Image source={{ uri: noticia.image_url }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}
          <View style={styles.backButtonWrap}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
              <ArrowLeft color="white" size={18} />
            </Pressable>
          </View>
          <View style={styles.actionsRow}>
            <Pressable onPress={handleShare} style={styles.iconButton}>
              <Share2 color="white" size={18} />
            </Pressable>
            <Pressable onPress={() => toast.success("Notícia salva!")} style={styles.iconButton}>
              <BookmarkPlus color="white" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.contentBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.sourceText}>{noticia.source || noticia.author || "Chroma"}</Text>
            <View style={styles.timeRow}>
              <Clock color="hsl(215 15% 55%)" size={12} />
              <Text style={styles.timeText}>{formatNewsDate(noticia.published_at)}</Text>
            </View>
          </View>
          <Text style={styles.title}>{noticia.title}</Text>
          <Text style={styles.summary}>{noticia.summary}</Text>
        </View>

        <View style={styles.body}>
          {paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  hero: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 224,
    borderRadius: 20,
  },
  heroPlaceholder: {
    backgroundColor: "rgba(26, 30, 38, 0.92)",
  },
  backButtonWrap: {
    position: "absolute",
    top: 16,
    left: 16,
  },
  actionsRow: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contentBlock: {
    marginTop: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceText: {
    color: "#5DA2E6",
    fontSize: 13,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    color: "#8C98A8",
    fontSize: 11,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  summary: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 12,
  },
  body: {
    marginTop: 16,
  },
  paragraph: {
    color: "rgba(230, 232, 234, 0.9)",
    fontSize: 13,
    marginBottom: 12,
  },
});
