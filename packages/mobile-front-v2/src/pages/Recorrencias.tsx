import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { deleteRecurrence, listRecurrences, updateRecurrence } from "@/lib/medusa";

const formatFrequency = (value: string) => {
  if (value === "weekly") return "Semanal";
  if (value === "biweekly") return "Quinzenal";
  if (value === "monthly") return "Mensal";
  return value;
};

export default function Recorrencias() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["recurrences"], queryFn: listRecurrences });
  const recurrences = data?.recurrences || [];

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      await updateRecurrence(id, { status: currentStatus === "active" ? "paused" : "active" });
      toast.success(currentStatus === "active" ? "Recorrência pausada" : "Recorrência ativada");
      queryClient.invalidateQueries({ queryKey: ["recurrences"] });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível atualizar a recorrência");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurrence(id);
      toast.success("Recorrência removida");
      queryClient.invalidateQueries({ queryKey: ["recurrences"] });
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível remover a recorrência");
    }
  };

  return (
    <AuthenticatedLayout>
      <Header title="Recorrências" showCondoSelector showNotification={false} />

      <ScrollView style={styles.scrollContent}>
        {recurrences.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{formatFrequency(item.frequency)}</Text>
            <Text style={styles.cardStatus}>{item.status === "active" ? "Ativa" : "Pausada"}</Text>
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => handleToggle(item.id, item.status)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Alternar</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id)} style={styles.destructiveButton}>
                <Text style={styles.destructiveButtonText}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {recurrences.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma recorrência cadastrada.</Text>
          </View>
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
  cardStatus: {
    color: "#5DA2E6",
    fontSize: 11,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  secondaryButtonText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  destructiveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  destructiveButtonText: {
    color: "#EF4444",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
  },
});
