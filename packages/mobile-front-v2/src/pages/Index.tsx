import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowRight, Newspaper, Package, TrendingUp } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { NewsCard } from "@/components/ui/NewsCard";
import { ProductCard } from "@/components/ui/ProductCard";
import { toast } from "@/lib/toast";
import { useCondo } from "@/contexts/CondoContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProductCategory,
  getProductImage,
  getVariant,
  getVariantPricing,
  listProducts,
  MedusaProduct,
} from "@/lib/medusa";

const featuredNews = {
  id: "featured",
  title: "Nova lei de condomínios entra em vigor e traz mudanças importantes",
  summary: "As principais alterações incluem regras sobre animais de estimação e reformas em unidades.",
  source: "SíndicoNet",
  date: "Há 2 horas",
  image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60",
};

const news = [
  {
    id: "1",
    title: "Como reduzir custos de energia em condomínios",
    summary: "Dicas práticas para diminuir a conta de luz nas áreas comuns.",
    source: "Revista Síndico",
    date: "5h atrás",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=60",
  },
  {
    id: "2",
    title: "Assembleia virtual: guia completo para síndicos",
    summary: "Tudo que você precisa saber sobre assembleias online.",
    source: "Portal do Síndico",
    date: "1 dia atrás",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&auto=format&fit=crop&q=60",
  },
];

export default function Index() {
  const navigation = useNavigation();
  const { activeCondo } = useCondo();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["home-products"], queryFn: listProducts });
  const screenWidth = Dimensions.get("window").width;
  const productCardWidth = (screenWidth - 52) / 2;

  const featuredProducts = (data?.products || [])
    .map((product: MedusaProduct) => {
      const variant = getVariant(product);
      const pricing = getVariantPricing(variant);
      return {
        id: product.id,
        name: product.title,
        description: product.description || "Descrição não informada.",
        price: pricing.finalPrice,
        originalPrice: pricing.onSale ? pricing.basePrice ?? undefined : undefined,
        image: getProductImage(product) || "",
        category: getProductCategory(product),
        variantId: variant?.id || "",
      };
    })
    .slice(0, 2);

  const handleAddToCart = async (product: (typeof featuredProducts)[number]) => {
    if (!activeCondo) {
      toast.error("Selecione um condomínio antes de adicionar itens ao carrinho.");
      return;
    }
    if (!product.variantId) {
      toast.error("Produto indisponível no momento.");
      return;
    }
    await addItem({
      productId: product.id,
      variantId: product.variantId,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <AuthenticatedLayout>
      <Header subtitle={`Olá, ${user?.name || ""}`.trim()} showCondoSelector />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrap}>
                <Package color="#8C98A8" size={16} />
              </View>
              <Text style={styles.metricLabel}>Pedidos</Text>
            </View>
            <Text style={styles.metricValue}>12</Text>
            <Text style={styles.metricHint}>Este mês</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={styles.metricIconWrapAccent}>
                <TrendingUp color="#5DA2E6" size={16} />
              </View>
              <Text style={styles.metricLabel}>Economia</Text>
            </View>
            <Text style={styles.metricValue}>R$ 430</Text>
            <Text style={styles.metricHint}>Em descontos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Newspaper color="#8C98A8" size={18} />
              <Text style={styles.sectionTitle}>Notícias</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Noticias" as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver todas</Text>
              <ArrowRight color="#8C98A8" size={14} />
            </Pressable>
          </View>

          <NewsCard
            {...featuredNews}
            isHighlight
            onClick={() => navigation.navigate("NoticiaDetalhes" as never, { id: featuredNews.id } as never)}
          />
          <View style={styles.listGap}>
            {news.map((item) => (
              <NewsCard
                key={item.id}
                {...item}
                onClick={() => navigation.navigate("NoticiaDetalhes" as never, { id: item.id } as never)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos em destaque</Text>
            <Pressable onPress={() => navigation.navigate("Produtos" as never)} style={styles.linkRow}>
              <Text style={styles.linkText}>Ver todos</Text>
              <ArrowRight color="#8C98A8" size={14} />
            </Pressable>
          </View>

          <View style={styles.productRow}>
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                style={{ width: productCardWidth }}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 16,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(141, 152, 168, 0.15)",
  },
  metricIconWrapAccent: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(93, 162, 230, 0.18)",
  },
  metricLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  metricValue: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
  },
  metricHint: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 6,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  listGap: {
    marginTop: 12,
    gap: 12,
  },
  productRow: {
    flexDirection: "row",
    gap: 12,
  },
});
