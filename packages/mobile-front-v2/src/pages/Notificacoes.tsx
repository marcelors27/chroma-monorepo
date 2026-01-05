import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";

export default function Notificacoes() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  return (
    <AuthenticatedLayout>
      <Header title="Notificações" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-foreground">Notificações push</Text>
              <Text className="text-xs text-muted-foreground mt-1">Alertas sobre pedidos</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(value) => {
                setPushEnabled(value);
                toast.success(value ? "Notificações push ativadas" : "Notificações push desativadas");
              }}
            />
          </View>
        </View>

        <View className="bg-card rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-foreground">E-mail</Text>
              <Text className="text-xs text-muted-foreground mt-1">Resumo semanal</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={(value) => {
                setEmailEnabled(value);
                toast.success("Preferência atualizada");
              }}
            />
          </View>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
