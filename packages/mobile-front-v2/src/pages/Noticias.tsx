import { useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Search, X } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { NewsCard } from "@/components/ui/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { listNews, MedusaNews } from "@/lib/medusa";

export default function Noticias() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const { data, isLoading } = useQuery({ queryKey: ["news-list"], queryFn: () => listNews({ limit: 100 }) });
  const allNews = (data?.news || []) as MedusaNews[];

  const categories = useMemo(() => {
    const set = new Set<string>();
    allNews.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["Todas", ...Array.from(set)];
  }, [allNews]);

  const formatNewsDate = (date?: string | null) => {
    if (!date) return "Agora";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const filteredNews = useMemo(() => {
    return allNews.filter((news) => {
      const matchesSearch =
        news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "Todas" || news.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <AuthenticatedLayout>
      <Header title="Notícias" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Search color="hsl(215 15% 55%)" size={16} />
          </View>
          <Input
            placeholder="Buscar notícias..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            paddingLeft={40}
            paddingRight={40}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearIcon}>
              <X color="hsl(215 15% 55%)" size={16} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesContent}>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryPill,
                  selectedCategory === category ? styles.categoryPillActive : styles.categoryPillIdle,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category ? styles.categoryTextActive : styles.categoryTextIdle,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {!isLoading && (
          <Text style={styles.resultsText}>
            {filteredNews.length} {filteredNews.length === 1 ? "notícia encontrada" : "notícias encontradas"}
          </Text>
        )}

        <View style={styles.newsList}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <View key={`news-skeleton-${index}`} style={styles.newsSkeletonCard}>
                <Skeleton style={styles.newsSkeletonImage} />
                <View style={styles.newsSkeletonContent}>
                  <Skeleton style={styles.newsSkeletonLine} />
                  <Skeleton style={styles.newsSkeletonLine} />
                  <Skeleton style={styles.newsSkeletonLineShort} />
                </View>
              </View>
            ))
          ) : filteredNews.length > 0 ? (
            filteredNews.map((news, index) => (
              <NewsCard
                key={news.id}
                title={news.title}
                summary={news.summary}
                source={news.source || news.author || "Chroma"}
                date={formatNewsDate(news.published_at)}
                image={news.image_url || undefined}
                isHighlight={index === 0 && selectedCategory === "Todas" && !searchQuery}
                onClick={() => navigation.navigate("NoticiaDetalhes" as never, { id: news.id } as never)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhuma notícia encontrada</Text>
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todas");
                }}
              >
                <Text style={styles.clearText}>Limpar filtros</Text>
              </Pressable>
            </View>
          )}
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
  searchContainer: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  clearIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  categoriesScroll: {
    marginTop: 16,
    marginHorizontal: -16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryPillActive: {
    backgroundColor: "#5DA2E6",
  },
  categoryPillIdle: {
    backgroundColor: "rgba(24, 28, 36, 0.9)",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#0B0F14",
  },
  categoryTextIdle: {
    color: "#8C98A8",
  },
  resultsText: {
    marginTop: 12,
    fontSize: 13,
    color: "#8C98A8",
  },
  newsList: {
    marginTop: 12,
    gap: 12,
  },
  newsSkeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  newsSkeletonImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
  },
  newsSkeletonContent: {
    gap: 8,
  },
  newsSkeletonLine: {
    height: 12,
    borderRadius: 8,
  },
  newsSkeletonLineShort: {
    height: 12,
    width: "55%",
    borderRadius: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "#8C98A8",
  },
  clearText: {
    marginTop: 8,
    color: "#5DA2E6",
    fontSize: 13,
    fontWeight: "600",
  },
});
