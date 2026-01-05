import { Pressable, Text } from "react-native";
import type { PressableProps } from "react-native";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  ghost: "bg-transparent",
  outline: "border border-border bg-transparent",
  destructive: "bg-destructive",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 rounded-xl",
  md: "px-4 py-3 rounded-2xl",
  lg: "px-5 py-4 rounded-2xl",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  textClassName,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        "items-center justify-center",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "text-sm font-semibold",
            variant === "ghost" || variant === "outline" ? "text-foreground" : "text-primary-foreground",
            variant === "destructive" && "text-destructive-foreground",
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
