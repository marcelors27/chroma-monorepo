import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { getCustomerMe, updateCustomerMe } from "@/lib/medusa";

export default function DadosPessoais() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const { customer } = await getCustomerMe();
        setFirstName(customer?.first_name || "");
        setLastName(customer?.last_name || "");
        setEmail(customer?.email || "");
        setPhone(customer?.phone || "");
      } catch {
        toast.error("Não foi possível carregar seus dados.");
      }
    };

    loadCustomer();
  }, []);

  const handleSave = async () => {
    try {
      await updateCustomerMe({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      toast.success("Dados atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível atualizar.");
    }
  };

  return (
    <AuthenticatedLayout>
      <Header title="Dados pessoais" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <Label>Nome</Label>
          <Input value={firstName} onChangeText={setFirstName} marginTop={4} />
          <Label marginTop={12}>Sobrenome</Label>
          <Input value={lastName} onChangeText={setLastName} marginTop={4} />
          <Label marginTop={12}>E-mail</Label>
          <Input value={email} editable={false} marginTop={4} />
          <Label marginTop={12}>Telefone</Label>
          <Input value={phone} onChangeText={setPhone} marginTop={4} />
          <Button
            onPress={handleSave}
            marginTop={16}
            textProps={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", textAlign: "center" }}
          >
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
    paddingBottom: 12,
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
  },
});
