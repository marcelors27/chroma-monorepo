import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Plus, Building2, Search } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { CondoCard } from "@/components/ui/CondoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCondo } from "@/contexts/CondoContext";
import { listCompanies } from "@/lib/medusa";

export default function Condominios() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["companies"], queryFn: listCompanies });
  const { hasApprovedCondo } = useCondo();
  const isFirstAccess = !hasApprovedCondo;

  const condominios = useMemo(() => {
    return (data?.companies || []).map((company: any) => ({
      id: company.id,
      name: company.fantasy_name || company.trade_name || company.name || "Condomínio",
      address: company.metadata?.address || company.metadata?.city || "",
      units: Number(company.metadata?.units) || 0,
      role: company.metadata?.role || "Síndico",
    }));
  }, [data]);

  const filteredCondos = condominios.filter(
    (condo) =>
      condo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      condo.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
      <Header
        title="Meus Condomínios"
        subtitle="Gestão"
        showNotification={false}
        showCondoSelector={!isFirstAccess}
      />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Building2 color="hsl(220 10% 50%)" size={22} />
            </View>
            <View>
              <Text style={styles.summaryCount}>{condominios.length}</Text>
              <Text style={styles.summaryLabel}>Condomínios cadastrados</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Search color="hsl(215 15% 55%)" size={18} />
          </View>
          <Input
            placeholder="Buscar condomínio..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="hsl(215 15% 55%)"
            paddingLeft={40}
            paddingRight={16}
          />
        </View>

        <View style={styles.list}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <View key={`condo-skeleton-${index}`} style={styles.condoSkeletonCard}>
                  <View style={styles.condoSkeletonRow}>
                    <Skeleton style={styles.condoSkeletonIcon} />
                    <View style={styles.condoSkeletonContent}>
                      <Skeleton style={styles.condoSkeletonLine} />
                      <Skeleton style={styles.condoSkeletonLineShort} />
                    </View>
                  </View>
                </View>
              ))
            : filteredCondos.map((condo) => (
                <CondoCard
                  key={condo.id}
                  {...condo}
                  onEdit={() => navigation.navigate("CondominioDetalhes" as never, { id: condo.id } as never)}
                  onClick={() => navigation.navigate("CondominioDetalhes" as never, { id: condo.id } as never)}
                />
              ))}
        </View>

        {!isLoading && filteredCondos.length === 0 && (
          <View style={styles.emptyState}>
            <Building2 color="hsl(215 15% 55%)" size={40} />
            <Text style={styles.emptyTitle}>Nenhum condomínio encontrado</Text>
            <Text style={styles.emptySubtitle}>Adicione seu primeiro condomínio</Text>
          </View>
        )}

        <View style={styles.addButtonContainer}>
          <Button
            style={styles.addButton}
            onPress={() => navigation.navigate("CondominioDetalhes" as never)}
          >
            <View style={styles.addButtonContent}>
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.addButtonText}>Novo Condomínio</Text>
            </View>
          </Button>
        </View>

        {isFirstAccess && (
          <View style={styles.firstAccessCard}>
            <Text style={styles.firstAccessTitle}>Finalize o cadastro</Text>
            <Text style={styles.firstAccessSubtitle}>
              Cadastre todos os condomínios desejados antes de finalizar.
            </Text>
            <Button
              onPress={() => navigation.navigate("AccessPending" as never)}
              disabled={condominios.length === 0}
              backgroundColor={condominios.length === 0 ? "#5DA2E6" : undefined}
              opacity={condominios.length === 0 ? 0.6 : 1}
            >
              Finalizar
            </Button>
            {condominios.length === 0 && (
              <Text style={styles.firstAccessHint}>Adicione pelo menos um condomínio para continuar.</Text>
            )}
          </View>
        )}
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
  summaryCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
  },
  summaryCount: {
    color: "#E6E8EA",
    fontSize: 22,
    fontWeight: "700",
  },
  summaryLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  searchContainer: {
    position: "relative",
    marginTop: 16,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: [{ translateY: -9 }],
    zIndex: 1,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  condoSkeletonCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    padding: 14,
  },
  condoSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  condoSkeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  condoSkeletonContent: {
    flex: 1,
    gap: 8,
  },
  condoSkeletonLine: {
    height: 12,
    borderRadius: 8,
  },
  condoSkeletonLineShort: {
    height: 10,
    width: "55%",
    borderRadius: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#8C98A8",
    fontSize: 13,
  },
  addButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  addButton: {
    width: "100%",
    height: 40,
    borderRadius: 12,
    backgroundColor: "#5DA2E6",
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  firstAccessCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.5)",
    backgroundColor: "rgba(24, 28, 36, 0.92)",
    gap: 10,
  },
  firstAccessTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
  },
  firstAccessSubtitle: {
    color: "#8C98A8",
    fontSize: 13,
    lineHeight: 18,
  },
  firstAccessHint: {
    color: "#C6CCD4",
    fontSize: 12,
    marginTop: 6,
  },
});
