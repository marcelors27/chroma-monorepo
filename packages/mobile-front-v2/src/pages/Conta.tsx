import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Building2, CreditCard, Package, Bell, HelpCircle, LogOut, ChevronRight, Shield, FileText } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";

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

export default function Conta() {
  const navigation = useNavigation();
  const { logout } = useAuth();

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
              <Text style={styles.avatarText}>JS</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>João Silva</Text>
              <Text style={styles.profileEmail}>joao.silva@email.com</Text>
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>Cliente Premium</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>Condomínios</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>12</Text>
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
            {section.title ? (
              <Text style={styles.sectionTitle}>
                {section.title}
              </Text>
            ) : null}
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.screen}
                    onPress={() => navigation.navigate(item.screen as never)}
                    style={[
                      styles.sectionRow,
                      index !== section.items.length - 1 && styles.sectionRowDivider,
                    ]}
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

        <Pressable
          onPress={handleLogout}
          style={styles.logoutButton}
        >
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
    paddingBottom: 96,
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
    fontSize: 18,
    fontWeight: "600",
  },
  metricValueMuted: {
    color: "#8C98A8",
    fontSize: 18,
    fontWeight: "600",
  },
  metricLabel: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: "#8C98A8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(46, 54, 68, 0.6)",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  sectionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46, 54, 68, 0.6)",
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    flex: 1,
    color: "#E6E8EA",
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  footerText: {
    textAlign: "center",
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 20,
  },
});
