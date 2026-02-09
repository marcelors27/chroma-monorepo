import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Minus,
  Plus,
  Trash2,
  QrCode,
  CreditCard,
  Receipt,
  ChevronRight,
  Truck,
} from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { toast } from "@/lib/toast";
import { useCart } from "@/contexts/CartContext";
import { useCondo } from "@/contexts/CondoContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  createRecurrence,
  fetchSavedPaymentMethodsFromBackend,
  formatMoney,
  getCustomerMe,
  listShippingOptions,
  SavedPaymentMethod,
  setCartShippingAddress,
  upsertSavedPaymentMethod,
} from "@/lib/medusa";

type RecurrenceOption = "unica" | "semanal" | "quinzenal" | "mensal";

export default function Carrinho() {
  const ENABLE_PIX = process.env.EXPO_PUBLIC_ENABLE_PIX === "true";
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | "boleto">(
    ENABLE_PIX ? "pix" : "boleto"
  );
  const [boletoExpiresAfterDays, setBoletoExpiresAfterDays] = useState(3);
  const [pixExpiresAfterDays, setPixExpiresAfterDays] = useState(15);
  const navigation = useNavigation();
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [recurrenceByItem, setRecurrenceByItem] = useState<Record<string, RecurrenceOption>>({});
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    items,
    totalPrice,
    updateQuantity,
    removeItem,
    completeBackendCheckout,
    clearCart,
    cartId,
  } = useCart();
  const { activeCondo } = useCondo();
  const availableSavedMethods = savedPaymentMethods.filter(
    (method) => ENABLE_PIX || method.type !== "pix"
  );
  const paymentOptions = [
    ...(ENABLE_PIX
      ? [
          {
            id: "pix" as const,
            title: "Pix",
            subtitle: `Vencimento em ${pixExpiresAfterDays} dias`,
            icon: QrCode,
          },
        ]
      : []),
    { id: "cartao" as const, title: "Cartão", subtitle: "Crédito ou débito", icon: CreditCard },
    {
      id: "boleto" as const,
      title: "Boleto",
      subtitle: `Vencimento em ${boletoExpiresAfterDays} dias`,
      icon: Receipt,
    },
  ];

  const formattedTotal = formatMoney(totalPrice);
  const boletoEmails = activeCondo?.billingEmails?.length
    ? activeCondo.billingEmails
    : customerEmail
      ? [customerEmail]
      : [];
  const boletoEmailText = boletoEmails.length ? boletoEmails.join(", ") : "E-mail não informado";
  const resolveShippingLabel = (name?: string | null) => {
    const value = (name || "").toLowerCase();
    if (/(retira|buscar|pickup)/i.test(value)) return "Buscar na loja";
    if (/(1\\s?dia|express|rápida|rapida)/i.test(value)) return "Receber em um dia";
    return name || "Entrega";
  };

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
    const availableMethods = savedPaymentMethods.filter(
      (method) => ENABLE_PIX || method.type !== "pix"
    );
    const defaultMethod =
      availableMethods.find((method) => method.is_default) || availableMethods[0];
    if (!defaultMethod) return;
    const mapped = defaultMethod.type === "credit" ? "cartao" : defaultMethod.type;
    setSelectedPayment(mapped);
    if (defaultMethod.type === "boleto") {
      const days = defaultMethod.details?.boleto_expires_after_days;
      if (typeof days === "number") {
        setBoletoExpiresAfterDays(days);
      }
    }
  }, [savedPaymentMethods]);

  useEffect(() => {
    if (!ENABLE_PIX && selectedPayment === "pix") {
      setSelectedPayment("boleto");
    }
  }, [selectedPayment]);

  useEffect(() => {
    if (selectedPayment !== "boleto") return;
    if (!boletoExpiresAfterDays) {
      setBoletoExpiresAfterDays(3);
    }
  }, [selectedPayment, boletoExpiresAfterDays]);

  useEffect(() => {
    if (selectedPayment !== "pix") return;
    if (!pixExpiresAfterDays) {
      setPixExpiresAfterDays(15);
    }
  }, [selectedPayment, pixExpiresAfterDays]);


  useEffect(() => {
    const loadShippingOptions = async () => {
      if (!cartId || !activeCondo) return;
      setShippingLoading(true);
      setShippingError(null);
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
        await setCartShippingAddress(cartId, shippingAddress);
        const options = await listShippingOptions(cartId);
        setShippingOptions(options);
        setShippingOptionId((current) => current || options?.[0]?.id || null);
      } catch (err: any) {
        setShippingOptions([]);
        setShippingOptionId(null);
        setShippingError(err?.message || "Não foi possível carregar as opções de entrega.");
      } finally {
        setShippingLoading(false);
      }
    };
    loadShippingOptions();
  }, [cartId, activeCondo?.id]);

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
    if (!shippingOptionId) {
      toast.error("Selecione a forma de entrega.");
      return;
    }

    setIsProcessing(true);
    try {
      const shippingAddress = {
        first_name: "Condomínio",
        last_name: "Compras",
        address_1: activeCondo.address || activeCondo.name || "Condomínio",
        address_2: activeCondo.complemento || "",
        city: activeCondo.city || "São Paulo",
        province: activeCondo.state || "SP",
        country_code: "br",
        postal_code: activeCondo.zip || "00000-000",
        metadata: {
          condo_id: activeCondo.id,
          company_id: activeCondo.id,
          cnpj: activeCondo.cnpj || "",
          boleto_expires_after_days:
            paymentMethod === "boleto" ? boletoExpiresAfterDays : undefined,
          pix_expires_after_days:
            paymentMethod === "pix" ? pixExpiresAfterDays : undefined,
        },
      };

      const checkoutResult = await completeBackendCheckout(
        shippingAddress,
        paymentMethod,
        shippingOptionId,
        paymentMethod === "boleto"
          ? { boletoExpiresAfterDays }
          : paymentMethod === "pix"
            ? { pixExpiresAfterDays }
            : undefined
      );

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
          details:
            paymentMethod === "boleto"
              ? {
                  email: boletoEmails.length ? boletoEmails.join(", ") : undefined,
                  boleto_expires_after_days: boletoExpiresAfterDays,
                }
              : undefined,
          setDefault: true,
        });
      } catch {
        // Ignore failures to persist payment method
      }

      if (checkoutResult.status === "completed") {
        await clearCart();
        toast.success(`Pedido realizado com sucesso! ${checkoutResult.orderId ? `#${checkoutResult.orderId}` : ""}`.trim());
      } else {
        toast.info("Pagamento pendente. Consulte seus pedidos para acompanhar.");
        navigation.navigate("Pedidos" as never);
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível finalizar o pedido.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Header title="Carrinho" subtitle={`${items.length} itens`} showNotification={false} showCondoSelector />

      {isProcessing && (selectedPayment === "boleto" || selectedPayment === "pix") && (
        <View style={styles.processingOverlay} pointerEvents="auto">
          <View style={styles.processingCard}>
            <LoadingSpinner size={64} />
            <Text style={styles.processingTitle}>
              {selectedPayment === "pix" ? "Gerando PIX..." : "Gerando boleto..."}
            </Text>
            <Text style={styles.processingSubtitle}>Isso pode levar alguns segundos.</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContent} scrollEnabled={!isProcessing}>
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
                <View style={styles.recurrenceInline}>
                  <Text style={styles.recurrenceInlineLabel}>Recorrência</Text>
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

        <Text style={styles.sectionTitle}>Método de entrega</Text>
        {shippingError && <Text style={styles.errorText}>{shippingError}</Text>}
        {shippingLoading ? (
          <View style={styles.loadingRow}>
            <LoadingSpinner size={24} />
            <Text style={styles.helperText}>Carregando opções...</Text>
          </View>
        ) : shippingOptions.length === 0 ? (
          <Text style={styles.helperText}>
            Sem opções disponíveis. Cadastre no admin em Configurações → Logística → Opções de envio.
          </Text>
        ) : (
          <View style={styles.sectionList}>
            {shippingOptions.map((option) => {
              const active = shippingOptionId === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setShippingOptionId(option.id)}
                  style={styles.paymentCard}
                >
                  <View style={styles.paymentIcon}>
                    <Truck color="#8C98A8" size={20} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>{resolveShippingLabel(option.name)}</Text>
                    {option.name && (
                      <Text style={styles.paymentSubtitle}>{option.name}</Text>
                    )}
                  </View>
                  <View style={[styles.radioOuter, active ? styles.radioOuterActive : styles.radioOuterIdle]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Forma de pagamento</Text>
        {availableSavedMethods.length > 0 && (
          <View style={styles.savedPayments}>
            <Text style={styles.savedPaymentsTitle}>Métodos salvos</Text>
            {availableSavedMethods.map((method) => {
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
          {paymentOptions.map((option) => {
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
            <Text style={[styles.boletoInfoText, { marginTop: 12 }]}>Prazo de vencimento</Text>
            <View style={styles.boletoDaysRow}>
              {[1, 3, 15, 30].map((days) => {
                const active = boletoExpiresAfterDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => setBoletoExpiresAfterDays(days)}
                    style={[styles.boletoDaysChip, active ? styles.boletoDaysChipActive : styles.boletoDaysChipIdle]}
                  >
                    <Text style={[styles.boletoDaysChipText, active ? styles.boletoDaysChipTextActive : null]}>
                      {days} {days === 1 ? "dia" : "dias"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {selectedPayment === "pix" && (
          <View style={styles.boletoInfo}>
            <Text style={styles.boletoInfoText}>Prazo de vencimento do PIX</Text>
            <View style={styles.boletoDaysRow}>
              {[15, 30].map((days) => {
                const active = pixExpiresAfterDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => setPixExpiresAfterDays(days)}
                    style={[styles.boletoDaysChip, active ? styles.boletoDaysChipActive : styles.boletoDaysChipIdle]}
                  >
                    <Text style={[styles.boletoDaysChipText, active ? styles.boletoDaysChipTextActive : null]}>
                      {days} {days === 1 ? "dia" : "dias"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

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
          <Pressable onPress={handleCheckout} style={styles.checkoutButton} disabled={isProcessing}>
            {isProcessing && (selectedPayment === "boleto" || selectedPayment === "pix") ? (
              <>
                <LoadingSpinner size={20} />
                <Text style={styles.checkoutButtonText}>
                  {selectedPayment === "pix" ? "Gerando PIX..." : "Gerando boleto..."}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.checkoutButtonText}>Finalizar Compra</Text>
                <ChevronRight color="#E6E8EA" size={18} />
              </>
            )}
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
  errorText: {
    color: "#E64646",
    fontSize: 12,
    marginTop: 8,
  },
  helperText: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
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
  boletoDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  boletoDaysChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  boletoDaysChipActive: {
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    borderColor: "rgba(93, 162, 230, 0.7)",
  },
  boletoDaysChipIdle: {
    backgroundColor: "rgba(34, 38, 46, 0.8)",
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  boletoDaysChipText: {
    color: "#8C98A8",
    fontSize: 12,
  },
  boletoDaysChipTextActive: {
    color: "#E6E8EA",
    fontWeight: "600",
  },
  recurrenceInline: {
    marginTop: 12,
    gap: 8,
  },
  recurrenceInlineLabel: {
    color: "#8C98A8",
    fontSize: 12,
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
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 10, 16, 0.7)",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  processingCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(24, 28, 36, 0.98)",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(93, 162, 230, 0.4)",
    alignItems: "center",
    gap: 10,
  },
  processingTitle: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  processingSubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    textAlign: "center",
  },
});
