import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { formatCNPJ, validateCNPJ } from "../lib/cnpj";
import { createCompany, listCompanies, updateCompany } from "../lib/medusa";
import { showToast } from "../hooks/useToast";

interface CondoForm {
  id?: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  observation: string;
}

const emptyForm: CondoForm = {
  name: "",
  cnpj: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  observation: "",
};

const CondosScreen = () => {
  const [condos, setCondos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<CondoForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadCondos = async () => {
    setIsLoading(true);
    try {
      const data = await listCompanies();
      setCondos(data?.companies || []);
    } catch (err: any) {
      showToast({ title: "Erro ao carregar", description: err?.message || "Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCondos();
  }, []);

  const handleEdit = (company: any) => {
    setFormData({
      id: company.id,
      name: company.fantasy_name || company.trade_name || "",
      cnpj: formatCNPJ(company.cnpj || ""),
      address: company.metadata?.address || "",
      city: company.metadata?.city || "",
      state: company.metadata?.state || "",
      phone: company.metadata?.phone || "",
      email: company.metadata?.email || "",
      observation: company.metadata?.observation || "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cnpj) {
      showToast({ title: "Campos obrigatorios", description: "Nome e CNPJ sao obrigatorios." });
      return;
    }

    if (!validateCNPJ(formData.cnpj)) {
      showToast({ title: "CNPJ invalido", description: "Informe um CNPJ valido." });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        cnpj: formData.cnpj.replace(/\D/g, ""),
        trade_name: formData.name,
        fantasy_name: formData.name,
        metadata: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          phone: formData.phone,
          email: formData.email,
          observation: formData.observation,
        },
      };

      if (formData.id) {
        await updateCompany(formData.id, payload);
        showToast({ title: "Condominio atualizado", description: "Dados salvos com sucesso." });
      } else {
        await createCompany(payload);
        showToast({ title: "Condominio criado", description: "Cadastro enviado para analise." });
      }

      setFormData(emptyForm);
      loadCondos();
    } catch (err: any) {
      showToast({ title: "Erro", description: err?.message || "Nao foi possivel salvar." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenBackground source={backgrounds.condos}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Condominios</Text>
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Carregando...</Text>
        </View>
      )}

        {condos.map((company) => (
          <View key={company.id} style={styles.card}>
            <Text style={styles.cardTitle}>{company.fantasy_name || company.trade_name || "Condominio"}</Text>
            <Text style={styles.muted}>CNPJ: {company.cnpj || "Nao informado"}</Text>
            <Text style={styles.muted}>Status: {company.approved ? "Aprovado" : "Em analise"}</Text>
            <Button title="Editar" variant="outline" onPress={() => handleEdit(company)} />
          </View>
        ))}

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>{formData.id ? "Editar condominio" : "Novo condominio"}</Text>
          <TextField label="Nome" value={formData.name} onChangeText={(value) => setFormData({ ...formData, name: value })} />
          <TextField
            label="CNPJ"
            value={formData.cnpj}
            onChangeText={(value) => setFormData({ ...formData, cnpj: formatCNPJ(value) })}
            keyboardType="numeric"
          />
          <TextField label="Endereco" value={formData.address} onChangeText={(value) => setFormData({ ...formData, address: value })} />
          <TextField label="Cidade" value={formData.city} onChangeText={(value) => setFormData({ ...formData, city: value })} />
          <TextField label="Estado" value={formData.state} onChangeText={(value) => setFormData({ ...formData, state: value })} />
          <TextField label="Telefone" value={formData.phone} onChangeText={(value) => setFormData({ ...formData, phone: value })} />
          <TextField label="Email" value={formData.email} onChangeText={(value) => setFormData({ ...formData, email: value })} />
          <TextField
            label="Observacoes"
            value={formData.observation}
            onChangeText={(value) => setFormData({ ...formData, observation: value })}
            multiline
          />
          <Button title={formData.id ? "Salvar" : "Cadastrar"} onPress={handleSubmit} disabled={isSaving} />
        </View>
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
    marginBottom: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  form: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  muted: {
    color: colors.muted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
});

export default CondosScreen;
