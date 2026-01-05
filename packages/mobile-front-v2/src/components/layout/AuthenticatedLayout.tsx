import { ReactNode } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import condoBackground from "@/assets/condo-background.jpg";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <View style={styles.container}>
      <ImageBackground source={condoBackground} resizeMode="cover" style={styles.background}>
        <LinearGradient
          colors={["rgba(16, 20, 26, 0.92)", "rgba(16, 20, 26, 0.82)", "rgba(16, 20, 26, 0.95)"]}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F14",
  },
  background: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});
