import { ScrollView, Text, View, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const trackingSteps = [
  { id: "1", title: "Pedido confirmado", date: "08/07" },
  { id: "2", title: "Em separação", date: "09/07" },
  { id: "3", title: "Em transporte", date: "10/07" },
  { id: "4", title: "Saiu para entrega", date: "11/07" },
];

export default function Rastreamento() {
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? "#1297";

  return (
    <AuthenticatedLayout>
      <Header title="Rastreamento" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-sm text-muted-foreground">Pedido</Text>
          <Text className="text-lg font-semibold text-foreground">{id}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Código de rastreio: BR123456789</Text>
          <Pressable onPress={() => toast.success("Código de rastreio copiado!")} className="mt-3 px-3 py-2 rounded-xl bg-secondary">
            <Text className="text-sm text-foreground">Copiar código</Text>
          </Pressable>
        </View>

        <View className="mt-4">
          {trackingSteps.map((step) => (
            <View key={step.id} className="bg-card rounded-2xl p-4 mb-3">
              <Text className="text-sm font-semibold text-foreground">{step.title}</Text>
              <Text className="text-xs text-muted-foreground mt-1">{step.date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
