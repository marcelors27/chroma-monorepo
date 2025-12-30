import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

const AccessPendingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenBackground source={backgrounds.auth}>
      <View style={styles.container}>
        <Text style={styles.title}>Seu acesso esta em avaliacao</Text>
        <Text style={styles.subtitle}>
          Voce precisa ter pelo menos um CNPJ aprovado para acessar o catalogo.
        </Text>
        <View style={styles.actions}>
          <Button title="Cadastrar empresa" onPress={() => navigation.navigate("CompanyLink")} />
          <Button title="Voltar ao login" variant="outline" onPress={() => navigation.navigate("Auth")} />
        </View>
      </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20,
  },
  actions: {
    gap: 12,
  },
});

export default AccessPendingScreen;
