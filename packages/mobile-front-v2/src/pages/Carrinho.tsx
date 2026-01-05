import { useState } from "react";
import { ScrollView, Text, View, Pressable, Image } from "react-native";
import { Minus, Plus, Trash2, QrCode, CreditCard, Receipt, RefreshCw, ChevronRight } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const cartItems = [
  {
    id: "1",
    name: "Kit Limpeza Profissional",
    quantity: 2,
    price: 189.9,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=60",
  },
  {
    id: "2",
    name: "Câmera de Segurança HD",
    quantity: 1,
    price: 299.9,
    image: "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=300&auto=format&fit=crop&q=60",
  },
];

export default function Carrinho() {
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | "boleto">("pix");
  const [selectedRecurrence, setSelectedRecurrence] = useState<"unica" | "semanal" | "quinzenal" | "mensal">("unica");
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formattedTotal = total.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <AuthenticatedLayout>
      <Header title="Carrinho" subtitle={`${cartItems.length} itens`} showNotification={false} showCondoSelector />

      <ScrollView className="px-4 pt-2 pb-24">
        {cartItems.map((item) => (
          <View key={item.id} className="bg-card rounded-3xl px-4 py-5 mb-4 border border-border">
            <View className="flex-row items-center gap-4">
              <Image source={{ uri: item.image }} className="w-[76px] h-[76px] rounded-2xl" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                <Text className="text-lg font-semibold text-muted-foreground mt-1">
                  R$ {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
                <View className="flex-row items-center gap-3 mt-4">
                  <Pressable className="w-10 h-10 rounded-full bg-secondary items-center justify-center">
                    <Minus color="#C7CBD1" size={16} />
                  </Pressable>
                  <Text className="text-base font-semibold text-foreground min-w-[20px] text-center">
                    {item.quantity}
                  </Text>
                  <Pressable className="w-10 h-10 rounded-full bg-secondary items-center justify-center">
                    <Plus color="#E6E8EA" size={16} />
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => toast.success("Item removido do carrinho")} className="p-2">
                <Trash2 color="#E64646" size={20} />
              </Pressable>
            </View>
          </View>
        ))}

        <Text className="text-lg font-semibold text-foreground mt-4">Forma de pagamento</Text>
        <View className="mt-4 gap-3">
          {[
            { id: "pix", title: "Pix", subtitle: "Pagamento instantâneo", icon: QrCode },
            { id: "cartao", title: "Cartão", subtitle: "Crédito ou débito", icon: CreditCard },
            { id: "boleto", title: "Boleto", subtitle: "Vencimento em 3 dias", icon: Receipt },
          ].map((option) => {
            const Icon = option.icon;
            const active = selectedPayment === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedPayment(option.id as "pix" | "cartao" | "boleto")}
                className="bg-card rounded-2xl px-4 py-5 border border-border flex-row items-center gap-3"
              >
                <View className="w-12 h-12 rounded-2xl bg-secondary items-center justify-center">
                  <Icon color="#8C98A8" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{option.title}</Text>
                  <Text className="text-sm text-muted-foreground">{option.subtitle}</Text>
                </View>
                <View
                  className={cn(
                    "w-6 h-6 rounded-full border-2 items-center justify-center",
                    active ? "border-accent" : "border-muted-foreground",
                  )}
                >
                  {active && <View className="w-3 h-3 rounded-full bg-accent" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center gap-2 mt-7">
          <RefreshCw color="#8C98A8" size={18} />
          <Text className="text-lg font-semibold text-foreground">Recorrência</Text>
        </View>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {[
            { id: "unica", title: "Compra única", subtitle: "Sem recorrência" },
            { id: "semanal", title: "Semanal", subtitle: "Toda semana" },
            { id: "quinzenal", title: "Quinzenal", subtitle: "A cada 2 semanas" },
            { id: "mensal", title: "Mensal", subtitle: "Todo mês" },
          ].map((option) => {
            const active = selectedRecurrence === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  setSelectedRecurrence(option.id as "unica" | "semanal" | "quinzenal" | "mensal")
                }
                className={cn(
                  "w-[48%] rounded-2xl px-4 py-5 border",
                  active ? "bg-secondary border-accent" : "bg-card border-border",
                )}
              >
                <Text className="text-base font-semibold text-foreground">{option.title}</Text>
                <Text className="text-sm text-muted-foreground mt-1">{option.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="bg-card rounded-3xl px-5 py-6 mt-7 border border-border">
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted-foreground">Subtotal</Text>
            <Text className="text-sm text-foreground">R$ {formattedTotal}</Text>
          </View>
          <View className="flex-row justify-between pb-3 border-b border-border">
            <Text className="text-sm text-muted-foreground">Frete</Text>
            <Text className="text-sm text-muted-foreground">Grátis</Text>
          </View>
          <View className="flex-row justify-between items-center mt-4">
            <Text className="text-lg font-semibold text-foreground">Total</Text>
            <Text className="text-lg font-semibold text-muted-foreground">R$ {formattedTotal}</Text>
          </View>
          <Pressable
            onPress={() => toast.success("Pedido realizado com sucesso!")}
            className="mt-6 py-4 rounded-2xl bg-secondary flex-row items-center justify-center gap-2"
          >
            <Text className="text-base font-semibold text-foreground">Finalizar Compra</Text>
            <ChevronRight color="#E6E8EA" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
