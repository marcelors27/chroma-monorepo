import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import ScreenBackground from "../components/ScreenBackground";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { createRecurrence, listOrders, MedusaOrder } from "../lib/medusa";
import { useCondos } from "../contexts/CondoContext";
import Button from "../components/Button";
import TextField from "../components/TextField";
import { showToast } from "../hooks/useToast";

const resolveStatusLabel = (order: MedusaOrder) => {
  if (order.status === "canceled" || order.fulfillment_status === "canceled") return "Cancelado";
  if (order.fulfillment_status === "shipped" || order.fulfillment_status === "partially_shipped") return "Enviado";
  if (order.fulfillment_status === "delivered") return "Entregue";
  return "Processando";
};

const OrdersScreen = () => {
  const { selectedCondo } = useCondos();
  const [selectedOrder, setSelectedOrder] = useState<MedusaOrder | null>(null);
  const [recurrenceName, setRecurrenceName] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("5");
  const [recurrencePayment, setRecurrencePayment] = useState<"credit" | "pix" | "boleto">("pix");
  const [recurrenceSaving, setRecurrenceSaving] = useState(false);
  const { data, isLoading, isError } = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const orders = data?.orders || [];

  const formatDate = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  const buildRecurrenceItemsFromOrder = (order: MedusaOrder) => {
    return (order.items || [])
      .filter((item) => item.variant_id)
      .map((item) => ({
        variant_id: item.variant_id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        title: item.title,
        price: (item.unit_price || 0) / 100,
        category: "Recorrente",
      }));
  };

  const handleCreateRecurrence = async () => {
    if (!selectedOrder) return;
    const items = buildRecurrenceItemsFromOrder(selectedOrder);
    if (!items.length) {
      showToast({ title: "Erro", description: "Pedido sem itens validos." });
      return;
    }
    setRecurrenceSaving(true);
    try {
      await createRecurrence({
        name: recurrenceName.trim() || `Recorrencia ${selectedOrder.display_id || ""}`.trim(),
        frequency: recurrenceFrequency,
        day_of_week: recurrenceFrequency === "monthly" ? undefined : Number(recurrenceDayOfWeek),
        day_of_month: recurrenceFrequency === "monthly" ? Number(recurrenceDayOfMonth) : undefined,
        payment_method: recurrencePayment,
        items,
        company_id: selectedCondo?.id || null,
      });
      showToast({ title: "Recorrencia criada", description: "Compra salva como recorrente." });
      setRecurrenceName("");
    } catch (err: any) {
      showToast({ title: "Erro", description: err?.message || "Nao foi possivel salvar." });
    } finally {
      setRecurrenceSaving(false);
    }
  };

  return (
    <ScreenBackground source={backgrounds.condos}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Meus pedidos</Text>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Carregando pedidos...</Text>
        </View>
      )}
        {!isLoading && isError && (
          <Text style={styles.muted}>Nao foi possivel carregar seus pedidos. Verifique se voce esta autenticado.</Text>
        )}

        {orders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.card} onPress={() => setSelectedOrder(order)}>
            <Text style={styles.cardTitle}>Pedido {order.display_id || order.id}</Text>
            <Text style={styles.muted}>Status: {resolveStatusLabel(order)}</Text>
            <Text style={styles.muted}>Data: {formatDate(order.created_at)}</Text>
            <Text style={styles.price}>R$ {((order.total || 0) / 100).toFixed(2)}</Text>
          </TouchableOpacity>
        ))}

        {orders.length === 0 && !isLoading && !isError && (
          <Text style={styles.muted}>Voce ainda nao realizou nenhum pedido.</Text>
        )}

        {selectedOrder && (
          <View style={styles.details}>
            <Text style={styles.sectionTitle}>Detalhes do pedido</Text>
            <Text style={styles.muted}>Pedido {selectedOrder.display_id || selectedOrder.id}</Text>
            <Text style={styles.muted}>Status: {resolveStatusLabel(selectedOrder)}</Text>
            <Text style={styles.muted}>Total: R$ {((selectedOrder.total || 0) / 100).toFixed(2)}</Text>
            <Text style={styles.sectionTitle}>Itens</Text>
            {selectedOrder.items?.map((item) => (
              <Text key={item.id} style={styles.muted}>
                {item.title} x{item.quantity}
              </Text>
            ))}
            <Text style={styles.sectionTitle}>Tornar recorrente</Text>
            <TextField label="Nome" value={recurrenceName} onChangeText={setRecurrenceName} placeholder="Ex: Reposicao mensal" />
            <Text style={styles.label}>Frequencia</Text>
            <View style={styles.row}>
              {(["weekly", "biweekly", "monthly"] as const).map((value) => (
                <Button
                  key={value}
                  title={value === "weekly" ? "Semanal" : value === "biweekly" ? "Quinzenal" : "Mensal"}
                  variant={recurrenceFrequency === value ? "primary" : "outline"}
                  onPress={() => setRecurrenceFrequency(value)}
                  style={styles.inlineButton}
                />
              ))}
            </View>
            {recurrenceFrequency === "monthly" ? (
              <TextField
                label="Dia do mes"
                value={recurrenceDayOfMonth}
                onChangeText={setRecurrenceDayOfMonth}
                keyboardType="numeric"
              />
            ) : (
              <TextField
                label="Dia da semana (0-6)"
                value={recurrenceDayOfWeek}
                onChangeText={setRecurrenceDayOfWeek}
                keyboardType="numeric"
              />
            )}
            <Text style={styles.label}>Pagamento</Text>
            <View style={styles.row}>
              {(["credit", "pix", "boleto"] as const).map((value) => (
                <Button
                  key={value}
                  title={value === "credit" ? "Cartao" : value === "pix" ? "PIX" : "Boleto"}
                  variant={recurrencePayment === value ? "primary" : "outline"}
                  onPress={() => setRecurrencePayment(value)}
                  style={styles.inlineButton}
                />
              ))}
            </View>
            <Button
              title={recurrenceSaving ? "Salvando..." : "Salvar recorrencia"}
              onPress={handleCreateRecurrence}
              disabled={recurrenceSaving}
            />
          </View>
        )}
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
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  details: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineButton: {
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  price: {
    fontWeight: "700",
    color: colors.primary,
    marginTop: 6,
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

export default OrdersScreen;
