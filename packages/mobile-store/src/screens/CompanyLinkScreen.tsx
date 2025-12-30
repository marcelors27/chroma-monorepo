import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useToast } from "../hooks/useToast";
import { formatCNPJ, validateCNPJ } from "../lib/cnpj";
import type { RootStackParamList } from "../navigation/types";

interface CompanyForm {
  id: string;
  cnpj: string;
  companyName: string;
  documentName: string;
}

const CompanyLinkScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyForm[]>([
    { id: String(Date.now()), cnpj: "", companyName: "", documentName: "" },
  ]);

  const updateCompany = (id: string, updates: Partial<CompanyForm>) => {
    setCompanies((current) => current.map((company) => (company.id === id ? { ...company, ...updates } : company)));
  };

  const handlePickDocument = async (id: string) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.assets?.[0]) {
      updateCompany(id, { documentName: result.assets[0].name || "Documento selecionado" });
    }
  };

  const addCompany = () => {
    if (companies.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Voce pode vincular no maximo 10 empresas por vez.",
      });
      return;
    }
    setCompanies((current) => [
      ...current,
      { id: String(Date.now() + current.length), cnpj: "", companyName: "", documentName: "" },
    ]);
  };

  const removeCompany = (id: string) => {
    if (companies.length === 1) {
      toast({
        title: "Atencao",
        description: "Voce precisa vincular pelo menos uma empresa.",
      });
      return;
    }
    setCompanies((current) => current.filter((company) => company.id !== id));
  };

  const handleSubmit = async () => {
    for (const company of companies) {
      if (!company.cnpj || !company.companyName) {
        toast({
          title: "Erro",
          description: "Preencha o CNPJ e nome de todas as empresas.",
        });
        return;
      }

      if (!validateCNPJ(company.cnpj)) {
        toast({
          title: "CNPJ invalido",
          description: `O CNPJ ${company.cnpj} e invalido.`,
        });
        return;
      }

      if (!company.documentName) {
        toast({
          title: "Documento obrigatorio",
          description: `Anexe o documento comprovando vinculo com ${company.companyName}.`,
        });
        return;
      }
    }

    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: "Empresas vinculadas!",
        description: `${companies.length} empresa(s) vinculada(s) com sucesso.`,
      });
      setIsLoading(false);
      navigation.replace("Onboarding");
    }, 800);
  };

  return (
    <ScreenBackground source={backgrounds.auth}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Vincule suas empresas</Text>
        <Text style={styles.subtitle}>
          Vincule pelo menos uma empresa informando o CNPJ e anexando um documento.
        </Text>

        {companies.map((company, index) => (
          <View key={company.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Empresa {index + 1}</Text>
              {companies.length > 1 && (
                <Button title="Remover" variant="ghost" onPress={() => removeCompany(company.id)} />
              )}
            </View>

            <TextField
              label="Nome da empresa"
              value={company.companyName}
              onChangeText={(value) => updateCompany(company.id, { companyName: value })}
              placeholder="Razao social"
            />

            <TextField
              label="CNPJ"
              value={company.cnpj}
              onChangeText={(value) => updateCompany(company.id, { cnpj: formatCNPJ(value) })}
              placeholder="00.000.000/0000-00"
              keyboardType="numeric"
            />

            <Button
              title={company.documentName ? `Documento: ${company.documentName}` : "Anexar documento"}
              variant="outline"
              onPress={() => handlePickDocument(company.id)}
            />
          </View>
        ))}

        <View style={styles.actions}>
          <Button title="Adicionar empresa" variant="outline" onPress={addCompany} />
          <Button title="Enviar" onPress={handleSubmit} disabled={isLoading} />
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  actions: {
    gap: 12,
  },
});

export default CompanyLinkScreen;
