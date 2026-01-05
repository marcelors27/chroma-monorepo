import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type SheetContextType = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const SheetContext = createContext<SheetContextType | null>(null);

interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, defaultOpen, onOpenChange, children }: SheetProps) {
  const [internalOpen, setInternalOpen] = useState(!!defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? !!open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const value = useMemo(() => ({ open: currentOpen, setOpen }), [currentOpen]);

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children, ...props }: PressableProps & { asChild?: boolean }) {
  const context = useContext(SheetContext);
  if (!context) {
    return null;
  }
  return (
    <Pressable onPress={() => context.setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

interface SheetContentProps extends ViewProps {
  side?: "right" | "bottom";
  className?: string;
}

export function SheetContent({ side = "bottom", className, children, ...props }: SheetContentProps) {
  const context = useContext(SheetContext);
  if (!context) {
    return null;
  }

  const containerClasses =
    side === "right"
      ? "ml-auto h-full w-full max-w-md rounded-l-2xl"
      : "mt-auto w-full rounded-t-2xl";

  return (
    <Modal transparent visible={context.open} animationType="slide" onRequestClose={() => context.setOpen(false)}>
      <View className="flex-1 bg-black/60">
        <Pressable className="flex-1" onPress={() => context.setOpen(false)} />
        <View className={cn("bg-card p-4", containerClasses, className)} {...props}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function SheetHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mb-3", className)} {...props} />;
}

export function SheetTitle({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)}>{children}</Text>;
}

export function SheetFooter({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mt-3 flex-row gap-2", className)} {...props} />;
}
