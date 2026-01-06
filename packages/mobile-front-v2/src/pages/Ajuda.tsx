import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";

const helpOptions = [
  { id: "1", title: "Perguntas frequentes", description: "Respostas rápidas" },
  { id: "2", title: "Fale com suporte", description: "Atendimento especializado" },
  { id: "3", title: "Tutoriais", description: "Aprenda a usar o app" },
];

export default function Ajuda() {
  return (
    <AuthenticatedLayout>
      <Header title="Central de Ajuda" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {helpOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => toast.info("Funcionalidade em desenvolvimento")}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{option.title}</Text>
            <Text style={styles.cardSubtitle}>{option.description}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  cardSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
});
