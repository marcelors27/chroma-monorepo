import { ScrollView } from "react-native";
import type { ScrollViewProps } from "react-native";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends ScrollViewProps {
  className?: string;
}

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return <ScrollView className={cn("flex-1", className)} {...props} />;
}
