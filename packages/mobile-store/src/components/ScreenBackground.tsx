import type { ReactNode } from "react";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import { ImageBackground, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type ScreenBackgroundProps = {
  source: ImageSourcePropType;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const toRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ScreenBackground = ({ source, children, style }: ScreenBackgroundProps) => {
  return (
    <ImageBackground source={source} style={[styles.background, style]} resizeMode="cover">
      <LinearGradient
        colors={[toRgba(colors.background, 0.92), toRgba(colors.background, 0.95)]}
        style={styles.overlay}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
});

export default ScreenBackground;
