import { ScrollView, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const orders = [
  {
    id: "#1298",
    status: "Entregue",
    date: "12/07/2024",
    total: 489.9,
    items: 6,
  },
  {
    id: "#1297",
    status: "Em transporte",
    date: "08/07/2024",
    total: 219.9,
    items: 3,
  },
];

export default function Pedidos() {
  const navigation = useNavigation();

  return (
    <AuthenticatedLayout>
      <Header title="Pedidos" showCondoSelector showNotification={false} />

      <ScrollView className="px-4 py-4">
        {orders.map((order) => (
          <View key={order.id} className="bg-card rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">{order.id}</Text>
              <Text className="text-xs text-muted-foreground">{order.date}</Text>
            </View>
            <Text className="text-sm text-primary mt-1">{order.status}</Text>
            <Text className="text-sm text-muted-foreground mt-2">
              {order.items} itens • R$ {order.total.toFixed(2)}
            </Text>
            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={() => navigation.navigate("Rastreamento" as never, { id: order.id } as never)}
                className="px-3 py-2 rounded-xl bg-secondary"
              >
                <Text className="text-sm text-foreground">Rastrear</Text>
              </Pressable>
              <Pressable onPress={() => toast.success(`Itens do pedido ${order.id} adicionados ao carrinho!`)} className="px-3 py-2 rounded-xl bg-primary">
                <Text className="text-sm text-primary-foreground">Comprar novamente</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}
