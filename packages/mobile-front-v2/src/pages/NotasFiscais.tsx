import { ScrollView, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const invoices = [
  { id: "NF-1001", status: "Disponível", total: 489.9 },
  { id: "NF-1002", status: "Processando", total: 219.9 },
];

export default function NotasFiscais() {
  return (
    <AuthenticatedLayout>
      <Header title="Notas fiscais" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        {invoices.map((invoice) => (
          <View key={invoice.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-sm font-semibold text-foreground">{invoice.id}</Text>
            <Text className="text-xs text-muted-foreground mt-1">{invoice.status}</Text>
            <Text className="text-sm text-foreground mt-2">R$ {invoice.total.toFixed(2)}</Text>
            <Pressable
              onPress={() =>
                invoice.status === "Disponível"
                  ? toast.success(`Baixando ${invoice.id}`)
                  : toast.info("Nota fiscal ainda está sendo processada")
              }
              className="mt-3 px-3 py-2 rounded-xl bg-secondary"
            >
              <Text className="text-sm text-foreground">Baixar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}
