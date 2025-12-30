import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

type ButtonVariant = "primary" | "outline" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
};

const Button = ({ title, onPress, variant = "primary", disabled, style }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text` as const], disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: "#FFFFFF",
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: colors.muted,
  },
});

export default Button;
