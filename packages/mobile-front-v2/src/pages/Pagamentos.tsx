import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import {
  fetchSavedPaymentMethodsFromBackend,
  removeSavedPaymentMethod,
  setDefaultSavedPaymentMethod,
} from "@/lib/medusa";

export default function Pagamentos() {
  const ENABLE_PIX = process.env.EXPO_PUBLIC_ENABLE_PIX === "true";
  const { data, refetch } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: fetchSavedPaymentMethodsFromBackend,
  });
  const payments = (data || []).filter((payment) => ENABLE_PIX || payment.type !== "pix");
  const formatType = (value: string) => {
    if (value === "credit") return "Cartão";
    if (value === "pix") return "PIX";
    if (value === "boleto") return "Boleto";
    return value;
  };
  const formatBoletoDays = (days?: number) => {
    if (!days) return null;
    return `${days} ${days === 1 ? "dia" : "dias"}`;
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultSavedPaymentMethod(id);
      toast.success("Forma de pagamento padrão atualizada");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível atualizar a forma de pagamento.");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeSavedPaymentMethod(id);
      toast.success("Forma de pagamento removida");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível remover a forma de pagamento.");
    }
  };

  return (
    <AuthenticatedLayout>
      <Header title="Pagamentos" showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {payments.map((payment) => (
          <View key={payment.id} style={styles.card}>
            <Text style={styles.cardTitle}>{payment.label}</Text>
            <Text style={styles.cardSubtitle}>{formatType(payment.type)}</Text>
            {payment.type === "boleto" && payment.details?.boleto_expires_after_days ? (
              <Text style={styles.cardSubtitle}>
                Vencimento: {formatBoletoDays(payment.details.boleto_expires_after_days)}
              </Text>
            ) : null}
            <View style={styles.actionsRow}>
              {!payment.is_default && (
                <Pressable onPress={() => handleSetDefault(payment.id)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Tornar padrão</Text>
                </Pressable>
              )}
              <Pressable onPress={() => handleRemove(payment.id)} style={styles.destructiveButton}>
                <Text style={styles.destructiveButtonText}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {payments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma forma de pagamento salva.</Text>
          </View>
        )}
        <Pressable onPress={() => toast.info("Funcionalidade em desenvolvimento")} style={styles.addButton}>
          <Text style={styles.addButtonText}>Adicionar pagamento</Text>
        </Pressable>
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
  cardSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
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
  addButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#5DA2E6",
  },
  addButtonText: {
    color: "#0B0F14",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
  },
});
