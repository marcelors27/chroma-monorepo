import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground">Condomínio não encontrado</Text>
          <Button onPress={() => navigation.goBack()} className="mt-4">
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

      <ScrollView className="px-4 py-4">
        <View className="bg-card rounded-2xl p-4">
          <View className="flex-row items-start gap-4">
            <View className="p-4 rounded-2xl bg-primary/20">
              <Building2 color="hsl(220 10% 50%)" size={28} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">{formData.name}</Text>
              <Text className="text-sm text-muted-foreground">{formData.address}</Text>
              <View className="mt-2 px-3 py-1 rounded-full bg-primary/20 self-start">
                <Text className="text-xs font-semibold text-primary">{formData.role}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-between mt-4 pt-4 border-t border-border">
            <View className="items-center flex-1">
              <Users color="hsl(220 10% 50%)" size={16} />
              <Text className="text-lg font-bold text-foreground">{formData.units}</Text>
              <Text className="text-[10px] text-muted-foreground">Unidades</Text>
            </View>
            <View className="items-center flex-1">
              <Building2 color="hsl(220 10% 50%)" size={16} />
              <Text className="text-lg font-bold text-foreground">{formData.floors}</Text>
              <Text className="text-[10px] text-muted-foreground">Andares</Text>
            </View>
            <View className="items-center flex-1">
              <DollarSign color="hsl(220 10% 50%)" size={16} />
              <Text className="text-lg font-bold text-foreground">R$ {formData.monthlyFee}</Text>
              <Text className="text-[10px] text-muted-foreground">Taxa mensal</Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-2xl p-4 mt-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Dados principais</Text>
          <Label>Endereço</Label>
          <Input
            value={formData.address}
            editable={isEditing}
            onChangeText={(value) => handleChange("address", value)}
            className="mt-1"
          />
          <Label className="mt-3">Telefone</Label>
          <Input
            value={formData.phone}
            editable={isEditing}
            onChangeText={(value) => handleChange("phone", value)}
            className="mt-1"
          />
          <Label className="mt-3">E-mail</Label>
          <Input
            value={formData.email}
            editable={isEditing}
            onChangeText={(value) => handleChange("email", value)}
            className="mt-1"
          />
          <Label className="mt-3">Observações</Label>
          <Textarea
            value={formData.notes}
            editable={isEditing}
            onChangeText={(value) => handleChange("notes", value)}
            className="mt-1 min-h-[120px]"
          />
          <View className="flex-row gap-2 mt-4">
            <Button variant={isEditing ? "secondary" : "default"} onPress={() => setIsEditing((prev) => !prev)} className="flex-1">
              {isEditing ? "Cancelar" : "Editar"}
            </Button>
            {isEditing && (
              <Button onPress={handleSave} className="flex-1">
                Salvar
              </Button>
            )}
          </View>
        </View>

        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogTrigger>
            <View className="mt-4">
              <Button className="w-full">
                Transferir responsabilidade
              </Button>
            </View>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir responsabilidade</DialogTitle>
            </DialogHeader>
            <Label>E-mail do novo responsável</Label>
            <Input value={transferEmail} onChangeText={setTransferEmail} className="mt-1" />
            <Label className="mt-3">Data de início</Label>
            <CalendarComponent selected={startDate} onSelect={setStartDate} />
            <Label className="mt-3">Data de término (opcional)</Label>
            <CalendarComponent selected={endDate} onSelect={setEndDate} />
            <DialogFooter>
              <Button onPress={handleTransfer}>
                <View className="flex-row items-center gap-2">
                  <Send color="white" size={16} />
                  <Text className="text-primary-foreground">Enviar convite</Text>
                </View>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ScrollView>
    </AuthenticatedLayout>
  );
}
