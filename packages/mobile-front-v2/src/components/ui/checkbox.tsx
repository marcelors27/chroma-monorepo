import { Pressable, View } from "react-native";
import type { PressableProps } from "react-native";
import { cn } from "@/lib/utils";

interface CheckboxProps extends PressableProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked = false, onCheckedChange, className, ...props }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-5 w-5 items-center justify-center rounded-md border border-border bg-card",
        checked && "bg-primary",
        className,
      )}
      {...props}
    >
      {checked && <View className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />}
    </Pressable>
  );
}
