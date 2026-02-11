import { StyleSheet, View } from "react-native";
import { LoadingSpinner } from "./LoadingSpinner";

type LoadingOverlayProps = {
  visible: boolean;
};

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <LoadingSpinner size={64} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 10, 16, 0.7)",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
