import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import IndexScreen from "../screens/IndexScreen";
import AuthScreen from "../screens/AuthScreen";
import CompanyLinkScreen from "../screens/CompanyLinkScreen";
import AccessPendingScreen from "../screens/AccessPendingScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/HomeScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CartScreen from "../screens/CartScreen";
import OrdersScreen from "../screens/OrdersScreen";
import CondosScreen from "../screens/CondosScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import SettingsScreen from "../screens/SettingsScreen";
import RecurrencesScreen from "../screens/RecurrencesScreen";
import NewsDetailsScreen from "../screens/NewsDetailsScreen";
import ProductDetailsScreen from "../screens/ProductDetailsScreen";
import { colors } from "../theme/colors";
import type { RootStackParamList, TabParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const MainTabs = () => (
  <Tabs.Navigator
    screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: "700" },
      headerShadowVisible: false,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingTop: 6,
        paddingBottom: 8,
        minHeight: 64,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      tabBarIcon: ({ color, size }) => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
          Home: "home-outline",
          Dashboard: "grid-outline",
          Cart: "cart-outline",
          Orders: "receipt-outline",
          Settings: "settings-outline",
        };
        const iconName = iconMap[route.name] ?? "ellipse-outline";
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Inicio" }} />
    <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Produtos" }} />
    <Tabs.Screen name="Cart" component={CartScreen} options={{ title: "Carrinho" }} />
    <Tabs.Screen name="Orders" component={OrdersScreen} options={{ title: "Pedidos" }} />
    <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: "Configuracoes" }} />
  </Tabs.Navigator>
);

const RootNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: "700" },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="Index" component={IndexScreen} />
    <Stack.Screen name="Auth" component={AuthScreen} />
    <Stack.Screen name="CompanyLink" component={CompanyLinkScreen} />
    <Stack.Screen name="AccessPending" component={AccessPendingScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen name="Condos" component={CondosScreen} options={{ headerShown: true, title: "Condominios" }} />
    <Stack.Screen name="Recurrences" component={RecurrencesScreen} options={{ headerShown: true, title: "Recorrencias" }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: "Checkout" }} />
    <Stack.Screen name="NewsDetails" component={NewsDetailsScreen} options={{ headerShown: true, title: "Noticia" }} />
    <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ headerShown: true, title: "Produto" }} />
  </Stack.Navigator>
);

export default RootNavigator;
