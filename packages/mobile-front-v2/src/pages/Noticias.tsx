import { useState, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Search, X } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { NewsCard } from "@/components/ui/NewsCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

      <ScrollView className="px-4 py-4">
        <View className="relative">
          <View className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search color="hsl(215 15% 55%)" size={16} />
          </View>
          <Input
            placeholder="Buscar notícias..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 pr-10 bg-card border-border"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X color="hsl(215 15% 55%)" size={16} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 -mx-4 px-4">
          <View className="flex-row gap-2">
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full",
                  selectedCategory === category ? "bg-primary" : "bg-card",
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    selectedCategory === category ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text className="text-sm text-muted-foreground mt-3">
          {filteredNews.length} {filteredNews.length === 1 ? "notícia encontrada" : "notícias encontradas"}
        </Text>

        <View className="gap-3 mt-3">
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
            <View className="items-center py-12">
              <Text className="text-muted-foreground">Nenhuma notícia encontrada</Text>
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todas");
                }}
              >
                <Text className="text-primary text-sm mt-2">Limpar filtros</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
