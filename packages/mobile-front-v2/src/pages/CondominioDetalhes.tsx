import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Building2, DollarSign, Users, Send, ArrowLeft } from "lucide-react-native";
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
import { beginGlobalLoading } from "@/lib/global-loading";
import { useCondo } from "@/contexts/CondoContext";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";

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
  billingEmails: string;
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
  role: "",
  cnpj: "",
  phone: "",
  email: "",
  billingEmails: "",
  adminName: "",
  adminPhone: "",
  monthlyFee: 0,
  foundedAt: "",
  notes: "",
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export default function CondominioDetalhes() {
  const { terms } = useBusinessTerms();
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();
  const id = (route.params as { id?: string } | undefined)?.id;
  const isNew = !id;
  const { data } = useQuery({ queryKey: ["companies"], queryFn: listCompanies });
  const { hasApprovedCondo } = useCondo();
  const isFirstAccess = !hasApprovedCondo;

  const company = useMemo(() => {
    if (!id) return null;
    return (data?.companies || []).find((item: any) => item.id === id) || null;
  }, [data, id]);

  const [isEditing, setIsEditing] = useState(isNew);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const defaultForm = useMemo(() => ({ ...emptyForm, role: terms.responsibleLabel }), [terms.responsibleLabel]);
  const [formData, setFormData] = useState<CondoForm>(defaultForm);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const canSaveNew = Boolean(formData.name.trim()) && formData.cnpj.replace(/\D/g, "").length === 14;

  useEffect(() => {
    if (!company) {
      setFormData(defaultForm);
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
      role: company.metadata?.role || terms.responsibleLabel,
      cnpj: company.cnpj || "",
      phone: company.metadata?.phone || "",
      email: company.metadata?.email || "",
      billingEmails: Array.isArray(company.metadata?.billing_emails)
        ? company.metadata.billing_emails.join(", ")
        : company.metadata?.billing_emails || "",
      adminName: company.metadata?.adminName || "",
      adminPhone: company.metadata?.adminPhone || "",
      monthlyFee: Number(company.metadata?.monthlyFee) || 0,
      foundedAt: company.metadata?.foundedAt || "",
      notes: company.metadata?.notes || "",
    });
  }, [company, defaultForm, terms.responsibleLabel]);

  const handleChange = (field: keyof CondoForm, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchCompanyByCNPJ = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;
    if (isLoadingCNPJ) return;
    setIsLoadingCNPJ(true);
    const endLoading = beginGlobalLoading();
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      if (!response.ok) {
        toast.error("CNPJ não encontrado. Verifique os dados.");
        return;
      }
      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        name: data.nome_fantasia || data.razao_social || prev.name,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
        zip: data.cep ? formatCEP(data.cep) : prev.zip,
        phone: data.ddd_telefone_1 ? data.ddd_telefone_1 : prev.phone,
        email: data.email || prev.email,
      }));
      toast.success("Dados do CNPJ preenchidos automaticamente.");
    } catch {
      toast.error("Não foi possível consultar o CNPJ.");
    } finally {
      setIsLoadingCNPJ(false);
      endLoading();
    }
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    if (isLoadingCEP) return;
    setIsLoadingCEP(true);
    const endLoading = beginGlobalLoading();
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`);
      if (!response.ok) {
        toast.error("CEP não encontrado. Verifique os dados.");
        return;
      }
      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        address: data.street || prev.address,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
        zip: data.cep ? formatCEP(data.cep) : prev.zip,
      }));
      toast.success("Endereço preenchido automaticamente.");
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setIsLoadingCEP(false);
      endLoading();
    }
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
    if (formatted.replace(/\D/g, "").length === 14) {
      fetchCompanyByCNPJ(formatted);
    }
  };

  const handleCEPChange = (value: string) => {
    const formatted = formatCEP(value);
    setFormData((prev) => ({ ...prev, zip: formatted }));
    if (formatted.replace(/\D/g, "").length === 8) {
      fetchAddressByCEP(formatted);
    }
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
        billing_emails: formData.billingEmails
          ? formData.billingEmails
              .split(/[;,]+/)
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
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
        toast.success(`Dados ${terms.articleSingular} ${terms.labelLower} atualizados!`);
      } else {
        await createCompany(payload);
        toast.success(`${terms.label} cadastrado! Aguardando aprovação.`);
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
      <Header
        title={formData.name || `Novo ${terms.labelLower}`}
        showBackButton
        showCondoSelector={!isFirstAccess}
      />

      <ScrollView style={styles.scrollContent}>
        {isNew && (
          <Pressable onPress={() => navigation.goBack()} style={styles.backInline}>
            <ArrowLeft color="#E6E8EA" size={16} />
            <Text style={styles.backInlineText}>Voltar</Text>
          </Pressable>
        )}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Building2 color="hsl(220 10% 50%)" size={28} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>{formData.name || terms.label}</Text>
              <Text style={styles.summarySubtitle}>{formData.address || "Endereço não informado"}</Text>
              <View style={styles.summaryRoleBadge}>
                <Text style={styles.summaryRoleText}>{formData.role || terms.responsibleLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStat}>
              <Users color="hsl(220 10% 50%)" size={16} />
              <Text style={styles.summaryStatValue}>{formData.units}</Text>
              <Text style={styles.summaryStatLabel}>{terms.unitLabelPlural}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Building2 color="hsl(220 10% 50%)" size={16} />
              <Text style={styles.summaryStatValue}>{formData.floors}</Text>
              <Text style={styles.summaryStatLabel}>{terms.floorLabelPlural}</Text>
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
          <Label>CNPJ</Label>
          <Input
            value={formData.cnpj}
            editable={isEditing}
            onChangeText={handleCNPJChange}
            marginTop={4}
            placeholder="00.000.000/0000-00"
          />
          <Label>Nome</Label>
          <Input
            value={formData.name}
            editable={isEditing}
            onChangeText={(value) => handleChange("name", value)}
            marginTop={4}
          />
          <Label marginTop={12}>CEP</Label>
          <Input
            value={formData.zip}
            editable={isEditing}
            onChangeText={handleCEPChange}
            marginTop={4}
            placeholder="00000-000"
          />
          <Label marginTop={12}>Endereço</Label>
          <Input
            value={formData.address}
            editable={isEditing}
            onChangeText={(value) => handleChange("address", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Bairro</Label>
          <Input
            value={formData.neighborhood}
            editable={isEditing}
            onChangeText={(value) => handleChange("neighborhood", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Cidade</Label>
          <Input
            value={formData.city}
            editable={isEditing}
            onChangeText={(value) => handleChange("city", value)}
            marginTop={4}
          />
          <Label marginTop={12}>Estado</Label>
          <Input
            value={formData.state}
            editable={isEditing}
            onChangeText={(value) => handleChange("state", value)}
            marginTop={4}
          />
          {!isFirstAccess && (
            <>
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
              <Label marginTop={12}>E-mails para boleto/PIX</Label>
              <Input
                value={formData.billingEmails}
                editable={isEditing}
                onChangeText={(value) => handleChange("billingEmails", value)}
                marginTop={4}
                placeholder="financeiro@estabelecimento.com.br"
              />
              <Label marginTop={12}>Observações</Label>
              <Textarea
                value={formData.notes}
                editable={isEditing}
                onChangeText={(value) => handleChange("notes", value)}
                marginTop={4}
                minHeight={120}
              />
            </>
          )}
          {isNew ? (
            <View style={styles.saveRow}>
              <Button
                onPress={handleSave}
                disabled={!canSaveNew}
                backgroundColor={canSaveNew ? "#5DA2E6" : "rgba(93, 162, 230, 0.35)"}
                opacity={1}
                width="100%"
                textProps={{ color: "#FFFFFF" }}
              >
                Salvar
              </Button>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Button
                variant="outline"
                onPress={() => setIsEditing((prev) => !prev)}
                flex={1}
                borderColor="rgba(93, 162, 230, 0.5)"
                textProps={{ color: "#5DA2E6" }}
              >
                {isEditing ? "Cancelar" : "Editar"}
              </Button>
              {isEditing && (
                <Button
                  onPress={handleSave}
                  flex={1}
                  backgroundColor="#5DA2E6"
                  textProps={{ color: "#FFFFFF" }}
                >
                  Salvar
                </Button>
              )}
            </View>
          )}
        </View>

        {!isNew && (
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger>
              <View style={styles.transferRow}>
                <Button width="100%">{`Transferir ${terms.responsibleLabelLower}`}</Button>
              </View>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{`Transferir ${terms.responsibleLabelLower}`}</DialogTitle>
              </DialogHeader>
              <Label>{`E-mail do novo ${terms.responsibleLabelLower}`}</Label>
              <Input value={transferEmail} onChangeText={setTransferEmail} marginTop={4} />
              <Label marginTop={12}>Data de início</Label>
              <CalendarComponent selected={startDate} onSelect={setStartDate} />
              <Label marginTop={12}>Data de término (opcional)</Label>
              <CalendarComponent selected={endDate} onSelect={setEndDate} />
              <DialogFooter>
                <Button onPress={handleTransfer} backgroundColor="#5DA2E6" textProps={{ color: "#FFFFFF" }}>
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
  backInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(34, 38, 46, 0.9)",
    marginBottom: 12,
  },
  backInlineText: {
    color: "#E6E8EA",
    fontSize: 13,
    fontWeight: "600",
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
  saveRow: {
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
