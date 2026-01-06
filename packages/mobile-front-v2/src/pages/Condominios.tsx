import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Plus, Building2, Search } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { CondoCard } from "@/components/ui/CondoCard";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

const condominios = [
  {
    id: "1",
    name: "Residencial Jardins",
    address: "Rua das Flores, 123 - Centro",
    units: 48,
    role: "Síndico",
  },
  {
    id: "2",
    name: "Edifício Aurora",
    address: "Av. Principal, 456 - Bairro Alto",
    units: 120,
    role: "Síndico",
  },
  {
    id: "3",
    name: "Condomínio Vista Mar",
    address: "Rua da Praia, 789 - Orla",
    units: 64,
    role: "Subsíndico",
  },
];

export default function Condominios() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCondos = condominios.filter(
    (condo) =>
      condo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      condo.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AuthenticatedLayout>
      <Header title="Meus Condomínios" subtitle="Gestão" showNotification={false} showCondoSelector />

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
          {filteredCondos.map((condo) => (
            <CondoCard
              key={condo.id}
              {...condo}
              onEdit={() => toast.info("Use a tela de detalhes para editar")}
              onClick={() => navigation.navigate("CondominioDetalhes" as never, { id: condo.id } as never)}
            />
          ))}
        </View>

        {filteredCondos.length === 0 && (
          <View style={styles.emptyState}>
            <Building2 color="hsl(215 15% 55%)" size={40} />
            <Text style={styles.emptyTitle}>Nenhum condomínio encontrado</Text>
            <Text style={styles.emptySubtitle}>Adicione seu primeiro condomínio</Text>
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fab}>
        <Plus color="#FFFFFF" size={22} />
      </Pressable>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5DA2E6",
    alignItems: "center",
    justifyContent: "center",
  },
});
