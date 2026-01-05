import { ScrollView, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";

export default function Seguranca() {
  return (
    <AuthenticatedLayout>
      <Header title="Segurança" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4">
          <Label>Senha atual</Label>
          <Input secureTextEntry className="mt-1" />
          <Label className="mt-3">Nova senha</Label>
          <Input secureTextEntry className="mt-1" />
          <Label className="mt-3">Confirmar nova senha</Label>
          <Input secureTextEntry className="mt-1" />
          <Button onPress={() => toast.success("Senha alterada com sucesso!")} className="mt-4">
            Atualizar senha
          </Button>
        </View>

        <View className="bg-card rounded-2xl p-4 mt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-foreground">Autenticação em dois fatores</Text>
              <Text className="text-xs text-muted-foreground mt-1">Mais segurança na sua conta</Text>
            </View>
            <Switch
              value={false}
              onValueChange={(value) =>
                toast.success(value ? "Autenticação em dois fatores ativada" : "Autenticação em dois fatores desativada")
              }
            />
          </View>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
