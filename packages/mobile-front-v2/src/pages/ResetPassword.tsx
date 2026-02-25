import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Mail } from "lucide-react-native";
import { requestPasswordReset } from "@/lib/medusa";
import { toast } from "@/lib/toast";
import logo from "@/assets/logo.png";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { suspendGlobalLoading } from "@/lib/global-loading";
import { LOGO_SIZE } from "@/constants/ui";

const AUTH_BG = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80";

export default function ResetPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const canGoBack = navigation.canGoBack?.() ?? false;
  const initialEmail = (route.params as { email?: string } | undefined)?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disabled = useMemo(() => !email.trim() || isSubmitting, [email, isSubmitting]);

  const handleSubmit = async () => {
    if (disabled) return;
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      toast.success("Enviamos uma nova senha para o seu e-mail.");
      navigation.goBack();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar a nova senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isSubmitting) return;
    return suspendGlobalLoading();
  }, [isSubmitting]);

  return (
    <ImageBackground source={{ uri: AUTH_BG }} style={styles.screen} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.content}>
        {canGoBack && (
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#8C98A8" size={18} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        )}

        <View style={styles.header}>
          <Image source={logo} style={styles.brandLogo} />
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>Envie seu e-mail para receber uma nova senha.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Mail color="#8C98A8" size={18} />
            <TextInput
              placeholder="Seu e-mail"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#8C98A8"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            disabled={disabled}
            onPress={handleSubmit}
            style={[styles.primaryButton, disabled && styles.buttonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Enviando..." : "Enviar nova senha"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <LoadingOverlay visible={isSubmitting} />
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
  brandLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    resizeMode: "contain",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#E6E8EA",
    marginBottom: 8,
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 15,
    textAlign: "center",
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
});
