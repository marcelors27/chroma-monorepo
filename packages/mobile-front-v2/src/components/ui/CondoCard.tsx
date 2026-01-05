import { Pressable, Text, View } from "react-native";
import { Building2, MapPin, Users, Settings, ChevronRight } from "lucide-react-native";

interface CondoCardProps {
  id: string;
  name: string;
  address: string;
  units: number;
  role: string;
  onEdit?: () => void;
  onClick?: () => void;
}

export function CondoCard({ name, address, units, role, onEdit, onClick }: CondoCardProps) {
  return (
    <View className="bg-card rounded-2xl overflow-hidden">
      <Pressable onPress={onClick} className="flex-row items-start gap-3 p-4">
        <View className="p-3 rounded-xl bg-primary/20">
          <Building2 color="hsl(220 10% 50%)" size={22} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="font-semibold text-foreground">{name}</Text>
            <View className="px-2 py-0.5 rounded-full bg-primary/20">
              <Text className="text-[10px] font-semibold text-primary">{role}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1">
            <MapPin color="hsl(215 15% 55%)" size={12} />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View className="flex-row items-center gap-1 mt-1">
            <Users color="hsl(215 15% 55%)" size={12} />
            <Text className="text-xs text-muted-foreground">{units} unidades</Text>
          </View>
        </View>

        <ChevronRight color="hsl(215 15% 55%)" size={18} />
      </Pressable>

      <View className="border-t border-border px-4 py-2">
        <Pressable onPress={onEdit} className="flex-row items-center gap-2">
          <Settings color="hsl(215 15% 55%)" size={14} />
          <Text className="text-xs text-muted-foreground">Configurações</Text>
        </Pressable>
      </View>
    </View>
  );
}
