import { useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Apple, ArrowLeft, Chrome, Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";

const AUTH_BG = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80";

export default function Auth() {
  const navigation = useNavigation();
  const route = useRoute();
  const { login, loginWithSocial, signup } = useAuth();

  const [isLogin, setIsLogin] = useState((route.params as { mode?: string } | undefined)?.mode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let success = false;
      if (isLogin) {
        success = await login(form.email, form.password);
      } else {
        success = await signup(form.name, form.email, form.password);
      }

      if (success) {
        toast.success(isLogin ? "Login realizado!" : "Conta criada!");
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" as never }] });
      } else {
        toast.error("Verifique seus dados e tente novamente");
      }
    } catch {
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsLoading(true);
    try {
      const success = await loginWithSocial(provider);
      if (success) {
        toast.success("Login realizado!");
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" as never }] });
      }
    } catch {
      toast.error("Erro ao fazer login social");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: AUTH_BG }} style={styles.screen} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate("Landing" as never)}>
          <ArrowLeft color="#8C98A8" size={18} />
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={styles.titleAccent}>Chroma </Text>
            Store
          </Text>
          <Text style={styles.subtitle}>{isLogin ? "Entre na sua conta" : "Crie sua conta grátis"}</Text>
        </View>

        <View style={styles.socialBlock}>
          <Pressable
            onPress={() => handleSocialLogin("google")}
            disabled={isLoading}
            style={[styles.socialButton, isLoading && styles.buttonDisabled]}
          >
            <Chrome color="#E6E8EA" size={20} />
            <Text style={styles.socialText}>Continuar com Google</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSocialLogin("apple")}
            disabled={isLoading}
            style={[styles.socialButton, isLoading && styles.buttonDisabled]}
          >
            <Apple color="#E6E8EA" size={20} />
            <Text style={styles.socialText}>Continuar com Apple</Text>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputWrap}>
              <User color="#8C98A8" size={18} />
              <TextInput
                placeholder="Seu nome"
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                placeholderTextColor="#8C98A8"
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Mail color="#8C98A8" size={18} />
            <TextInput
              placeholder="Seu e-mail"
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              placeholderTextColor="#8C98A8"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Lock color="#8C98A8" size={18} />
            <TextInput
              placeholder="Sua senha"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              placeholderTextColor="#8C98A8"
              style={styles.input}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
              {showPassword ? <EyeOff color="#8C98A8" size={18} /> : <Eye color="#8C98A8" size={18} />}
            </Pressable>
          </View>

          {isLogin && (
            <Pressable>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>
          )}

          <Pressable
            disabled={isLoading}
            onPress={handleSubmit}
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          >
            <Text style={styles.primaryButtonText}>{isLogin ? "Entrar" : "Criar conta"}</Text>
          </Pressable>

          <Pressable onPress={() => setIsLogin((prev) => !prev)} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <Text style={styles.switchLink}>{isLogin ? "Criar conta" : "Entrar"}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 15, 20, 0.78)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  backText: {
    color: "#8C98A8",
    fontSize: 15,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#E6E8EA",
    marginBottom: 8,
  },
  titleAccent: {
    color: "#5DA2E6",
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 16,
  },
  socialBlock: {
    gap: 12,
    marginBottom: 18,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(28, 32, 40, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  socialText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(70, 78, 90, 0.6)",
  },
  dividerText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  form: {
    gap: 14,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(28, 32, 40, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  input: {
    flex: 1,
    color: "#E6E8EA",
    fontSize: 15,
  },
  eyeButton: {
    paddingLeft: 8,
  },
  forgotText: {
    color: "#5DA2E6",
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#5DA2E6",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchRow: {
    alignItems: "center",
  },
  switchText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  switchLink: {
    color: "#5DA2E6",
    fontWeight: "600",
  },
});
