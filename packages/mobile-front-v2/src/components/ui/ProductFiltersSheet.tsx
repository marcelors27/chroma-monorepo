import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SlidersHorizontal, X } from "lucide-react-native";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface ProductFilters {
  priceRange: [number, number];
  onlyDiscounted: boolean;
  sortBy: "relevance" | "price_asc" | "price_desc" | "name";
  inStock: boolean;
}

interface ProductFiltersSheetProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  maxPrice?: number;
  triggerStyle?: StyleProp<ViewStyle>;
}

const sortOptions = [
  { id: "relevance", label: "Relevância" },
  { id: "price_asc", label: "Menor preço" },
  { id: "price_desc", label: "Maior preço" },
  { id: "name", label: "Nome A-Z" },
] as const;

export function ProductFiltersSheet({
  filters,
  onFiltersChange,
  maxPrice = 2000,
  triggerStyle,
}: ProductFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [filters, isOpen]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultFilters: ProductFilters = {
      priceRange: [0, maxPrice],
      onlyDiscounted: false,
      sortBy: "relevance",
      inStock: false,
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setIsOpen(false);
  };

  const hasActiveFilters =
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice ||
    filters.onlyDiscounted ||
    filters.inStock ||
    filters.sortBy !== "relevance";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger>
        <View style={[styles.trigger, triggerStyle]}>
          <SlidersHorizontal color="hsl(215 15% 55%)" size={16} />
          {hasActiveFilters && <View style={styles.activeBadge} />}
        </View>
      </SheetTrigger>
      <SheetContent side="bottom" style={styles.sheetContent}>
        <SheetHeader style={styles.sheetHeader}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Filtros</Text>
            <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
              <X color="#98A3B5" size={18} />
            </Pressable>
          </View>
        </SheetHeader>

        <View style={styles.contentBody}>
          <View>
            <Text style={styles.sectionTitle}>Ordenar por</Text>
            <View style={styles.sortGrid}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, sortBy: option.id }))}
                  style={[
                    styles.sortOption,
                    localFilters.sortBy === option.id ? styles.sortOptionActive : styles.sortOptionIdle,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      localFilters.sortBy === option.id ? styles.sortOptionTextActive : styles.sortOptionTextIdle,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.sectionTitle}>Faixa de preço</Text>
            <View style={styles.priceTrack}>
              <Text style={styles.rangeLabel}>Mínimo</Text>
              <Slider
                value={localFilters.priceRange[0]}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceRange: [Math.min(value, prev.priceRange[1]), prev.priceRange[1]],
                  }))
                }
                maximumValue={localFilters.priceRange[1]}
                minimumValue={0}
                step={10}
              />
              <Text style={styles.rangeValue}>
                R$ {localFilters.priceRange[0].toLocaleString("pt-BR")}
              </Text>
              <View style={styles.rangeDivider} />
              <Text style={styles.rangeLabel}>Máximo</Text>
              <Slider
                value={localFilters.priceRange[1]}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], Math.max(value, prev.priceRange[0])],
                  }))
                }
                maximumValue={maxPrice}
                minimumValue={localFilters.priceRange[0]}
                step={10}
              />
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  R$ {localFilters.priceRange[0].toLocaleString("pt-BR")}
                </Text>
                <Text style={styles.priceLabel}>
                  R$ {localFilters.priceRange[1].toLocaleString("pt-BR")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.checkboxGroup}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() =>
                setLocalFilters((prev) => ({ ...prev, onlyDiscounted: !prev.onlyDiscounted }))
              }
            >
              <Checkbox
                checked={localFilters.onlyDiscounted}
                onCheckedChange={(checked) =>
                  setLocalFilters((prev) => ({ ...prev, onlyDiscounted: checked === true }))
                }
              />
              <View>
                <Text style={styles.checkboxTitle}>Apenas com desconto</Text>
                <Text style={styles.checkboxDescription}>Exibir somente produtos em promoção</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setLocalFilters((prev) => ({ ...prev, inStock: !prev.inStock }))}
            >
              <Checkbox
                checked={localFilters.inStock}
                onCheckedChange={(checked) =>
                  setLocalFilters((prev) => ({ ...prev, inStock: checked === true }))
                }
              />
              <View>
                <Text style={styles.checkboxTitle}>Em estoque</Text>
                <Text style={styles.checkboxDescription}>Exibir somente produtos disponíveis</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <SheetFooter style={styles.footer}>
          <View style={styles.footerSpacer} />
          <Button
            onPress={handleApply}
            style={[styles.actionButton, styles.applyButton]}
            textProps={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600", textAlign: "center" }}
          >
            Aplicar filtros
          </Button>
          <View style={styles.buttonGap} />
          <Button
            onPress={handleReset}
            style={[styles.actionButton, styles.clearButton]}
            textProps={{ color: "#E6E8EA", fontSize: 13, fontWeight: "600", textAlign: "center" }}
          >
            Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(24, 28, 36, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(72, 80, 94, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#5DA2E6",
  },
  sheetContent: {
    height: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  headerSpacer: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    color: "#E6E8EA",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  contentBody: {
    flex: 1,
    paddingBottom: 16,
    gap: 24,
  },
  sortGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sortOption: {
    flexBasis: "48%",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sortOptionActive: {
    backgroundColor: "rgba(124, 135, 150, 0.75)",
    borderWidth: 2,
    borderColor: "#5DA2E6",
  },
  sortOptionIdle: {
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(52, 60, 74, 0.8)",
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: "#FFFFFF",
  },
  sortOptionTextIdle: {
    color: "#CBD2DB",
  },
  priceLabel: {
    color: "#8C98A8",
    fontSize: 12,
  },
  rangeLabel: {
    color: "#8C98A8",
    fontSize: 12,
    marginBottom: 6,
  },
  rangeValue: {
    color: "#CBD2DB",
    fontSize: 12,
    marginTop: 6,
  },
  priceTrack: {
    paddingHorizontal: 8,
  },
  rangeDivider: {
    height: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(52, 60, 74, 0.8)",
  },
  checkboxTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  checkboxDescription: {
    color: "#8C98A8",
    fontSize: 11,
    marginTop: 2,
  },
  actionButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButton: {
    backgroundColor: "#7F8898",
  },
  clearButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2E3644",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.8)",
    paddingTop: 16,
    flexDirection: "column",
  },
  footerSpacer: {
    height: 12,
  },
  buttonGap: {
    height: 12,
  },
});
