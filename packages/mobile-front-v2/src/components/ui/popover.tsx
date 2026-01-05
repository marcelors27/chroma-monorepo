import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type PopoverContextType = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const PopoverContext = createContext<PopoverContextType | null>(null);

interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open, defaultOpen, onOpenChange, children }: PopoverProps) {
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

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children, ...props }: PressableProps) {
  const context = useContext(PopoverContext);
  if (!context) {
    return null;
  }
  return (
    <Pressable onPress={() => context.setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

export function PopoverContent({ className, children }: ViewProps & { className?: string }) {
  const context = useContext(PopoverContext);
  if (!context) {
    return null;
  }

  return (
    <Modal transparent visible={context.open} animationType="fade" onRequestClose={() => context.setOpen(false)}>
      <View className="flex-1 bg-black/50 px-4 justify-center">
        <Pressable className="absolute inset-0" onPress={() => context.setOpen(false)} />
        <View className={cn("w-full max-w-md rounded-2xl bg-card p-4 self-center", className)}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
