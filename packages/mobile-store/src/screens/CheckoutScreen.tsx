import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import ScreenBackground from "../components/ScreenBackground";
import TextField from "../components/TextField";
import { backgrounds } from "../theme/backgrounds";
import { colors } from "../theme/colors";
import { useCart } from "../contexts/CartContext";
import { useCondos } from "../contexts/CondoContext";
import { showToast } from "../hooks/useToast";
import { createRecurrence } from "../lib/medusa";

type PaymentMethod = "credit" | "pix" | "boleto";

const CheckoutScreen = () => {
  const { items, totalPrice, clearCart, completeBackendCheckout } = useCart();
  const { selectedCondo } = useCondos();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [observation, setObservation] = useState("");
  const [saveAsRecurring, setSaveAsRecurring] = useState(false);
  const [recurrenceName, setRecurrenceName] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("5");

  const buildRecurrenceItems = () => {
    return items.map((item) => ({
      variant_id: item.variantId,
      product_id: item.productId,
      quantity: item.quantity,
      title: item.name,
      price: item.price,
      category: item.category,
    }));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      showToast({ title: "Carrinho vazio", description: "Adicione itens ao carrinho antes de finalizar." });
      return;
    }

    if (!paymentMethod) {
      showToast({ title: "Forma de pagamento", description: "Selecione uma forma de pagamento." });
      return;
    }

    setIsProcessing(true);
    try {
      const shippingAddress = {
        first_name: "Condominio",
        last_name: "Compras",
        address_1: selectedCondo?.name || "Condominio",
        city: "Sao Paulo",
        country_code: "br",
        postal_code: "00000-000",
        metadata: { observation },
      };

      const backendOrderId = await completeBackendCheckout(shippingAddress, paymentMethod);
      if (saveAsRecurring) {
        try {
          await createRecurrence({
            name: recurrenceName.trim() || `Recorrencia ${selectedCondo?.name || ""}`.trim(),
            frequency: recurrenceFrequency,
            day_of_week: recurrenceFrequency === "monthly" ? undefined : Number(recurrenceDayOfWeek),
            day_of_month: recurrenceFrequency === "monthly" ? Number(recurrenceDayOfMonth) : undefined,
            payment_method: paymentMethod,
            items: buildRecurrenceItems(),
            company_id: selectedCondo?.id || null,
          });
          showToast({ title: "Recorrencia criada", description: "Compra salva como recorrente." });
        } catch (err: any) {
          showToast({ title: "Erro", description: err?.message || "Nao foi possivel criar recorrencia." });
        }
      }
      setOrderId(backendOrderId || "");
      setOrderComplete(true);
      await clearCart();
    } catch (err: any) {
      showToast({ title: "Nao foi possivel concluir", description: err?.message || "Tente novamente." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <ScreenBackground source={backgrounds.condos}>
        <View style={styles.container}>
          <Text style={styles.title}>Pedido confirmado!</Text>
          <Text style={styles.subtitle}>Pedido {orderId}</Text>
          <Text style={styles.muted}>Forma de pagamento: {paymentMethod.toUpperCase()}</Text>
          <Button title="Fazer novo pedido" onPress={() => setOrderComplete(false)} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground source={backgrounds.condos}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Finalize seu pedido</Text>

        <Text style={styles.sectionTitle}>Entrega</Text>
        <View style={styles.card}>
          <Text style={styles.muted}>Condominio: {selectedCondo?.name || "Nao selecionado"}</Text>
          <TextField label="Observacao" value={observation} onChangeText={setObservation} placeholder="Opcional" />
        </View>

        <Text style={styles.sectionTitle}>Pagamento</Text>
        <View style={styles.row}>
          <Button
            title="Cartao"
            variant={paymentMethod === "credit" ? "primary" : "outline"}
            onPress={() => setPaymentMethod("credit")}
          />
          <Button
            title="Pix"
            variant={paymentMethod === "pix" ? "primary" : "outline"}
            onPress={() => setPaymentMethod("pix")}
          />
          <Button
            title="Boleto"
            variant={paymentMethod === "boleto" ? "primary" : "outline"}
            onPress={() => setPaymentMethod("boleto")}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Compra recorrente</Text>
          <View style={styles.row}>
            <Button
              title={saveAsRecurring ? "Recorrente: sim" : "Tornar recorrente"}
              variant={saveAsRecurring ? "primary" : "outline"}
              onPress={() => setSaveAsRecurring((current) => !current)}
            />
          </View>
          {saveAsRecurring && (
            <View style={{ gap: 8 }}>
              <TextField label="Nome" value={recurrenceName} onChangeText={setRecurrenceName} placeholder="Ex: Reposicao mensal" />
              <Text style={styles.label}>Frequencia</Text>
              <View style={styles.row}>
                {(["weekly", "biweekly", "monthly"] as const).map((value) => (
                  <Button
                    key={value}
                    title={value === "weekly" ? "Semanal" : value === "biweekly" ? "Quinzenal" : "Mensal"}
                    variant={recurrenceFrequency === value ? "primary" : "outline"}
                    onPress={() => setRecurrenceFrequency(value)}
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
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          {items.map((item) => (
            <Text key={item.id} style={styles.muted}>
              {item.name} x{item.quantity}
            </Text>
          ))}
          <Text style={styles.total}>Total: R$ {totalPrice.toFixed(2)}</Text>
        </View>

        <Button title="Finalizar pedido" onPress={handleSubmit} disabled={isProcessing} />
      </ScrollView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  total: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  muted: {
    color: colors.muted,
  },
});

export default CheckoutScreen;
