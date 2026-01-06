import { ScrollView, StyleSheet, Text, View } from "react-native";
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

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <Label>Nome completo</Label>
          <Input defaultValue="João Silva" marginTop={4} />
          <Label marginTop={12}>E-mail</Label>
          <Input defaultValue="joao.silva@email.com" marginTop={4} />
          <Label marginTop={12}>Telefone</Label>
          <Input defaultValue="(11) 99999-0000" marginTop={4} />
          <Button onPress={() => toast.success("Dados atualizados com sucesso!")} marginTop={16}>
            Salvar alterações
          </Button>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
  },
});
