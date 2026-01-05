import { ScrollView, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const payments = [
  { id: "1", type: "Cartão", label: "Visa •••• 1234", default: true },
  { id: "2", type: "Pix", label: "Chave cadastrada", default: false },
];

export default function Pagamentos() {
  return (
    <AuthenticatedLayout>
      <Header title="Pagamentos" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        {payments.map((payment) => (
          <View key={payment.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-sm font-semibold text-foreground">{payment.label}</Text>
            <Text className="text-xs text-muted-foreground mt-1">{payment.type}</Text>
            <View className="flex-row gap-2 mt-3">
              {!payment.default && (
                <Pressable onPress={() => toast.success("Forma de pagamento padrão atualizada")} className="px-3 py-2 rounded-xl bg-secondary">
                  <Text className="text-sm text-foreground">Tornar padrão</Text>
                </Pressable>
              )}
              <Pressable onPress={() => toast.success("Forma de pagamento removida")} className="px-3 py-2 rounded-xl bg-destructive/10">
                <Text className="text-sm text-destructive">Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable onPress={() => toast.info("Funcionalidade em desenvolvimento")} className="mt-2 px-4 py-3 rounded-xl bg-accent">
          <Text className="text-accent-foreground font-semibold text-center">Adicionar pagamento</Text>
        </Pressable>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
