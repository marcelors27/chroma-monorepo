import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getProductCategory,
  getProductImage,
  listManufacturers,
  listProducts,
  MedusaManufacturer,
  MedusaProduct,
} from "@/lib/medusa";

const MAX_MANUFACTURERS = 40;

type CategoryHero = {
  label: string;
  image?: string;
};

export default function ProdutosCategorias() {
  const navigation = useNavigation();
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-categories"],
    queryFn: listProducts,
  });
  const { data: manufacturersData, isLoading: manufacturersLoading } = useQuery({
    queryKey: ["products-manufacturers"],
    queryFn: () => listManufacturers({ limit: MAX_MANUFACTURERS }),
  });

  const categories = useMemo(() => {
    const map = new Map<string, CategoryHero>();
    (productsData?.products || []).forEach((product: MedusaProduct) => {
      const category = getProductCategory(product);
      if (!category || map.has(category)) return;
      map.set(category, {
        label: category,
        image: getProductImage(product) || undefined,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [productsData]);

  const manufacturers = useMemo(() => {
    const firstImageByManufacturer = new Map<string, string>();
    ((productsData?.products || []) as MedusaProduct[]).forEach((product) => {
      const slug = String((product.metadata as any)?.manufacturer_slug || "");
      if (!slug || firstImageByManufacturer.has(slug)) return;
      const image = getProductImage(product);
      if (image) firstImageByManufacturer.set(slug, image);
    });

    return ((manufacturersData?.manufacturers || []) as MedusaManufacturer[]).map((manufacturer) => ({
      ...manufacturer,
      hero_image: manufacturer.image_url || firstImageByManufacturer.get(String(manufacturer.slug)) || null,
    }));
  }, [manufacturersData, productsData]);

  const handleNavigate = (params?: { category?: string; manufacturer?: string }) => {
    if (!params?.category && !params?.manufacturer) {
      navigation.navigate(
        "ProdutosIndex" as never,
        { category: undefined, manufacturer: undefined, manufacturerSlug: undefined } as never
      );
      return;
    }
    navigation.navigate("ProdutosIndex" as never, params as never);
  };

  const HeroCard = ({
    title,
    image,
    onPress,
  }: {
    title: string;
    image?: string | null;
    onPress: () => void;
  }) => (
    <Pressable style={styles.heroCard} onPress={onPress}>
      {image ? (
        <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={styles.heroImageFallback}>
          <Text style={styles.heroFallbackText}>Sem imagem</Text>
        </View>
      )}
      <View style={styles.heroOverlay} />
      <Text style={styles.heroTitle} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );

  return (
    <AuthenticatedLayout>
      <Header title="Categorias" showCondoSelector />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Escolha uma categoria ou fabricante para começar.</Text>

        {(productsLoading || manufacturersLoading) && (
          <View style={styles.loadingWrapper}>
            <LoadingSpinner size={48} />
          </View>
        )}

        {!productsLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorias</Text>
            <View style={styles.heroRow}>
              {categories.map((category) => (
                <HeroCard
                  key={category.label}
                  title={category.label}
                  image={category.image}
                  onPress={() => handleNavigate({ category: category.label })}
                />
              ))}
              <HeroCard title="Todos" onPress={() => handleNavigate()} />
            </View>
            {categories.length === 0 && <Text style={styles.emptyText}>Nenhuma categoria encontrada.</Text>}
          </View>
        )}

        {!manufacturersLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fabricantes</Text>
            <View style={styles.heroRow}>
              {manufacturers.map((manufacturer) => (
                <HeroCard
                  key={manufacturer.id}
                  title={manufacturer.name}
                  image={(manufacturer as any).hero_image}
                  onPress={() => handleNavigate({ manufacturer: manufacturer.slug })}
                />
              ))}
              <HeroCard title="Todos" onPress={() => handleNavigate()} />
            </View>
            {manufacturers.length === 0 && (
              <Text style={styles.emptyText}>Nenhum fabricante disponível.</Text>
            )}
          </View>
        )}

        <Pressable style={styles.primaryButton} onPress={() => handleNavigate()}>
          <Text style={styles.primaryButtonText}>Ver todos os produtos</Text>
        </Pressable>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 20,
    gap: 20,
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 14,
  },
  loadingWrapper: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCard: {
    width: "48%",
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(86, 98, 116, 0.5)",
    backgroundColor: "rgba(24, 28, 36, 0.92)",
    justifyContent: "flex-end",
    padding: 10,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroImageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 47, 62, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackText: {
    color: "#8C98A8",
    fontSize: 11,
    fontWeight: "600",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 13, 22, 0.45)",
  },
  heroTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: "#5DA2E6",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "700",
  },
});
