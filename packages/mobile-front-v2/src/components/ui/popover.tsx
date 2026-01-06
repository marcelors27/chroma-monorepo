import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";

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

export function PopoverContent({ style, children }: ViewProps) {
  const context = useContext(PopoverContext);
  if (!context) {
    return null;
  }

  return (
    <Modal transparent visible={context.open} animationType="fade" onRequestClose={() => context.setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => context.setOpen(false)} />
        <View style={[styles.content, style]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#151A22",
    padding: 16,
    alignSelf: "center",
  },
});
