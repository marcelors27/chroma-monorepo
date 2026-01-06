import { Dimensions, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Package, Shield, Truck, CreditCard, ChevronRight, Star } from "lucide-react-native";

const features = [
  {
    icon: Package,
    title: "Produtos Premium",
    description: "Seleção exclusiva para síndicos",
  },
  {
    icon: Truck,
    title: "Entrega Rápida",
    description: "Receba em até 48h",
  },
  {
    icon: CreditCard,
    title: "Pagamento Flexível",
    description: "Pix, cartão ou boleto",
  },
  {
    icon: Shield,
    title: "Compra Segura",
    description: "Dados 100% protegidos",
  },
];

const testimonials = [
  {
    name: "Carlos Silva",
    role: "Síndico há 5 anos",
    text: "A Chroma Store facilitou muito minhas compras para o condomínio. Produtos de qualidade e preços justos!",
    rating: 5,
  },
  {
    name: "Maria Santos",
    role: "Síndica profissional",
    text: "A recorrência de pedidos é perfeita! Nunca mais faltou material de limpeza no condomínio.",
    rating: 5,
  },
];

const HERO_BG = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";
const FEATURES_BG = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80";
const CTA_BG = "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&auto=format&fit=crop&q=80";

export default function Landing() {
  const navigation = useNavigation();
  const screenWidth = Dimensions.get("window").width;
  const featureCardWidth = Math.floor((screenWidth - 84) / 2);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ImageBackground
        source={{ uri: HERO_BG }}
        style={styles.hero}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroPill}>
            <Star color="#5DA2E6" size={16} />
            <Text style={styles.heroPillText}>A loja do síndico moderno</Text>
          </View>

          <Text style={styles.heroTitle}>
            <Text style={styles.heroTitleAccent}>Chroma </Text>
            Store
          </Text>

          <Text style={styles.heroSubtitle}>
            Produtos e serviços exclusivos para gestão de condomínios. Economize tempo e dinheiro.
          </Text>

          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Auth" as never)}>
              <Text style={styles.primaryButtonText}>Começar agora</Text>
              <ChevronRight color="#FFFFFF" size={18} />
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Auth" as never, { mode: "login" } as never)}
            >
              <Text style={styles.secondaryButtonText}>Já tenho conta</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      <ImageBackground
        source={{ uri: FEATURES_BG }}
        style={styles.section}
        imageStyle={styles.sectionImage}
        resizeMode="cover"
      >
        <View style={styles.sectionOverlay} />
        <Text style={styles.sectionTitle}>Por que escolher a Chroma?</Text>
        <View style={styles.featureGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <View key={feature.title} style={[styles.featureCard, { width: featureCardWidth }]}>
                <View style={styles.featureIconWrap}>
                  <Icon color="#5DA2E6" size={18} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            );
          })}
        </View>
      </ImageBackground>

      <View style={styles.testimonials}>
        <Text style={styles.sectionTitle}>O que dizem nossos clientes</Text>
        {testimonials.map((testimonial) => (
          <View key={testimonial.name} style={styles.testimonialCard}>
            <View style={styles.starsRow}>
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={`${testimonial.name}-star-${i}`} color="#5DA2E6" size={16} />
              ))}
            </View>
            <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
            <Text style={styles.testimonialName}>{testimonial.name}</Text>
            <Text style={styles.testimonialRole}>{testimonial.role}</Text>
          </View>
        ))}
      </View>

      <ImageBackground
        source={{ uri: CTA_BG }}
        style={styles.section}
        imageStyle={styles.sectionImage}
        resizeMode="cover"
      >
        <View style={styles.sectionOverlay} />
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Pronto para economizar?</Text>
          <Text style={styles.ctaSubtitle}>Cadastre-se gratuitamente e comece a comprar</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Auth" as never)}>
            <Text style={styles.primaryButtonText}>Criar minha conta grátis</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    margin: 16,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderRadius: 28,
    overflow: "hidden",
  },
  heroImage: {
    borderRadius: 28,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 12, 16, 0.75)",
  },
  heroContent: {
    alignItems: "center",
    gap: 18,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.18)",
  },
  heroPillText: {
    color: "#5DA2E6",
    fontSize: 13,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#E6E8EA",
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
  },
  heroTitleAccent: {
    color: "#5DA2E6",
  },
  heroSubtitle: {
    color: "#95A0AE",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  heroActions: {
    width: "100%",
    gap: 12,
    marginTop: 6,
  },
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#5DA2E6",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(41, 46, 56, 0.9)",
  },
  secondaryButtonText: {
    textAlign: "center",
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  sectionImage: {
    borderRadius: 28,
  },
  sectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 16, 21, 0.82)",
  },
  sectionTitle: {
    textAlign: "center",
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  featureCard: {
    backgroundColor: "rgba(24, 28, 36, 0.92)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  featureIconWrap: {
    backgroundColor: "rgba(93, 162, 230, 0.18)",
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  featureTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDescription: {
    color: "#9AA6B4",
    fontSize: 12,
    lineHeight: 18,
  },
  testimonials: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: 28,
    marginHorizontal: 16,
    backgroundColor: "rgba(18, 21, 28, 0.9)",
  },
  testimonialCard: {
    backgroundColor: "rgba(26, 30, 38, 0.92)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
  },
  testimonialText: {
    color: "#E6E8EA",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  testimonialName: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  testimonialRole: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 2,
  },
  ctaContent: {
    alignItems: "center",
  },
  ctaTitle: {
    color: "#E6E8EA",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  ctaSubtitle: {
    color: "#9AA6B4",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 18,
  },
});
