import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { PressableProps, ViewProps } from "react-native";

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

export function DropdownMenuTrigger({
  children,
  asChild,
  ...props
}: PressableProps & { asChild?: boolean }) {
  const context = useContext(DropdownContext);
  if (!context) {
    return null;
  }
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<PressableProps>;
    return React.cloneElement(child, {
      onPress: (event) => {
        child.props.onPress?.(event);
        context.setOpen(true);
      },
    });
  }

  return (
    <Pressable onPress={() => context.setOpen(true)} {...props}>
      {children}
    </Pressable>
  );
}

export function DropdownMenuContent({
  children,
  style,
}: ViewProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    return null;
  }

  return (
    <Modal transparent visible={context.open} animationType="fade" onRequestClose={() => context.setOpen(false)}>
      <View style={styles.overlay}>
        <View style={[styles.content, style]}>{children}</View>
      </View>
    </Modal>
  );
}

export function DropdownMenuItem({
  children,
  onPress,
  style,
}: PressableProps & { children: React.ReactNode }) {
  const context = useContext(DropdownContext);
  return (
    <Pressable
      style={[styles.item, style]}
      onPress={(event) => {
        onPress?.(event);
        context?.setOpen(false);
      }}
    >
      {typeof children === "string" ? <Text style={styles.itemText}>{children}</Text> : children}
    </Pressable>
  );
}

export function DropdownMenuSeparator(props: ViewProps) {
  return <View style={styles.separator} {...props} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 16,
  },
  content: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: "#151A22",
    padding: 8,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  itemText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(46, 54, 68, 0.6)",
    marginVertical: 8,
  },
});
