import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";

interface SkeletonProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ style, ...props }: SkeletonProps) {
  return <View style={[styles.skeleton, style]} {...props} />;
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "rgba(34, 38, 46, 0.6)",
    borderRadius: 10,
  },
});
