import "react-native-gesture-handler";
import { useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { CartProvider } from "./src/contexts/CartContext";
import { CondoProvider } from "./src/contexts/CondoContext";
import { navigationRef, navigate } from "./src/navigation/navigationRef";
import { setAccessPendingHandler } from "./src/lib/medusa";
import { colors } from "./src/theme/colors";

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    setAccessPendingHandler(() => navigate("AccessPending"));
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(colors.background);
      StatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <CondoProvider>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar barStyle="light-content" backgroundColor={colors.background} />
                <RootNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </CondoProvider>
        </CartProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
