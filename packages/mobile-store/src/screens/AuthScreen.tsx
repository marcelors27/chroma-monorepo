import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useToast } from "../hooks/useToast";
import { listCompanies, login, registerStore } from "../lib/medusa";
import type { RootStackParamList } from "../navigation/types";

const AuthScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Auth">>();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(route.params?.mode !== "register");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setIsLogin(route.params?.mode !== "register");
  }, [route.params?.mode]);

  const handleSubmit = async () => {
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatorios." });
      setIsLoading(false);
      return;
    }

    if (!isLogin) {
      if (!formData.name) {
        toast({ title: "Erro", description: "Informe seu nome." });
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Erro", description: "As senhas nao coincidem." });
        setIsLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres." });
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        try {
          const { companies } = await listCompanies();
          const hasApproved = companies?.some((company) => company?.approved);
          if (!hasApproved) {
            toast({
              title: "Seu acesso esta em avaliacao",
              description: "Vincule uma empresa para continuar.",
            });
            navigation.replace("CompanyLink");
            return;
          }
        } catch {
          // ignore
        }
        toast({ title: "Login realizado!", description: "Redirecionando para o catalogo." });
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } else {
        await registerStore(formData.email, formData.password);
        toast({
          title: "Cadastro enviado!",
          description: "Vamos validar seus dados e liberar o catalogo.",
        });
        navigation.replace("CompanyLink");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Nao foi possivel concluir a acao." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenBackground source={backgrounds.auth}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Gerencie as compras do seu condominio</Text>
          <Text style={styles.introText}>
            Centralize pedidos, gerencie multiplos CNPJs e tenha acesso a produtos exclusivos para condominios.
          </Text>
        </View>

        <Text style={styles.title}>{isLogin ? "Bem-vindo de volta" : "Crie sua conta"}</Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? "Entre para acessar sua conta e seus condominios."
            : "Cadastre-se e informe os dados da empresa depois."}
        </Text>

        {!isLogin && (
          <TextField
            label="Nome completo"
            value={formData.name}
            onChangeText={(value) => setFormData({ ...formData, name: value })}
            placeholder="Seu nome"
          />
        )}

        <TextField
          label="Email"
          value={formData.email}
          onChangeText={(value) => setFormData({ ...formData, email: value })}
          placeholder="seu@email.com"
          keyboardType="email-address"
        />

        <TextField
          label="Senha"
          value={formData.password}
          onChangeText={(value) => setFormData({ ...formData, password: value })}
          placeholder="********"
          secureTextEntry
        />

        {!isLogin && (
          <TextField
            label="Confirmar senha"
            value={formData.confirmPassword}
            onChangeText={(value) => setFormData({ ...formData, confirmPassword: value })}
            placeholder="********"
            secureTextEntry
          />
        )}

        <Button title={isLogin ? "Entrar" : "Cadastrar"} onPress={handleSubmit} disabled={isLoading} />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isLogin ? "Nao tem conta?" : "Ja tem conta?"}
          </Text>
          <Button
            title={isLogin ? "Cadastrar" : "Entrar"}
            variant="ghost"
            onPress={() => navigation.setParams({ mode: isLogin ? "register" : "login" })}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    minHeight: "100%",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  introCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  introText: {
    color: colors.muted,
    lineHeight: 20,
  },
  switchRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchText: {
    color: colors.muted,
  },
});

export default AuthScreen;
