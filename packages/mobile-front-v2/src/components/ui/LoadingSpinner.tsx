import { useEffect, useRef } from "react";
import { Animated, Easing, Image, ViewStyle } from "react-native";
import logo from "@/assets/logo.png";
import { LOGO_SIZE } from "@/constants/ui";

type LoadingSpinnerProps = {
  size?: number;
  style?: ViewStyle;
};

export function LoadingSpinner({ size = LOGO_SIZE, style }: LoadingSpinnerProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.98,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);

  return (
    <Animated.View style={[{ width: size, height: size, opacity, transform: [{ scale }] }, style]}>
      <Image source={logo} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </Animated.View>
  );
}
