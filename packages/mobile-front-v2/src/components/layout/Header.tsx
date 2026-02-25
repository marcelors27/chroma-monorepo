import { ChevronDown, Building2, Check, ArrowLeft } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { NotificationPanel } from "@/components/ui/NotificationPanel";
import { useCondo } from "@/contexts/CondoContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { LOGO_SIZE } from "@/constants/ui";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNotification?: boolean;
  showCondoSelector?: boolean;
  showBackButton?: boolean;
  showBreadcrumb?: boolean;
  breadcrumbItems?: string[];
}

const FRIENDLY_ROUTE_NAMES: Record<string, string> = {
  Landing: "Boas-vindas",
  Auth: "Entrar ou cadastrar",
  ResetPassword: "Recuperar senha",
  MainTabs: "Início",
  Index: "Início",
  ProdutosCategorias: "Categorias",
  ProdutosIndex: "Produtos",
  ProductDetails: "Detalhes do produto",
  Pedidos: "Meus pedidos",
  Carrinho: "Carrinho",
  Conta: "Minha conta",
  Condominios: "Meus estabelecimentos",
  CondominioDetalhes: "Detalhes do estabelecimento",
  AccessPending: "Acesso em avaliação",
  Recorrencias: "Recorrências",
  Rastreamento: "Rastreamento",
  Noticias: "Notícias",
  NoticiaDetalhes: "Detalhes da notícia",
  Pagamentos: "Pagamentos",
  NotasFiscais: "Notas fiscais",
  DadosPessoais: "Dados pessoais",
  Notificacoes: "Notificações",
  Seguranca: "Segurança",
  Ajuda: "Central de ajuda",
  Pontos: "Pontos",
};

const toFriendlyRouteName = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

