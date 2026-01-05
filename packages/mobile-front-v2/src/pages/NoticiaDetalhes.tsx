import { Image, Pressable, ScrollView, Text, View } from "react-native";
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
      <ScrollView className="px-4 py-4">
        <View className="relative">
          <Image source={{ uri: noticia.image }} className="w-full h-56 rounded-2xl" />
          <View className="absolute top-4 left-4">
            <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-full bg-black/50">
              <ArrowLeft color="white" size={18} />
            </Pressable>
          </View>
          <View className="absolute top-4 right-4 flex-row gap-2">
            <Pressable onPress={handleShare} className="p-2 rounded-full bg-black/50">
              <Share2 color="white" size={18} />
            </Pressable>
            <Pressable onPress={() => toast.success("Notícia salva!")} className="p-2 rounded-full bg-black/50">
              <BookmarkPlus color="white" size={18} />
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-primary font-medium">{noticia.source}</Text>
            <View className="flex-row items-center gap-1">
              <Clock color="hsl(215 15% 55%)" size={12} />
              <Text className="text-xs text-muted-foreground">{noticia.date}</Text>
            </View>
          </View>
          <Text className="text-xl font-bold text-foreground mt-2">{noticia.title}</Text>
          <Text className="text-sm text-muted-foreground mt-3">{noticia.summary}</Text>
        </View>

        <View className="mt-4">
          {noticia.content.map((paragraph, index) => (
            <Text key={index} className="text-sm text-foreground/90 mb-3">
              {paragraph}
            </Text>
          ))}
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
