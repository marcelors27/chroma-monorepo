import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useToast } from "../hooks/useToast";
import { clearSession, getCustomerMe, updateCustomerMe, updatePassword } from "../lib/medusa";
import type { RootStackParamList } from "../navigation/types";

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { toast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [customerMetadata, setCustomerMetadata] = useState<Record<string, any>>({});

  const [profileData, setProfileData] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    telefone: "",
    cargo: "",
  });

  const [passwordData, setPasswordData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    let mounted = true;
    getCustomerMe()
      .then((data) => {
        if (!mounted) return;
        const customer = data?.customer;
        if (!customer) return;
        const metadata = customer.metadata || {};
        setCustomerMetadata(metadata);
        setProfileData({
          nome: customer.first_name || "",
          sobrenome: customer.last_name || "",
          email: customer.email || "",
          telefone: formatPhone(customer.phone || metadata.telefone || ""),
          cargo: metadata.cargo || "",
        });
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingProfile(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!profileData.nome || !profileData.email) {
      toast({ title: "Erro", description: "Nome e email sao obrigatorios." });
      return;
    }

    try {
      setIsSavingProfile(true);
      const phoneDigits = profileData.telefone.replace(/\D/g, "");
      const payload = {
        first_name: profileData.nome,
        last_name: profileData.sobrenome || undefined,
        phone: phoneDigits || undefined,
        metadata: {
          ...customerMetadata,
          cargo: profileData.cargo || undefined,
          telefone: profileData.telefone || undefined,
        },
      };
      const updated = await updateCustomerMe(payload);
      setCustomerMetadata(updated?.customer?.metadata || customerMetadata);
      toast({ title: "Perfil atualizado", description: "Seus dados foram salvos com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message || "Nao foi possivel atualizar." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.senhaAtual || !passwordData.novaSenha || !passwordData.confirmarSenha) {
      toast({ title: "Erro", description: "Preencha todos os campos de senha." });
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      toast({ title: "Senha muito curta", description: "A nova senha deve ter no minimo 6 caracteres." });
      return;
    }

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast({ title: "Senhas nao conferem", description: "A nova senha e a confirmacao devem ser iguais." });
      return;
    }

    try {
      setIsSavingPassword(true);
      await updatePassword({
        old_password: passwordData.senhaAtual,
        password: passwordData.novaSenha,
      });
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada." });
      setPasswordData({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Nao foi possivel atualizar." });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: "Index" }] });
  };

  return (
    <ScreenBackground source={backgrounds.condos}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Configuracoes</Text>
        {isLoadingProfile && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Carregando perfil...</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Perfil</Text>
          <TextField label="Nome" value={profileData.nome} onChangeText={(value) => setProfileData({ ...profileData, nome: value })} />
          <TextField label="Sobrenome" value={profileData.sobrenome} onChangeText={(value) => setProfileData({ ...profileData, sobrenome: value })} />
          <TextField label="Email" value={profileData.email} onChangeText={(value) => setProfileData({ ...profileData, email: value })} keyboardType="email-address" />
          <TextField label="Telefone" value={profileData.telefone} onChangeText={(value) => setProfileData({ ...profileData, telefone: formatPhone(value) })} />
          <TextField label="Cargo" value={profileData.cargo} onChangeText={(value) => setProfileData({ ...profileData, cargo: value })} />
          <Button title="Salvar perfil" onPress={handleSaveProfile} disabled={isSavingProfile} />
        </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Alterar senha</Text>
        <TextField label="Senha atual" value={passwordData.senhaAtual} onChangeText={(value) => setPasswordData({ ...passwordData, senhaAtual: value })} secureTextEntry />
        <TextField label="Nova senha" value={passwordData.novaSenha} onChangeText={(value) => setPasswordData({ ...passwordData, novaSenha: value })} secureTextEntry />
        <TextField label="Confirmar senha" value={passwordData.confirmarSenha} onChangeText={(value) => setPasswordData({ ...passwordData, confirmarSenha: value })} secureTextEntry />
        <Button title="Atualizar senha" onPress={handleChangePassword} disabled={isSavingPassword} />
      </View>

      <Button title="Condominios" variant="outline" onPress={() => navigation.navigate("Condos")} />
      <Button title="Compras recorrentes" variant="outline" onPress={() => navigation.navigate("Recurrences")} />
      <Button title="Sair" variant="outline" onPress={handleLogout} />
    </ScrollView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  muted: {
    color: colors.muted,
  },
});

export default SettingsScreen;
