import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ShieldAlert, ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import condoBackground from "@/assets/condo-background.jpg";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";

export default function AccessPending() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { terms } = useBusinessTerms();

  const handleBackToLogin = () => {
    logout();
  };

  return (
    <ImageBackground source={condoBackground} resizeMode="cover" style={styles.screen}>
      <View style={styles.overlay} />
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <ShieldAlert color="#5DA2E6" size={26} />
        </View>
        <Text style={styles.title}>Seu acesso está em avaliação</Text>
        <Text style={styles.subtitle}>
          {`O ${terms.labelLower} foi enviado para análise. Em breve você receberá a confirmação para acessar o catálogo.`}
        </Text>
        <Pressable style={styles.backButton} onPress={handleBackToLogin}>
          <ArrowLeft color="#0B0F14" size={18} />
          <Text style={styles.backButtonText}>Voltar para o login</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0B0F14",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 15, 20, 0.82)",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(70, 78, 90, 0.6)",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(93, 162, 230, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#B4BCC8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#5DA2E6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  backButtonText: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "700",
  },
});
