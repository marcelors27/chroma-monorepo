import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";

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

export function DialogContent({ children, style }: ViewProps) {
  const context = useContext(DialogContext);
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

export function DialogHeader(props: ViewProps) {
  return <View style={styles.header} {...props} />;
}

export function DialogFooter(props: ViewProps) {
  return <View style={styles.footer} {...props} />;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <Text style={styles.description}>{children}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 20,
    backgroundColor: "#151A22",
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  description: {
    color: "#8C98A8",
    fontSize: 13,
  },
});