export function Header({
  title,
  subtitle,
  showNotification = true,
  showCondoSelector = false,
  showBackButton = false,
  showBreadcrumb = true,
  breadcrumbItems,
}: HeaderProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const { condos, activeCondo, setActiveCondo, isAllCondos, setAllCondos } = useCondo();
  const { terms } = useBusinessTerms();
  const canGoBack = navigation.canGoBack?.() ?? false;
  const shouldShowBackButton = showBackButton && canGoBack;
  const routeName = route.name;

  const resolvedTitle = title || "Chroma Store";
  const currentRouteLabel = FRIENDLY_ROUTE_NAMES[routeName] || toFriendlyRouteName(routeName);
  const myAccountLabel = FRIENDLY_ROUTE_NAMES.Conta;
  const ordersLabel = FRIENDLY_ROUTE_NAMES.Pedidos;
  const newsLabel = FRIENDLY_ROUTE_NAMES.Noticias;
  const condosLabel = FRIENDLY_ROUTE_NAMES.Condominios;
  const productsLabel = FRIENDLY_ROUTE_NAMES.ProdutosCategorias;
  const defaultBreadcrumbByRoute: Record<string, string[]> = {
    Landing: [FRIENDLY_ROUTE_NAMES.Landing],
    Auth: [FRIENDLY_ROUTE_NAMES.Auth],
    ResetPassword: [FRIENDLY_ROUTE_NAMES.ResetPassword],
    MainTabs: [FRIENDLY_ROUTE_NAMES.MainTabs],
    Index: [FRIENDLY_ROUTE_NAMES.Index],
    ProdutosCategorias: [productsLabel],
    ProdutosIndex: [productsLabel, FRIENDLY_ROUTE_NAMES.ProdutosIndex],
    ProductDetails: [productsLabel, resolvedTitle || FRIENDLY_ROUTE_NAMES.ProductDetails],
    Pedidos: [ordersLabel],
    Carrinho: [FRIENDLY_ROUTE_NAMES.Carrinho],
    Conta: [myAccountLabel],
    Condominios: [condosLabel],
    CondominioDetalhes: [condosLabel, resolvedTitle || FRIENDLY_ROUTE_NAMES.CondominioDetalhes],
    AccessPending: [condosLabel, FRIENDLY_ROUTE_NAMES.AccessPending],
    Recorrencias: [FRIENDLY_ROUTE_NAMES.Recorrencias],
    Rastreamento: [ordersLabel, FRIENDLY_ROUTE_NAMES.Rastreamento],
    Noticias: [newsLabel],
    NoticiaDetalhes: [newsLabel, FRIENDLY_ROUTE_NAMES.NoticiaDetalhes],
    Pagamentos: [myAccountLabel, FRIENDLY_ROUTE_NAMES.Pagamentos],
    NotasFiscais: [myAccountLabel, FRIENDLY_ROUTE_NAMES.NotasFiscais],
    DadosPessoais: [myAccountLabel, FRIENDLY_ROUTE_NAMES.DadosPessoais],
    Notificacoes: [myAccountLabel, FRIENDLY_ROUTE_NAMES.Notificacoes],
    Seguranca: [myAccountLabel, FRIENDLY_ROUTE_NAMES.Seguranca],
    Ajuda: [myAccountLabel, FRIENDLY_ROUTE_NAMES.Ajuda],
    Pontos: [myAccountLabel, `Gastar ${terms.pointsLabelLower}`],
  };
  const breadcrumbs =
    (breadcrumbItems && breadcrumbItems.length ? breadcrumbItems : defaultBreadcrumbByRoute[routeName]) ||
    (subtitle ? [subtitle, resolvedTitle] : title ? [currentRouteLabel, resolvedTitle] : [currentRouteLabel]);

  const displayName = isAllCondos
    ? `${terms.label} não selecionado`
    : activeCondo?.name || "Selecionar";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {shouldShowBackButton && (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>
        )}
        <View style={styles.titleBlock}>
          {showBreadcrumb && breadcrumbs.length > 0 && (
            <Text style={styles.breadcrumbText}>{breadcrumbs.join(" / ")}</Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View style={styles.brandRow}>
              <Image source={logo} style={styles.brandLogo} />
              <Text style={[styles.title, styles.titleAccent]}>Chroma</Text>
              <Text style={styles.title}> Store</Text>
            </View>
          )}

          {showCondoSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Pressable style={styles.condoRow}>
                  <Building2 color="#8C98A8" size={14} />
                  <Text style={styles.condoText}>{displayName}</Text>
                  <ChevronDown color="#8C98A8" size={16} />
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent style={{ width: 256 }}>
                <DropdownMenuItem
                  onPress={setAllCondos}
                  style={[styles.dropdownItemRow, isAllCondos && styles.dropdownItemActive]}
                >
                  <View style={styles.dropdownItemContent}>
                  {isAllCondos && <Check color="hsl(220 10% 50%)" size={16} />}
                  {!isAllCondos && <Building2 color="hsl(215 15% 55%)" size={16} />}
                    <Text style={[styles.dropdownItemText, isAllCondos && styles.dropdownItemTextActive]}>
                      {`${terms.label} não selecionado`}
                    </Text>
                  </View>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {condos.map((condo) => (
                  <DropdownMenuItem
                    key={condo.id}
                    onPress={() => setActiveCondo(condo)}
                    style={[
                      styles.dropdownItemRow,
                      activeCondo?.id === condo.id && styles.dropdownItemActive,
                    ]}
                  >
                    <View style={styles.dropdownItemContent}>
                      {activeCondo?.id === condo.id && (
                        <Check color="hsl(220 10% 50%)" size={16} />
                      )}
                      <View style={styles.dropdownItemStack}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            activeCondo?.id === condo.id && styles.dropdownItemTextActive,
                          ]}
                        >
                          {condo.name}
                        </Text>
                        <Text style={styles.dropdownItemSubtitle}>{condo.address}</Text>
                      </View>
                    </View>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </View>
        
        {showNotification && <NotificationPanel />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(18, 22, 28, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(55, 63, 77, 0.6)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  titleBlock: {
    flex: 1,
  },
  breadcrumbText: {
    color: "#6C7888",
    fontSize: 12,
    marginBottom: 4,
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 13,
    marginBottom: 4,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 26,
    fontWeight: "700",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    resizeMode: "contain",
  },
  titleAccent: {
    color: "#5DA2E6",
  },
  condoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  condoText: {
    color: "#8C98A8",
    fontSize: 14,
  },
  dropdownItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownItemText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: "#F3F6FA",
    fontWeight: "600",
  },
  dropdownItemActive: {
    backgroundColor: "rgba(93, 162, 230, 0.12)",
  },
  dropdownItemStack: {
    flex: 1,
  },
  dropdownItemTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownItemSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
  },
});
