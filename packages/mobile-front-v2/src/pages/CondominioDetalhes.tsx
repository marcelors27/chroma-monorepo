import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Building2, MapPin, DollarSign, Users, ArrowLeft, Send } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "@/lib/toast";

const mockCondos: Record<
  string,
  {
    id: string;
    name: string;
    address: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
    units: number;
    floors: number;
    parkingSpots: number;
    role: string;
    cnpj: string;
    phone: string;
    email: string;
    adminName: string;
    adminPhone: string;
    monthlyFee: number;
    foundedAt: string;
    notes: string;
  }
> = {
  "1": {
    id: "1",
    name: "Residencial Jardins",
    address: "Rua das Flores, 123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zip: "01234-567",
    units: 48,
    floors: 12,
    parkingSpots: 96,
    role: "Síndico",
    cnpj: "12.345.678/0001-90",
    phone: "(11) 3456-7890",
    email: "contato@residencialjardins.com.br",
    adminName: "Administradora XYZ",
    adminPhone: "(11) 3456-7891",
    monthlyFee: 850.0,
    foundedAt: "2010",
    notes: "Condomínio com área de lazer completa, piscina e salão de festas.",
  },
};

export default function CondominioDetalhes() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = (route.params as { id?: string } | undefined)?.id ?? "1";
  const condoData = mockCondos[id];

  const [isEditing, setIsEditing] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState(condoData);

  if (!condoData || !formData) {
    return (
      <AuthenticatedLayout>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Condomínio não encontrado</Text>
          <Button onPress={() => navigation.goBack()} marginTop={16}>
            Voltar
          </Button>
        </View>
      </AuthenticatedLayout>
    );
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = () => {
    toast.success("Dados do condomínio atualizados!");
    setIsEditing(false);
  };

  const handleTransfer = () => {
    if (!transferEmail) {
      toast.error("Informe o e-mail do usuário");
      return;
    }
    if (!startDate) {
      toast.error("Informe a data de início");
      return;
    }
    toast.success("Transferência agendada com sucesso");
    setTransferOpen(false);
  };

  return (
    <AuthenticatedLayout>
      <Header title={formData.name} showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Building2 color="hsl(220 10% 50%)" size={28} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>{formData.name}</Text>
              <Text style={styles.summarySubtitle}>{formData.address}</Text>
              <View style={styles.summaryRoleBadge}>
                <Text style={styles.summaryRoleText}>{formData.role}</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStat}>
              <Users color="hsl(220 10% 50%)" size={16} />
              <Text style={styles.summaryStatValue}>{formData.units}</Text>
              <Text style={styles.summaryStatLabel}>Unidades</Text>
            </View>
            <View style={styles.summaryStat}>
              <Building2 color="hsl(220 10% 50%)" size={16} />
              <Text style={styles.summaryStatValue}>{formData.floors}</Text>
              <Text style={styles.summaryStatLabel}>Andares</Text>
            </View>
            <View style={styles.summaryStat}>
              <DollarSign color="hsl(220 10% 50%)" size={16} />
              <Text style={styles.summaryStatValue}>R$ {formData.monthlyFee}</Text>
              <Text style={styles.summaryStatLabel}>Taxa mensal</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.cardSpacing]}>
          <Text style={styles.sectionTitle}>Dados principais</Text>
          <Label>Endereço</Label>
          <Input
            value={formData.address}
            editable={isEditing}
            onChangeText={(value) => handleChange("address", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Telefone</Label>
          <Input
            value={formData.phone}
            editable={isEditing}
            onChangeText={(value) => handleChange("phone", value)}
            marginTop={4}
          />
          <Label marginTop={12}>E-mail</Label>
          <Input
            value={formData.email}
            editable={isEditing}
            onChangeText={(value) => handleChange("email", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Observações</Label>
          <Textarea
            value={formData.notes}
            editable={isEditing}
            onChangeText={(value) => handleChange("notes", value)}
            marginTop={4}
            minHeight={120}
          />
          <View style={styles.actionRow}>
            <Button variant={isEditing ? "secondary" : "default"} onPress={() => setIsEditing((prev) => !prev)} flex={1}>
              {isEditing ? "Cancelar" : "Editar"}
            </Button>
            {isEditing && (
              <Button onPress={handleSave} flex={1}>
                Salvar
              </Button>
            )}
          </View>
        </View>

        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogTrigger>
            <View style={styles.transferRow}>
              <Button width="100%">
                Transferir responsabilidade
              </Button>
            </View>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir responsabilidade</DialogTitle>
            </DialogHeader>
            <Label>E-mail do novo responsável</Label>
            <Input value={transferEmail} onChangeText={setTransferEmail} marginTop={4} />
            <Label marginTop={12}>Data de início</Label>
            <CalendarComponent selected={startDate} onSelect={setStartDate} />
            <Label marginTop={12}>Data de término (opcional)</Label>
            <CalendarComponent selected={endDate} onSelect={setEndDate} />
            <DialogFooter>
              <Button onPress={handleTransfer}>
                <View style={styles.dialogButtonRow}>
                  <Send color="white" size={16} />
                  <Text style={styles.dialogButtonText}>Enviar convite</Text>
                </View>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyText: {
    color: "#8C98A8",
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  summaryIcon: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    color: "#E6E8EA",
    fontSize: 18,
    fontWeight: "700",
  },
  summarySubtitle: {
    color: "#8C98A8",
    fontSize: 13,
    marginTop: 4,
  },
  summaryRoleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    alignSelf: "flex-start",
  },
  summaryRoleText: {
    color: "#5DA2E6",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 54, 68, 0.6)",
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatValue: {
    color: "#E6E8EA",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryStatLabel: {
    color: "#8C98A8",
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: "rgba(24, 28, 36, 0.95)",
    borderRadius: 20,
    padding: 16,
  },
  cardSpacing: {
    marginTop: 16,
  },
  sectionTitle: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  transferRow: {
    marginTop: 16,
  },
  dialogButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dialogButtonText: {
    color: "#0B0F14",
    fontSize: 13,
    fontWeight: "600",
  },
});
