import "react-native-gesture-handler";
import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { CartProvider } from "./src/contexts/CartContext";
import { CondoProvider } from "./src/contexts/CondoContext";
import { navigationRef, navigate } from "./src/navigation/navigationRef";
import { setAccessPendingHandler } from "./src/lib/medusa";
const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    setAccessPendingHandler(() => navigate("AccessPending"));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <CondoProvider>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style="light" />
                <RootNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </CondoProvider>
        </CartProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
