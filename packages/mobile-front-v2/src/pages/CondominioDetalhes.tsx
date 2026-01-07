import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Building2, DollarSign, Users, Send } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "@/lib/toast";
import { createCompany, listCompanies, updateCompany } from "@/lib/medusa";

type CondoForm = {
  id?: string;
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
};

const emptyForm: CondoForm = {
  name: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
  units: 0,
  floors: 0,
  parkingSpots: 0,
  role: "Síndico",
  cnpj: "",
  phone: "",
  email: "",
  adminName: "",
  adminPhone: "",
  monthlyFee: 0,
  foundedAt: "",
  notes: "",
};

export default function CondominioDetalhes() {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const id = (route.params as { id?: string } | undefined)?.id;
  const isNew = !id;
  const { data } = useQuery({ queryKey: ["companies"], queryFn: listCompanies });

  const company = useMemo(() => {
    if (!id) return null;
    return (data?.companies || []).find((item: any) => item.id === id) || null;
  }, [data, id]);

  const [isEditing, setIsEditing] = useState(isNew);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState<CondoForm>(emptyForm);

  useEffect(() => {
    if (!company) {
      setFormData(emptyForm);
      return;
    }
    setFormData({
      id: company.id,
      name: company.fantasy_name || company.trade_name || company.name || "",
      address: company.metadata?.address || "",
      neighborhood: company.metadata?.neighborhood || "",
      city: company.metadata?.city || "",
      state: company.metadata?.state || "",
      zip: company.metadata?.zip || "",
      units: Number(company.metadata?.units) || 0,
      floors: Number(company.metadata?.floors) || 0,
      parkingSpots: Number(company.metadata?.parkingSpots) || 0,
      role: company.metadata?.role || "Síndico",
      cnpj: company.cnpj || "",
      phone: company.metadata?.phone || "",
      email: company.metadata?.email || "",
      adminName: company.metadata?.adminName || "",
      adminPhone: company.metadata?.adminPhone || "",
      monthlyFee: Number(company.metadata?.monthlyFee) || 0,
      foundedAt: company.metadata?.foundedAt || "",
      notes: company.metadata?.notes || "",
    });
  }, [company]);

  const handleChange = (field: keyof CondoForm, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cnpj) {
      toast.error("Nome e CNPJ são obrigatórios.");
      return;
    }

    const payload = {
      name: formData.name,
      cnpj: formData.cnpj.replace(/\D/g, ""),
      trade_name: formData.name,
      fantasy_name: formData.name,
      metadata: {
        address: formData.address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        units: formData.units,
        floors: formData.floors,
        parkingSpots: formData.parkingSpots,
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
        adminName: formData.adminName,
        adminPhone: formData.adminPhone,
        monthlyFee: formData.monthlyFee,
        foundedAt: formData.foundedAt,
        notes: formData.notes,
      },
    };

    try {
      if (formData.id) {
        await updateCompany(formData.id, payload);
        toast.success("Dados do condomínio atualizados!");
      } else {
        await createCompany(payload);
        toast.success("Condomínio cadastrado! Aguardando aprovação.");
        navigation.goBack();
      }
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar.");
    }
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
      <Header title={formData.name || "Novo condomínio"} showBackButton showCondoSelector />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Building2 color="hsl(220 10% 50%)" size={28} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>{formData.name || "Condomínio"}</Text>
              <Text style={styles.summarySubtitle}>{formData.address || "Endereço não informado"}</Text>
              <View style={styles.summaryRoleBadge}>
                <Text style={styles.summaryRoleText}>{formData.role || "Síndico"}</Text>
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
          <Label>Nome</Label>
          <Input
            value={formData.name}
            editable={isEditing}
            onChangeText={(value) => handleChange("name", value)}
            marginTop={4}
          />
          <Label marginTop={12}>CNPJ</Label>
          <Input
            value={formData.cnpj}
            editable={isEditing}
            onChangeText={(value) => handleChange("cnpj", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Endereço</Label>
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

        {!isNew && (
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger>
              <View style={styles.transferRow}>
                <Button width="100%">Transferir responsabilidade</Button>
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
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
    fontWeight: "600",
  },
  summarySubtitle: {
    color: "#8C98A8",
    fontSize: 12,
    marginTop: 6,
  },
  summaryRoleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(93, 162, 230, 0.2)",
    marginTop: 8,
  },
  summaryRoleText: {
    color: "#5DA2E6",
    fontSize: 10,
    fontWeight: "600",
  },
  summaryStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryStatValue: {
    color: "#E6E8EA",
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  transferRow: {
    marginTop: 20,
  },
  dialogButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dialogButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
