import { useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Search, X } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { NewsCard } from "@/components/ui/NewsCard";
import { Input } from "@/components/ui/input";

const allNews = [
  {
    id: "featured",
    title: "Nova lei de condomínios entra em vigor e traz mudanças importantes",
    summary: "As principais alterações incluem regras sobre animais de estimação e reformas em unidades.",
    source: "SíndicoNet",
    date: "Há 2 horas",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60",
    category: "Legislação",
  },
  {
    id: "1",
    title: "Como reduzir custos de energia em condomínios",
    summary: "Dicas práticas para diminuir a conta de luz nas áreas comuns.",
    source: "Revista Síndico",
    date: "5h atrás",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=60",
    category: "Economia",
  },
  {
    id: "2",
    title: "Assembleia virtual: guia completo para síndicos",
    summary: "Tudo que você precisa saber sobre assembleias online.",
    source: "Portal do Síndico",
    date: "1 dia atrás",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&auto=format&fit=crop&q=60",
    category: "Gestão",
  },
  {
    id: "3",
    title: "Manutenção preventiva: calendário anual para síndicos",
    summary: "Organize as manutenções do seu condomínio com este guia completo.",
    source: "Manutenção & Cia",
    date: "2 dias atrás",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=60",
    category: "Manutenção",
  },
  {
    id: "4",
    title: "Segurança condominial: tendências para 2024",
    summary: "Novas tecnologias e práticas para manter seu condomínio seguro.",
    source: "Segurança Total",
    date: "3 dias atrás",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop&q=60",
    category: "Segurança",
  },
];

const categories = ["Todas", "Legislação", "Economia", "Gestão", "Manutenção", "Segurança"];

export default function Noticias() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

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

        <Text style={styles.resultsText}>
          {filteredNews.length} {filteredNews.length === 1 ? "notícia encontrada" : "notícias encontradas"}
        </Text>

        <View style={styles.newsList}>
          {filteredNews.length > 0 ? (
            filteredNews.map((news, index) => (
              <NewsCard
                key={news.id}
                {...news}
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
