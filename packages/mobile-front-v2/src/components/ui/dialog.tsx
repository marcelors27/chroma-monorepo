import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type DialogContextType = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const DialogContext = createContext<DialogContextType | null>(null);

interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
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

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children, ...props }: PressableProps & { asChild?: boolean }) {
  const context = useContext(DialogContext);
  if (!context) {
    return null;
  }
  return (
    <Pressable onPress={() => context.setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

export function DialogContent({ children, className }: ViewProps & { className?: string }) {
  const context = useContext(DialogContext);
  if (!context) {
    return null;
  }

  return (
    <Modal transparent visible={context.open} animationType="fade" onRequestClose={() => context.setOpen(false)}>
      <View className="flex-1 bg-black/60 px-4 justify-center">
        <Pressable className="absolute inset-0" onPress={() => context.setOpen(false)} />
        <View className={cn("w-full max-w-md rounded-2xl bg-card p-4 self-center", className)}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function DialogHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mb-3", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("mt-4 flex-row justify-end gap-2", className)} {...props} />;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)}>{children}</Text>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm text-muted-foreground", className)}>{children}</Text>;
}
