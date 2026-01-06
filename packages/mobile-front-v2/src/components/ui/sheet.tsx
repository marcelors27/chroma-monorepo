import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";

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
}

export function SheetContent({ side = "bottom", style, children, ...props }: SheetContentProps) {
  const context = useContext(SheetContext);
  if (!context) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={context.open}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => context.setOpen(false)}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => context.setOpen(false)} />
        <View
          style={[styles.container, side === "right" ? styles.rightSheet : styles.bottomSheet, style]}
          {...props}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function SheetHeader(props: ViewProps) {
  return <View style={styles.header} {...props} />;
}

export function SheetTitle({ children }: { children?: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SheetFooter(props: ViewProps) {
  return <View style={styles.footer} {...props} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  container: {
    backgroundColor: "#0B0F14",
    padding: 16,
  },
  bottomSheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  rightSheet: {
    height: "100%",
    width: "100%",
    maxWidth: 360,
    alignSelf: "flex-end",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
});
