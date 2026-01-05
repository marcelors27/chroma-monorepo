import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type DropdownContextType = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({ open, defaultOpen, onOpenChange, children }: DropdownMenuProps) {
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

  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({ children, ...props }: PressableProps & { asChild?: boolean }) {
  const context = useContext(DropdownContext);
  if (!context) {
    return null;
  }
  return (
    <Pressable onPress={() => context.setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

export function DropdownMenuContent({
  className,
  children,
  align,
}: ViewProps & { className?: string; align?: "start" | "center" | "end" }) {
  const context = useContext(DropdownContext);
  if (!context) {
    return null;
  }

  return (
    <Modal transparent visible={context.open} animationType="fade" onRequestClose={() => context.setOpen(false)}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className={cn("w-full max-w-sm rounded-2xl bg-card p-2", className)}>{children}</View>
      </View>
    </Modal>
  );
}

export function DropdownMenuItem({
  className,
  children,
  onPress,
}: PressableProps & { className?: string; children: React.ReactNode }) {
  const context = useContext(DropdownContext);
  return (
    <Pressable
      className={cn("rounded-xl px-3 py-3", className)}
      onPress={(event) => {
        onPress?.(event);
        context?.setOpen(false);
      }}
    >
      {typeof children === "string" ? <Text className="text-sm text-foreground">{children}</Text> : children}
    </Pressable>
  );
}

export function DropdownMenuSeparator({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("h-px bg-border my-2", className)} {...props} />;
}
