import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Plus, Building2, Search } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { CondoCard } from "@/components/ui/CondoCard";
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

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4">
          <View className="flex-row items-center gap-3">
            <View className="p-3 rounded-xl bg-primary/20">
              <Building2 color="hsl(220 10% 50%)" size={22} />
            </View>
            <View>
              <Text className="text-2xl font-bold text-foreground">{condominios.length}</Text>
              <Text className="text-sm text-muted-foreground">Condomínios cadastrados</Text>
            </View>
          </View>
        </View>

        <View className="relative mt-4">
          <View className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search color="hsl(215 15% 55%)" size={18} />
          </View>
          <TextInput
            placeholder="Buscar condomínio..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-card border border-border text-foreground"
            placeholderTextColor="hsl(215 15% 55%)"
          />
        </View>

        <View className="gap-3 mt-4">
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
          <View className="items-center justify-center py-12">
            <Building2 color="hsl(215 15% 55%)" size={40} />
            <Text className="font-semibold text-foreground mt-3">Nenhum condomínio encontrado</Text>
            <Text className="text-sm text-muted-foreground">Adicione seu primeiro condomínio</Text>
          </View>
        )}
      </ScrollView>

      <Pressable className="absolute bottom-6 right-4 p-4 rounded-full bg-primary">
        <Plus color="white" size={22} />
      </Pressable>
    </AuthenticatedLayout>
  );
}
