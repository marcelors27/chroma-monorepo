import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Image } from "react-native";
import { Minus, Plus, Trash2, QrCode, CreditCard, Receipt, RefreshCw, ChevronRight } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { useCart } from "@/contexts/CartContext";
import { useCondo } from "@/contexts/CondoContext";
import {
  createRecurrence,
  fetchSavedPaymentMethodsFromBackend,
  formatMoney,
  getCustomerMe,
  SavedPaymentMethod,
  upsertSavedPaymentMethod,
} from "@/lib/medusa";

type RecurrenceOption = "unica" | "semanal" | "quinzenal" | "mensal";

export default function Carrinho() {
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | "boleto">("pix");
  const [recurrenceByItem, setRecurrenceByItem] = useState<Record<string, RecurrenceOption>>({});
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const { items, totalPrice, updateQuantity, removeItem, completeBackendCheckout, clearCart } = useCart();
  const { activeCondo } = useCondo();

  const formattedTotal = formatMoney(totalPrice);
  const boletoEmails = activeCondo?.billingEmails?.length
    ? activeCondo.billingEmails
    : customerEmail
      ? [customerEmail]
      : [];
  const boletoEmailText = boletoEmails.length ? boletoEmails.join(", ") : "E-mail não informado";

  useEffect(() => {
    const loadPaymentData = async () => {
      const methods = await fetchSavedPaymentMethodsFromBackend();
      setSavedPaymentMethods(methods);
      try {
        const customer = await getCustomerMe();
        setCustomerEmail(customer?.customer?.email || "");
      } catch {
        setCustomerEmail("");
      }
    };
    loadPaymentData();
  }, []);

  useEffect(() => {
    setRecurrenceByItem((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = "unica";
        }
      });
      Object.keys(next).forEach((id) => {
        if (!items.some((item) => item.id === id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!savedPaymentMethods.length) return;
    const defaultMethod =
      savedPaymentMethods.find((method) => method.is_default) || savedPaymentMethods[0];
    if (!defaultMethod) return;
    const mapped = defaultMethod.type === "credit" ? "cartao" : defaultMethod.type;
    setSelectedPayment(mapped);
  }, [savedPaymentMethods]);

  const handleCheckout = async () => {
    if (!items.length) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    if (!activeCondo) {
      toast.error("Selecione um condomínio antes de finalizar.");
      return;
    }

    const paymentMethod = selectedPayment === "cartao" ? "credit" : selectedPayment;

    try {
      const shippingAddress = {
        first_name: "Condomínio",
        last_name: "Compras",
        address_1: activeCondo.name || "Condomínio",
        city: "São Paulo",
        country_code: "br",
        postal_code: "00000-000",
        metadata: {
          condo_id: activeCondo.id,
          company_id: activeCondo.id,
        },
      };

      const orderId = await completeBackendCheckout(shippingAddress, paymentMethod);

      const recurringItems = items.filter((item) => recurrenceByItem[item.id] && recurrenceByItem[item.id] !== "unica");
      for (const item of recurringItems) {
        const selectedRecurrence = recurrenceByItem[item.id];
        const frequency =
          selectedRecurrence === "semanal"
            ? "weekly"
            : selectedRecurrence === "quinzenal"
              ? "biweekly"
              : "monthly";
        await createRecurrence({
          name: `Recorrência ${item.name}`,
          frequency,
          payment_method: paymentMethod,
          items: [
            {
              variant_id: item.variantId,
              product_id: item.productId,
              quantity: item.quantity,
              title: item.name,
              price: item.price,
              category: item.category,
            },
          ],
          company_id: activeCondo.id,
        });
      }

      try {
        const label =
          paymentMethod === "credit"
            ? "Cartão"
            : paymentMethod === "pix"
              ? "PIX"
              : boletoEmails.length
                ? `Boleto (${boletoEmails.join(", ")})`
                : "Boleto";
        await upsertSavedPaymentMethod({
          type: paymentMethod,
          label,
          details: paymentMethod === "boleto" && boletoEmails.length ? { email: boletoEmails.join(", ") } : undefined,
          setDefault: true,
        });
      } catch {
        // Ignore failures to persist payment method
      }

      await clearCart();
      toast.success(`Pedido realizado com sucesso! ${orderId ? `#${orderId}` : ""}`.trim());
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível finalizar o pedido.");
    }
  };

  return (
    <AuthenticatedLayout>
      <Header title="Carrinho" subtitle={`${items.length} itens`} showNotification={false} showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
                <View style={styles.quantityRow}>
                  <Pressable style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Minus color="#C7CBD1" size={16} />
                  </Pressable>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <Pressable style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Plus color="#E6E8EA" size={16} />
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => removeItem(item.id)} style={styles.removeButton}>
                <Trash2 color="#E64646" size={20} />
              </Pressable>
            </View>
          </View>
        ))}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Seu carrinho está vazio.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Forma de pagamento</Text>
        {savedPaymentMethods.length > 0 && (
          <View style={styles.savedPayments}>
            <Text style={styles.savedPaymentsTitle}>Métodos salvos</Text>
            {savedPaymentMethods.map((method) => {
              const mapped = method.type === "credit" ? "cartao" : method.type;
              const active = selectedPayment === mapped;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setSelectedPayment(mapped)}
                  style={[styles.savedPaymentCard, active ? styles.savedPaymentCardActive : styles.savedPaymentCardIdle]}
                >
                  <Text style={styles.savedPaymentLabel}>{method.label}</Text>
                  {method.is_default && <Text style={styles.savedPaymentDefault}>Padrão</Text>}
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={styles.sectionList}>
          {[
            { id: "pix", title: "Pix", subtitle: "Pagamento instantâneo", icon: QrCode },
            { id: "cartao", title: "Cartão", subtitle: "Crédito ou débito", icon: CreditCard },
            { id: "boleto", title: "Boleto", subtitle: "Vencimento em 3 dias", icon: Receipt },
          ].map((option) => {
            const Icon = option.icon;
            const active = selectedPayment === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedPayment(option.id as "pix" | "cartao" | "boleto")}
                style={styles.paymentCard}
              >
                <View style={styles.paymentIcon}>
                  <Icon color="#8C98A8" size={20} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{option.title}</Text>
                  <Text style={styles.paymentSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.radioOuter, active ? styles.radioOuterActive : styles.radioOuterIdle]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {selectedPayment === "boleto" && (
          <View style={styles.boletoInfo}>
            <Text style={styles.boletoInfoText}>Boleto será enviado para:</Text>
            <Text style={styles.boletoInfoValue}>{boletoEmailText}</Text>
          </View>
        )}

        <View style={styles.recurrenceHeader}>
          <RefreshCw color="#8C98A8" size={18} />
          <Text style={styles.sectionTitleText}>Recorrência</Text>
        </View>
        <View style={styles.recurrenceList}>
          {items.map((item) => (
            <View key={item.id} style={styles.recurrenceItem}>
              <Text style={styles.recurrenceItemTitle}>{item.name}</Text>
              <View style={styles.recurrenceChips}>
                {[
                  { id: "unica", title: "Única" },
                  { id: "semanal", title: "Semanal" },
                  { id: "quinzenal", title: "Quinzenal" },
                  { id: "mensal", title: "Mensal" },
                ].map((option) => {
                  const active = recurrenceByItem[item.id] === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setRecurrenceByItem((current) => ({
                          ...current,
                          [item.id]: option.id as RecurrenceOption,
                        }))
                      }
                      style={[
                        styles.recurrenceChip,
                        active ? styles.recurrenceChipActive : styles.recurrenceChipIdle,
                      ]}
                    >
                      <Text style={[styles.recurrenceChipText, active && styles.recurrenceChipTextActive]}>
                        {option.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formattedTotal}</Text>
          </View>
          <View style={styles.summaryDivider}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.summaryLabel}>Grátis</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formattedTotal}</Text>
          </View>
          <Pressable onPress={handleCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Finalizar Compra</Text>
            <ChevronRight color="#E6E8EA" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  itemCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  itemPrice: {
    color: "#8C98A8",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  savedPayments: {
    marginTop: 12,
    gap: 8,
  },
  savedPaymentsTitle: {
    color: "#8C98A8",
    fontSize: 12,
    fontWeight: "600",
  },
  savedPaymentCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(24, 28, 36, 0.95)",
  },
  savedPaymentCardActive: {
    borderColor: "rgba(93, 162, 230, 0.6)",
  },
  savedPaymentCardIdle: {
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  savedPaymentLabel: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  savedPaymentDefault: {
    color: "#5DA2E6",
    fontSize: 11,
    fontWeight: "600",
  },
  sectionList: {
    marginTop: 16,
    gap: 12,
  },
  paymentCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  paymentSubtitle: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 4,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#5DA2E6",
  },
  radioOuterIdle: {
    borderColor: "rgba(124, 135, 150, 0.6)",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
  },
  boletoInfo: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(93, 162, 230, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.4)",
  },
  boletoInfoText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  boletoInfoValue: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  recurrenceHeader: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleText: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  recurrenceList: {
    marginTop: 12,
    gap: 12,
  },
  recurrenceItem: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
    padding: 14,
  },
  recurrenceItemTitle: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
  },
  recurrenceChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  recurrenceChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  recurrenceChipActive: {
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    borderColor: "rgba(93, 162, 230, 0.5)",
  },
  recurrenceChipIdle: {
    backgroundColor: "rgba(34, 38, 46, 0.8)",
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  recurrenceChipText: {
    color: "#8C98A8",
    fontSize: 12,
    fontWeight: "600",
  },
  recurrenceChipTextActive: {
    color: "#E6E8EA",
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#8C98A8",
    fontSize: 13,
  },
  summaryValue: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryDivider: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.5)",
    paddingTop: 8,
    marginTop: 8,
  },
  summaryTotalRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
  summaryTotalValue: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
  },
  checkoutButton: {
    marginTop: 16,
    backgroundColor: "#5DA2E6",
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutButtonText: {
    color: "#E6E8EA",
    fontSize: 15,
    fontWeight: "600",
  },
});
