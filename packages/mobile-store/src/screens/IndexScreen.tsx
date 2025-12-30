import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

const IndexScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenBackground source={backgrounds.hero}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.logo}>Chroma</Text>
          <Text style={styles.title}>E-commerce exclusivo para condominios</Text>
          <Text style={styles.subtitle}>
            Plataforma de compras centralizada para seu condominio. Gerencie multiplos CNPJs e tenha acesso a ofertas
            exclusivas.
          </Text>
          <View style={styles.buttonGroup}>
            <Button title="Entrar" variant="outline" onPress={() => navigation.navigate("Auth", { mode: "login" })} />
            <Button title="Cadastrar" onPress={() => navigation.navigate("Auth", { mode: "register" })} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por que escolher o Chroma?</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Acesso controlado</Text>
            <Text style={styles.cardText}>
              Somente usuarios autenticados podem acessar a plataforma.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Multi-CNPJ</Text>
            <Text style={styles.cardText}>Cadastre e gerencie multiplos condominios em uma unica conta.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Compras centralizadas</Text>
            <Text style={styles.cardText}>Catalogo exclusivo com precos especiais para condominios.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  hero: {
    paddingVertical: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: colors.muted,
  },
});

export default IndexScreen;
