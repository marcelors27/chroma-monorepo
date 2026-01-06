import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";

export default function Notificacoes() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  return (
    <AuthenticatedLayout>
      <Header title="Notificações" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Notificações push</Text>
              <Text style={styles.cardSubtitle}>Alertas sobre pedidos</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(value) => {
                setPushEnabled(value);
                toast.success(value ? "Notificações push ativadas" : "Notificações push desativadas");
              }}
            />
          </View>
        </View>

        <View style={[styles.card, styles.cardSpacing]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>E-mail</Text>
              <Text style={styles.cardSubtitle}>Resumo semanal</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={(value) => {
                setEmailEnabled(value);
                toast.success("Preferência atualizada");
              }}
            />
          </View>
        </View>
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
  },
  cardSpacing: {
    marginTop: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
