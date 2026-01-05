import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground",
        className,
      )}
      placeholderTextColor="hsl(215 15% 55%)"
      {...props}
    />
  );
}
