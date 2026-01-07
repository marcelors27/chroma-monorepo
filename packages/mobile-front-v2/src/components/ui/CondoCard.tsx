import { Pressable, StyleSheet, Text, View } from "react-native";
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
    <View style={styles.card}>
      <Pressable onPress={onClick} style={styles.cardContent}>
        <View style={styles.iconWrap}>
          <Building2 color="hsl(220 10% 50%)" size={22} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MapPin color="hsl(215 15% 55%)" size={12} />
            <Text style={styles.metaText} numberOfLines={1}>
              {address}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Users color="hsl(215 15% 55%)" size={12} />
            <Text style={styles.metaText}>{units} unidades</Text>
          </View>
        </View>

        <ChevronRight color="hsl(215 15% 55%)" size={18} />
      </Pressable>

      <View style={styles.footer}>
        <Pressable onPress={onEdit} style={styles.footerRow}>
          <Settings color="hsl(215 15% 55%)" size={14} />
          <Text style={styles.footerText}>Configurações</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  iconWrap: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  title: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    minWidth: 0,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    marginTop: 4,
  },
  roleText: {
    color: "#5DA2E6",
    fontSize: 10,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    color: "#8C98A8",
    fontSize: 11,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    color: "#8C98A8",
    fontSize: 11,
  },
});
