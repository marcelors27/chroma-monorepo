import { ScrollView, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Building2, CreditCard, Package, Bell, HelpCircle, LogOut, ChevronRight, Shield, FileText } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
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

      <ScrollView className="px-4 pt-2 pb-24">
        <View className="bg-card rounded-3xl p-5 mt-2 border border-border">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
              <Text className="text-xl font-semibold text-foreground">JS</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">João Silva</Text>
              <Text className="text-sm text-muted-foreground">joao.silva@email.com</Text>
              <View className="mt-2 px-3 py-1 rounded-full bg-secondary self-start">
                <Text className="text-xs font-semibold text-muted-foreground">Cliente Premium</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-between mt-5 pt-4 border-t border-border">
            <View className="flex-1 items-center">
              <Text className="text-xl font-semibold text-foreground">3</Text>
              <Text className="text-xs text-muted-foreground mt-1">Condomínios</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xl font-semibold text-foreground">12</Text>
              <Text className="text-xs text-muted-foreground mt-1">Pedidos</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xl font-semibold text-muted-foreground">R$ 430</Text>
              <Text className="text-xs text-muted-foreground mt-1">Economia</Text>
            </View>
          </View>
        </View>

        {menuItems.map((section) => (
          <View key={section.id} className="mt-4">
            {section.title ? (
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                {section.title}
              </Text>
            ) : null}
            <View className="bg-card rounded-3xl overflow-hidden border border-border">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.screen}
                    onPress={() => navigation.navigate(item.screen as never)}
                    className={cn(
                      "flex-row items-center gap-3 px-4 py-5",
                      index !== section.items.length - 1 && "border-b border-border",
                    )}
                  >
                    <View className="w-11 h-11 rounded-2xl bg-secondary items-center justify-center">
                      <Icon color="hsl(220 10% 55%)" size={18} />
                    </View>
                    <Text className="flex-1 text-base text-foreground">{item.label}</Text>
                    <ChevronRight color="hsl(215 15% 55%)" size={18} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          onPress={handleLogout}
          className="mt-8 py-4 rounded-2xl bg-destructive/15 flex-row items-center justify-center gap-2"
        >
          <LogOut color="hsl(0 72% 51%)" size={18} />
          <Text className="text-destructive font-medium">Sair da conta</Text>
        </Pressable>

        <Text className="text-center text-xs text-muted-foreground mt-5">Síndico Store v1.0.0</Text>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
