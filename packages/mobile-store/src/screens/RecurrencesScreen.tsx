import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../components/ScreenBackground";
import Button from "../components/Button";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { showToast } from "../hooks/useToast";
import {
  deleteRecurrence,
  listRecurrences,
  updateRecurrence,
  Recurrence,
} from "../lib/medusa";

const RecurrencesScreen = () => {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listRecurrences();
        setRecurrences(data.recurrences || []);
      } catch {
        setRecurrences([]);
      }
    };
    load();
  }, []);


  const handleToggleStatus = async (recurrence: Recurrence) => {
    const nextStatus = recurrence.status === "active" ? "paused" : "active";
    try {
      await updateRecurrence(recurrence.id, { status: nextStatus });
      const data = await listRecurrences();
      setRecurrences(data.recurrences || []);
    } catch (err: any) {
      showToast({ title: "Erro", description: err?.message || "Nao foi possivel atualizar." });
    }
  };

  const handleDelete = async (recurrence: Recurrence) => {
    try {
      await deleteRecurrence(recurrence.id);
      const data = await listRecurrences();
      setRecurrences(data.recurrences || []);
    } catch (err: any) {
      showToast({ title: "Erro", description: err?.message || "Nao foi possivel remover." });
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  return (
    <ScreenBackground source={backgrounds.condos}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Compras Recorrentes</Text>
        <Text style={styles.subtitle}>Agende compras semanais, quinzenais ou mensais.</Text>

        <Text style={styles.sectionTitle}>Minhas recorrencias</Text>
        <View style={styles.card}>
          <Text style={styles.muted}>
            Para criar uma recorrencia, selecione os produtos na tela de compras e marque no checkout.
          </Text>
        </View>
        {recurrences.length === 0 && <Text style={styles.muted}>Nenhuma recorrencia criada.</Text>}
        {recurrences.map((recurrence) => (
          <View key={recurrence.id} style={styles.card}>
            <Text style={styles.productTitle}>{recurrence.name}</Text>
            <Text style={styles.muted}>Proxima execucao: {formatDate(recurrence.next_run_at)}</Text>
            <View style={styles.row}>
              <Button
                title={recurrence.status === "active" ? "Pausar" : "Retomar"}
                variant="outline"
                onPress={() => handleToggleStatus(recurrence)}
                style={styles.inlineButton}
              />
              <Button
                title="Remover"
                variant="outline"
                onPress={() => handleDelete(recurrence)}
                style={styles.inlineButton}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineButton: {
    marginVertical: 4,
  },
  productTitle: {
    color: colors.text,
    fontWeight: "600",
  },
  muted: {
    color: colors.muted,
  },
});

export default RecurrencesScreen;
