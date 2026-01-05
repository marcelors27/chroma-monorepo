import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}

const sortOptions = [
  { id: "relevance", label: "Relevância" },
  { id: "price_asc", label: "Menor preço" },
  { id: "price_desc", label: "Maior preço" },
  { id: "name", label: "Nome A-Z" },
] as const;

export function ProductFiltersSheet({ filters, onFiltersChange, maxPrice = 2000 }: ProductFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

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
        <View className="relative p-3 rounded-full bg-card border border-border">
          <SlidersHorizontal color="hsl(215 15% 55%)" size={16} />
          {hasActiveFilters && <View className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent" />}
        </View>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <Text className="text-lg font-bold text-foreground">Filtros</Text>
        </SheetHeader>

        <View className="space-y-6 flex-1 pb-4">
          <View>
            <Text className="text-sm font-semibold text-foreground mb-3">Ordenar por</Text>
            <View className="flex-row flex-wrap gap-2">
              {sortOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, sortBy: option.id }))}
                  className={cn(
                    "px-4 py-2.5 rounded-xl",
                    localFilters.sortBy === option.id ? "bg-primary" : "bg-secondary",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium",
                      localFilters.sortBy === option.id ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-semibold text-foreground mb-3">Faixa de preço</Text>
            <View className="px-2">
              <Slider
                value={localFilters.priceRange[1]}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({ ...prev, priceRange: [prev.priceRange[0], value] }))
                }
                maximumValue={maxPrice}
                minimumValue={0}
                step={10}
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-sm text-muted-foreground">
                  R$ {localFilters.priceRange[0].toLocaleString("pt-BR")}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  R$ {localFilters.priceRange[1].toLocaleString("pt-BR")}
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-3">
            <Pressable className="flex-row items-center gap-3 p-3 rounded-xl bg-secondary">
              <Checkbox
                checked={localFilters.onlyDiscounted}
                onCheckedChange={(checked) =>
                  setLocalFilters((prev) => ({ ...prev, onlyDiscounted: checked === true }))
                }
              />
              <View>
                <Text className="text-sm font-medium text-foreground">Apenas com desconto</Text>
                <Text className="text-xs text-muted-foreground">Exibir somente produtos em promoção</Text>
              </View>
            </Pressable>

            <Pressable className="flex-row items-center gap-3 p-3 rounded-xl bg-secondary">
              <Checkbox
                checked={localFilters.inStock}
                onCheckedChange={(checked) =>
                  setLocalFilters((prev) => ({ ...prev, inStock: checked === true }))
                }
              />
              <View>
                <Text className="text-sm font-medium text-foreground">Em estoque</Text>
                <Text className="text-xs text-muted-foreground">Exibir somente produtos disponíveis</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <SheetFooter className="gap-3 pt-4 border-t border-border">
          <Button variant="outline" onPress={handleReset} className="flex-1">
            Limpar filtros
          </Button>
          <Button onPress={handleApply} className="flex-1">
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
