import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Share2, BookmarkPlus, Clock } from "lucide-react-native";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { useShare } from "@/hooks/useShare";

const newsData = [
  {
    id: "featured",
    title: "Nova lei de condomínios entra em vigor e traz mudanças importantes",
    summary: "As principais alterações incluem regras sobre animais de estimação e reformas em unidades.",
    source: "SíndicoNet",
    date: "Há 2 horas",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60",
    content: [
      "A nova legislação traz mudanças importantes para síndicos e moradores.",
      "Entre os pontos principais, estão regras mais claras sobre reformas e animais de estimação.",
      "Condomínios precisam atualizar seus regimentos internos para se adequar às novas regras.",
    ],
  },
];

export default function NoticiaDetalhes() {
  const navigation = useNavigation();
  const route = useRoute();
  const { share } = useShare();
  const id = (route.params as { id?: string } | undefined)?.id ?? "featured";
  const noticia = newsData.find((item) => item.id === id) ?? newsData[0];

  const handleShare = () => {
    share({ title: noticia.title, text: noticia.summary, url: noticia.image });
    toast.success("Link copiado!");
  };

  return (
    <AuthenticatedLayout>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.hero}>
          <Image source={{ uri: noticia.image }} style={styles.heroImage} />
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
            <Text style={styles.sourceText}>{noticia.source}</Text>
            <View style={styles.timeRow}>
              <Clock color="hsl(215 15% 55%)" size={12} />
              <Text style={styles.timeText}>{noticia.date}</Text>
            </View>
          </View>
          <Text style={styles.title}>{noticia.title}</Text>
          <Text style={styles.summary}>{noticia.summary}</Text>
        </View>

        <View style={styles.body}>
          {noticia.content.map((paragraph, index) => (
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
