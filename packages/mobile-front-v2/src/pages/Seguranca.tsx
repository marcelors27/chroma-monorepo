import { ScrollView, StyleSheet, Text, View } from "react-native";
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

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <Label>Senha atual</Label>
          <Input secureTextEntry marginTop={4} />
          <Label marginTop={12}>Nova senha</Label>
          <Input secureTextEntry marginTop={4} />
          <Label marginTop={12}>Confirmar nova senha</Label>
          <Input secureTextEntry marginTop={4} />
          <Button onPress={() => toast.success("Senha alterada com sucesso!")} marginTop={16}>
            Atualizar senha
          </Button>
        </View>

        <View style={[styles.card, styles.cardSpacing]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Autenticação em dois fatores</Text>
              <Text style={styles.cardSubtitle}>Mais segurança na sua conta</Text>
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
  cardSpacing: {
    marginTop: 16,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
});
