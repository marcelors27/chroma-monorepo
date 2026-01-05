import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextInputProps {
  className?: string;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground",
        className,
      )}
      placeholderTextColor="hsl(215 15% 55%)"
      {...props}
    />
  );
}
