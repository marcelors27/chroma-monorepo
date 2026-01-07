import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  User,
  Building2,
  CreditCard,
  Package,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  FileText,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCondo } from "@/contexts/CondoContext";
import { toast } from "@/lib/toast";
import { listOrders } from "@/lib/medusa";

const menuItems = [
  {
    id: "compras",
    title: "",
    items: [
      { icon: Package, label: "Meus Pedidos", screen: "Pedidos" },
      { icon: CreditCard, label: "Formas de Pagamento", screen: "Pagamentos" },
      { icon: FileText, label: "Notas Fiscais", screen: "NotasFiscais" },
    ],
  },
  {
    id: "gestao",
    title: "Gestão",
    items: [
      { icon: Building2, label: "Meus Condomínios", screen: "Condominios" },
      { icon: User, label: "Dados Pessoais", screen: "DadosPessoais" },
    ],
  },
  {
    id: "config",
    title: "Configurações",
    items: [
      { icon: Bell, label: "Notificações", screen: "Notificacoes" },
      { icon: Shield, label: "Segurança", screen: "Seguranca" },
    ],
  },
  {
    id: "ajuda",
    title: "Suporte",
    items: [{ icon: HelpCircle, label: "Central de Ajuda", screen: "Ajuda" }],
  },
];

const getInitials = (name?: string) => {
  if (!name) return "--";
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return `${first}${last}`.toUpperCase();
};

export default function Conta() {
  const navigation = useNavigation();
  const { logout, user } = useAuth();
  const { condos } = useCondo();
  const { data } = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const ordersCount = data?.orders?.length || 0;

  const handleLogout = () => {
    logout();
    toast.success("Você saiu da conta");
  };

  return (
    <AuthenticatedLayout>
      <Header title="Minha Conta" showNotification={false} showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || "Usuário"}</Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>Cliente</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{condos.length}</Text>
              <Text style={styles.metricLabel}>Condomínios</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{ordersCount}</Text>
              <Text style={styles.metricLabel}>Pedidos</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValueMuted}>R$ 430</Text>
              <Text style={styles.metricLabel}>Economia</Text>
            </View>
          </View>
        </View>

        {menuItems.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.screen}
                    onPress={() => navigation.navigate(item.screen as never)}
                    style={[styles.sectionRow, index !== section.items.length - 1 && styles.sectionRowDivider]}
                  >
                    <View style={styles.sectionIcon}>
                      <Icon color="hsl(220 10% 55%)" size={18} />
                    </View>
                    <Text style={styles.sectionLabel}>{item.label}</Text>
                    <ChevronRight color="hsl(215 15% 55%)" size={18} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color="hsl(0 72% 51%)" size={18} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

        <Text style={styles.footerText}>Síndico Store v1.0.0</Text>
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
  profileCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#E6E8EA",
    fontSize: 20,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  profileEmail: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 4,
  },
  profileBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignSelf: "flex-start",
  },
  profileBadgeText: {
    color: "#8C98A8",
    fontSize: 11,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.6)",
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
  },
  metricValueMuted: {
    color: "#5DA2E6",
    fontSize: 16,
    fontWeight: "700",
  },
  metricLabel: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 6,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "#8C98A8",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  sectionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    flex: 1,
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  logoutText: {
    color: "hsl(0 72% 51%)",
    fontSize: 13,
    fontWeight: "600",
  },
  footerText: {
    color: "#4B5563",
    fontSize: 11,
    textAlign: "center",
    marginTop: 24,
  },
});
