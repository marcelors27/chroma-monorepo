import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getProductCategory, listManufacturers, listProducts, MedusaManufacturer, MedusaProduct } from "@/lib/medusa";

const MAX_MANUFACTURERS = 40;

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
    const map = new Map<string, string>();
    (productsData?.products || []).forEach((product: MedusaProduct) => {
      const category = getProductCategory(product);
      if (category && !map.has(category)) {
        map.set(category, category);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [productsData]);

  const manufacturers = (manufacturersData?.manufacturers || []) as MedusaManufacturer[];

  const handleNavigate = (params?: { category?: string; manufacturer?: string }) => {
    navigation.navigate("ProdutosIndex" as never, params as never);
  };

  return (
    <AuthenticatedLayout>
      <Header title="Produtos" showCondoSelector />
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
            <View style={styles.chipGroup}>
              <Pressable style={styles.chip} onPress={() => handleNavigate()}>
                <Text style={styles.chipText}>Todos</Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  style={styles.chip}
                  onPress={() => handleNavigate({ category })}
                >
                  <Text style={styles.chipText}>{category}</Text>
                </Pressable>
              ))}
            </View>
            {categories.length === 0 && (
              <Text style={styles.emptyText}>Nenhuma categoria encontrada.</Text>
            )}
          </View>
        )}

        {!manufacturersLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fabricantes</Text>
            <View style={styles.chipGroup}>
              <Pressable style={styles.chip} onPress={() => handleNavigate()}>
                <Text style={styles.chipText}>Todos</Text>
              </Pressable>
              {manufacturers.map((manufacturer) => (
                <Pressable
                  key={manufacturer.id}
                  style={styles.chip}
                  onPress={() => handleNavigate({ manufacturer: manufacturer.slug })}
                >
                  <Text style={styles.chipText}>{manufacturer.name}</Text>
                </Pressable>
              ))}
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
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(24, 28, 36, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(72, 80, 94, 0.6)",
  },
  chipText: {
    color: "#E6E8EA",
    fontSize: 12,
    fontWeight: "600",
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
