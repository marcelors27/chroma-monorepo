import type { ComponentProps } from "react";
import { Button as TamaguiButton, Text, styled } from "tamagui";
import type { ButtonProps as TamaguiButtonProps } from "tamagui";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<TamaguiButtonProps, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  textProps?: ComponentProps<typeof Text>;
}

const BaseButton = styled(TamaguiButton, {
  name: "AppButton",
  borderRadius: 20,
  height: 44,
  paddingHorizontal: 18,
  justifyContent: "center",
  alignItems: "center",
  pressStyle: { opacity: 0.9 },
  variants: {
    variant: {
      default: {
        backgroundColor: "$accent",
      },
      secondary: {
        backgroundColor: "$backgroundStrong",
      },
      ghost: {
        backgroundColor: "transparent",
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "$borderColor",
      },
      destructive: {
        backgroundColor: "$red10",
      },
    },
    sizeVariant: {
      sm: {
        height: 36,
        borderRadius: 16,
        paddingHorizontal: 12,
      },
      md: {
        height: 44,
        borderRadius: 20,
        paddingHorizontal: 18,
      },
      lg: {
        height: 52,
        borderRadius: 22,
        paddingHorizontal: 20,
      },
    },
  },
  defaultVariants: {
    variant: "default",
    sizeVariant: "md",
  },
});

export function Button({
  variant = "default",
  size = "md",
  textProps,
  children,
  ...props
}: ButtonProps) {
  return (
    <BaseButton variant={variant} sizeVariant={size} {...props}>
      {typeof children === "string" ? (
        <Text
          color={variant === "ghost" || variant === "outline" ? "$color" : "$background"}
          fontSize={13}
          fontWeight="600"
          textAlign="center"
          {...textProps}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </BaseButton>
  );
}
