import { ChevronDown, Building2, Check, ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NotificationPanel } from "@/components/ui/NotificationPanel";
import { useCondo } from "@/contexts/CondoContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNotification?: boolean;
  showCondoSelector?: boolean;
  showBackButton?: boolean;
}

export function Header({
  title,
  subtitle,
  showNotification = true,
  showCondoSelector = false,
  showBackButton = false,
}: HeaderProps) {
  const navigation = useNavigation();
  const { condos, activeCondo, setActiveCondo, isAllCondos, setAllCondos } = useCondo();

  const displayName = isAllCondos ? "Condomínio não selecionado" : activeCondo?.name || "Selecionar";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBackButton && (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>
        )}
        <View style={styles.titleBlock}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.title}>
            {title || (
              <>
                <Text style={styles.titleAccent}>Chroma</Text> Store
              </>
            )}
          </Text>

          {showCondoSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Pressable style={styles.condoRow}>
                  <Building2 color="#8C98A8" size={14} />
                  <Text style={styles.condoText}>{displayName}</Text>
                  <ChevronDown color="#8C98A8" size={16} />
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent style={{ width: 256 }}>
                <DropdownMenuItem
                  onPress={setAllCondos}
                  style={[styles.dropdownItemRow, isAllCondos && styles.dropdownItemActive]}
                >
                  <View style={styles.dropdownItemContent}>
                  {isAllCondos && <Check color="hsl(220 10% 50%)" size={16} />}
                  {!isAllCondos && <Building2 color="hsl(215 15% 55%)" size={16} />}
                    <Text style={[styles.dropdownItemText, isAllCondos && styles.dropdownItemTextActive]}>
                      Condomínio não selecionado
                    </Text>
                  </View>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {condos.map((condo) => (
                  <DropdownMenuItem
                    key={condo.id}
                    onPress={() => setActiveCondo(condo)}
                    style={[
                      styles.dropdownItemRow,
                      activeCondo?.id === condo.id && styles.dropdownItemActive,
                    ]}
                  >
                    <View style={styles.dropdownItemContent}>
                      {activeCondo?.id === condo.id && (
                        <Check color="hsl(220 10% 50%)" size={16} />
                      )}
                      <View style={styles.dropdownItemStack}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            activeCondo?.id === condo.id && styles.dropdownItemTextActive,
                          ]}
                        >
                          {condo.name}
                        </Text>
                        <Text style={styles.dropdownItemSubtitle}>{condo.address}</Text>
                      </View>
                    </View>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </View>
        
        {showNotification && <NotificationPanel />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(18, 22, 28, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(55, 63, 77, 0.6)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
  },
  titleBlock: {
    flex: 1,
  },
  subtitle: {
    color: "#8C98A8",
    fontSize: 13,
    marginBottom: 4,
  },
  title: {
    color: "#E6E8EA",
    fontSize: 26,
    fontWeight: "700",
  },
  titleAccent: {
    color: "#5DA2E6",
  },
  condoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  condoText: {
    color: "#8C98A8",
    fontSize: 14,
  },
  dropdownItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownItemText: {
    color: "#E6E8EA",
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: "#F3F6FA",
    fontWeight: "600",
  },
  dropdownItemActive: {
    backgroundColor: "rgba(93, 162, 230, 0.12)",
  },
  dropdownItemStack: {
    flex: 1,
  },
  dropdownItemTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownItemSubtitle: {
    color: "#8C98A8",
    fontSize: 11,
  },
});
