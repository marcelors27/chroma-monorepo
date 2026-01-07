import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Home, Package, ClipboardList, ShoppingCart, User } from "lucide-react-native";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../tamagui.config";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import ProductDetails from "./pages/ProductDetails";
import Condominios from "./pages/Condominios";
import CondominioDetalhes from "./pages/CondominioDetalhes";
import Carrinho from "./pages/Carrinho";
import Conta from "./pages/Conta";
import Recorrencias from "./pages/Recorrencias";
import Pedidos from "./pages/Pedidos";
import Rastreamento from "./pages/Rastreamento";
import NoticiaDetalhes from "./pages/NoticiaDetalhes";
import Noticias from "./pages/Noticias";
import Pagamentos from "./pages/Pagamentos";
import NotasFiscais from "./pages/NotasFiscais";
import DadosPessoais from "./pages/DadosPessoais";
import Notificacoes from "./pages/Notificacoes";
import Seguranca from "./pages/Seguranca";
import Ajuda from "./pages/Ajuda";

const queryClient = new QueryClient();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ProductsStack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Carregando...</Text>
    </View>
  );
}

function FadeOnFocus({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, [opacity])
  );

  return (
    <View style={styles.fadeContainer}>
      <Animated.View style={[styles.fadeWrapper, { opacity }]}>{children}</Animated.View>
    </View>
  );
}

function IndexScreen() {
  return (
    <FadeOnFocus>
      <Index />
    </FadeOnFocus>
  );
}

function ProdutosScreen() {
  return (
    <FadeOnFocus>
      <ProductsStackNavigator />
    </FadeOnFocus>
  );
}

function PedidosScreen() {
  return (
    <FadeOnFocus>
      <Pedidos />
    </FadeOnFocus>
  );
}

function CarrinhoScreen() {
  return (
    <FadeOnFocus>
      <Carrinho />
    </FadeOnFocus>
  );
}

function ContaScreen() {
  return (
    <FadeOnFocus>
      <Conta />
    </FadeOnFocus>
  );
}

function CartTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { itemsCount, lastAddId, lastAddQty } = useCart();
  const scale = useRef(new Animated.Value(1)).current;
  const plusOpacity = useRef(new Animated.Value(0)).current;
  const plusTranslate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (lastAddId === 0) return;
    scale.setValue(1);
    plusOpacity.setValue(0);
    plusTranslate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(plusOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(plusTranslate, { toValue: -10, duration: 200, useNativeDriver: true }),
        Animated.timing(plusOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]),
    ]).start();
  }, [lastAddId, plusOpacity, plusTranslate, scale]);

  return (
    <View style={styles.tabIconWrapper}>
      <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
      <View style={styles.cartIconWrapper}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <ShoppingCart color={color} size={20} />
        </Animated.View>
        {itemsCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemsCount}</Text>
          </View>
        )}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cartPlusBadge,
            { opacity: plusOpacity, transform: [{ translateY: plusTranslate }] },
          ]}
        >
          <Text style={styles.cartPlusText}>+{lastAddQty}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: {
          backgroundColor: "#0B0F14",
        },
        tabBarStyle: {
          backgroundColor: "rgba(18, 22, 28, 0.9)",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          height: 70,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarIconStyle: {
          marginBottom: 10,
        },
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarVisibilityAnimationConfig: {
          show: { animation: "fade", config: { duration: 180 } },
          hide: { animation: "fade", config: { duration: 180 } },
        },
        tabBarActiveTintColor: "hsl(220 10% 60%)",
        tabBarInactiveTintColor: "hsl(215 15% 55%)",
      }}
    >
      <Tab.Screen
        name="Index"
        component={IndexScreen}
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
              <Home color={color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProdutosScreen}
        options={{
          title: "Produtos",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
              <Package color={color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Pedidos"
        component={PedidosScreen}
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
              <ClipboardList color={color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Carrinho"
        component={CarrinhoScreen}
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color, focused }) => <CartTabIcon color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Conta"
        component={ContaScreen}
        options={{
          title: "Conta",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
              <User color={color} size={20} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ProductsStackNavigator() {
  return (
    <ProductsStack.Navigator
      screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: "#0B0F14" } }}
      initialRouteName="ProdutosIndex"
    >
      <ProductsStack.Screen name="ProdutosIndex" component={Produtos} />
      <ProductsStack.Screen name="ProductDetails" component={ProductDetails} />
    </ProductsStack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: "#0B0F14" } }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Landing" component={Landing} />
          <Stack.Screen name="Auth" component={Auth} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Condominios" component={Condominios} />
          <Stack.Screen name="CondominioDetalhes" component={CondominioDetalhes} />
          <Stack.Screen name="Recorrencias" component={Recorrencias} />
          <Stack.Screen name="Rastreamento" component={Rastreamento} />
          <Stack.Screen name="Noticias" component={Noticias} />
          <Stack.Screen name="NoticiaDetalhes" component={NoticiaDetalhes} />
          <Stack.Screen name="Pagamentos" component={Pagamentos} />
          <Stack.Screen name="NotasFiscais" component={NotasFiscais} />
          <Stack.Screen name="DadosPessoais" component={DadosPessoais} />
          <Stack.Screen name="Notificacoes" component={Notificacoes} />
          <Stack.Screen name="Seguranca" component={Seguranca} />
          <Stack.Screen name="Ajuda" component={Ajuda} />
        </>
      )}
    </Stack.Navigator>
  );
}

import { CondoProvider } from "@/contexts/CondoContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <SafeAreaProvider>
        <NotificationProvider>
          <CondoProvider>
            <CartProvider>
              <AuthProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </AuthProvider>
            </CartProvider>
          </CondoProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  </QueryClientProvider>
);

export default App;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F14",
  },
  loadingText: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "600",
  },
  fadeWrapper: {
    flex: 1,
  },
  fadeContainer: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },
  tabIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  cartIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5DA2E6",
  },
  cartBadgeText: {
    color: "#0B0F14",
    fontSize: 10,
    fontWeight: "700",
  },
  cartPlusBadge: {
    position: "absolute",
    top: -22,
    right: -14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.95)",
  },
  cartPlusText: {
    color: "#0B0F14",
    fontSize: 10,
    fontWeight: "700",
  },
  tabIndicator: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  tabIndicatorActive: {
    backgroundColor: "#5DA2E6",
  },
  tabBarBackground: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
