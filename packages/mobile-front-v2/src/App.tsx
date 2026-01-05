import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { Home, Package, ClipboardList, ShoppingCart, User } from "lucide-react-native";
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

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-primary">Carregando...</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(18, 22, 28, 0.9)",
          borderTopColor: "rgba(255,255,255,0.05)",
          height: 64,
        },
        tabBarActiveTintColor: "hsl(220 10% 60%)",
        tabBarInactiveTintColor: "hsl(215 15% 55%)",
      }}
    >
      <Tab.Screen
        name="Index"
        component={Index}
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Produtos"
        component={Produtos}
        options={{
          title: "Produtos",
          tabBarIcon: ({ color }) => <Package color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Pedidos"
        component={Pedidos}
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Carrinho"
        component={Carrinho}
        options={{
          title: "Carrinho",
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={20} />,
        }}
      />
      <Tab.Screen
        name="Conta"
        component={Conta}
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => <User color={color} size={20} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Landing" component={Landing} />
          <Stack.Screen name="Auth" component={Auth} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ProductDetails" component={ProductDetails} />
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
    <SafeAreaProvider>
      <NotificationProvider>
        <CondoProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </CondoProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  </QueryClientProvider>
);

export default App;
