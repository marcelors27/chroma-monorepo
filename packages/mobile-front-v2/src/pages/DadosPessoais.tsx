import { ScrollView, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

export default function DadosPessoais() {
  return (
    <AuthenticatedLayout>
      <Header title="Dados pessoais" showBackButton showCondoSelector />

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4">
          <Label>Nome completo</Label>
          <Input defaultValue="João Silva" className="mt-1" />
          <Label className="mt-3">E-mail</Label>
          <Input defaultValue="joao.silva@email.com" className="mt-1" />
          <Label className="mt-3">Telefone</Label>
          <Input defaultValue="(11) 99999-0000" className="mt-1" />
          <Button onPress={() => toast.success("Dados atualizados com sucesso!")} className="mt-4">
            Salvar alterações
          </Button>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
