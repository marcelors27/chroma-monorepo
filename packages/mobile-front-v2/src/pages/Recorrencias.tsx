import { ScrollView, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const recurringOrders = [
  { id: "1", name: "Kit Limpeza Profissional", status: "active", frequency: "Mensal" },
  { id: "2", name: "Sacos de Lixo 100L", status: "paused", frequency: "Quinzenal" },
];

export default function Recorrencias() {
  return (
    <AuthenticatedLayout>
      <Header title="Recorrências" showCondoSelector showNotification={false} />

      <ScrollView className="px-4 py-4">
        {recurringOrders.map((item) => (
          <View key={item.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
            <Text className="text-xs text-muted-foreground mt-1">{item.frequency}</Text>
            <Text className="text-xs text-primary mt-2">{item.status === "active" ? "Ativa" : "Pausada"}</Text>
            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={() => toast.success(item.status === "active" ? "Recorrência pausada" : "Recorrência ativada")}
                className="px-3 py-2 rounded-xl bg-secondary"
              >
                <Text className="text-sm text-foreground">Alternar</Text>
              </Pressable>
              <Pressable onPress={() => toast.success("Recorrência removida")} className="px-3 py-2 rounded-xl bg-destructive/10">
                <Text className="text-sm text-destructive">Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}
