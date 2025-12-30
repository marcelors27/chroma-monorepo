import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2,
  Edit2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Home,
  Loader2,
  Hexagon,
  ArrowLeftRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCNPJ, validateCNPJ } from "@/lib/cnpj";
import { createCompany, listCompanies, updateCompany, transferCompany } from "@/lib/medusa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import condosBg from "@/assets/condos-bg.jpg";

interface Condo {
  id: string;
  // Dados Básicos
  name: string;
  cnpj: string;
  razaoSocial: string;
  approved?: boolean;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  // Endereço
  cep: string;
  address: string;
  numero: string;
  complemento: string;
  bairro: string;
  city: string;
  state: string;
  // Contato
  phone: string;
  email: string;
  website: string;
  administradoraEmail: string;
  // Dados do Prédio
  totalUnidades: string;
  totalBlocos: string;
  totalAndares: string;
  areaTotal: string;
  anoConstucao: string;
  sindico: string;
  administradora: string;
  observacoes: string;
}

const emptyFormData: Omit<Condo, 'id'> = {
  name: "",
  cnpj: "",
  razaoSocial: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  cep: "",
  address: "",
  numero: "",
  complemento: "",
  bairro: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  administradoraEmail: "",
  totalUnidades: "",
  totalBlocos: "",
  totalAndares: "",
  areaTotal: "",
  anoConstucao: "",
  sindico: "",
  administradora: "",
  observacoes: "",
};

const Condos = () => {
  const { toast } = useToast();
  const [condos, setCondos] = useState<Condo[]>([]);
  const [isLoadingCondos, setIsLoadingCondos] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condo | null>(null);
  const [formData, setFormData] = useState<Omit<Condo, 'id'>>(emptyFormData);
  const [condoToDelete, setCondoToDelete] = useState<string | null>(null);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferCondo, setTransferCondo] = useState<Condo | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferStartDate, setTransferStartDate] = useState("");
  const [transferEndDate, setTransferEndDate] = useState("");
  const [transferPermanent, setTransferPermanent] = useState(false);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);

  const mapCompanyToCondo = (company: any): Condo => {
    const metadata = company?.metadata || {};
    return {
      id: company.id,
      name: company.fantasy_name || company.trade_name || metadata.name || "Condomínio",
      cnpj: company.cnpj || metadata.cnpj || "",
      razaoSocial: company.trade_name || metadata.razaoSocial || "",
      approved: Boolean(company.approved),
      inscricaoEstadual: metadata.inscricaoEstadual || "",
      inscricaoMunicipal: metadata.inscricaoMunicipal || "",
      cep: metadata.cep || "",
      address: metadata.address || "",
      numero: metadata.numero || "",
      complemento: metadata.complemento || "",
      bairro: metadata.bairro || "",
      city: metadata.city || "",
      state: metadata.state || "",
      phone: metadata.phone || "",
      email: metadata.email || "",
      website: metadata.website || "",
      administradoraEmail: metadata.administradoraEmail || "",
      totalUnidades: metadata.totalUnidades || "",
      totalBlocos: metadata.totalBlocos || "",
      totalAndares: metadata.totalAndares || "",
      areaTotal: metadata.areaTotal || "",
      anoConstucao: metadata.anoConstucao || "",
      sindico: metadata.sindico || "",
      administradora: metadata.administradora || "",
      observacoes: metadata.observacoes || "",
    };
  };

  const buildCompanyMetadata = (data: Omit<Condo, "id">) => ({
    name: data.name,
    razaoSocial: data.razaoSocial,
    inscricaoEstadual: data.inscricaoEstadual,
    inscricaoMunicipal: data.inscricaoMunicipal,
    cep: data.cep,
    address: data.address,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    city: data.city,
    state: data.state,
    phone: data.phone,
    email: data.email,
    website: data.website,
    administradoraEmail: data.administradoraEmail,
    totalUnidades: data.totalUnidades,
    totalBlocos: data.totalBlocos,
    totalAndares: data.totalAndares,
    areaTotal: data.areaTotal,
    anoConstucao: data.anoConstucao,
    sindico: data.sindico,
    administradora: data.administradora,
    observacoes: data.observacoes,
  });

  useEffect(() => {
    let mounted = true;
    setIsLoadingCondos(true);
    listCompanies()
      .then((data) => {
        if (!mounted) return;
        const mapped = (data?.companies || []).map(mapCompanyToCondo);
        setCondos(mapped);
      })
      .catch((err: any) => {
        if (!mounted) return;
        toast({
          title: "Erro ao carregar condomínios",
          description: err?.message || "Tente novamente em instantes.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingCondos(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const fetchCompanyByCNPJ = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return;

    setIsLoadingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        toast({
          title: "CNPJ não encontrado",
          description: "Verifique o CNPJ informado ou tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        name: data.nome_fantasia || data.razao_social || prev.name,
        razaoSocial: data.razao_social || "",
        cep: data.cep ? formatCEP(data.cep) : prev.cep,
        address: data.logradouro || prev.address,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
        phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : prev.phone,
        email: data.email || prev.email,
      }));

      toast({
        title: "Empresa encontrada",
        description: `${data.razao_social} - Dados preenchidos automaticamente.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao consultar CNPJ",
        description: "Não foi possível consultar os dados da empresa.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleCNPJChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
    
    // Auto-fetch when CNPJ is complete (14 digits)
    if (formatted.replace(/\D/g, "").length === 14) {
      await fetchCompanyByCNPJ(formatted);
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        address: data.logradouro || "",
        bairro: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        complemento: data.complemento || prev.complemento,
      }));

      toast({
        title: "Endereço encontrado",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFormData({ ...formData, cep: formatted });
    
    // Auto-fetch when CEP is complete
    if (formatted.replace(/\D/g, "").length === 8) {
      await fetchAddressByCEP(formatted);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const openEditDialog = (condo: Condo) => {
    setEditingCondo(condo);
    const { id, ...rest } = condo;
    setFormData(rest);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingCondo(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cnpj) {
      toast({
        title: "Erro",
        description: "Preencha nome e CNPJ.",
        variant: "destructive",
      });
      return;
    }

    if (!validateCNPJ(formData.cnpj)) {
      toast({
        title: "CNPJ inválido",
        description: "Verifique o CNPJ informado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        trade_name: formData.razaoSocial || formData.name,
        fantasy_name: formData.name,
        cnpj: formData.cnpj.replace(/\D/g, ""),
        metadata: buildCompanyMetadata(formData),
      };

      if (editingCondo) {
        const updated = await updateCompany(editingCondo.id, payload);
        const updatedCondo = mapCompanyToCondo(updated.company);
        setCondos((prev) => prev.map((c) => (c.id === updatedCondo.id ? updatedCondo : c)));
        toast({
          title: "Condomínio atualizado!",
          description: `${formData.name} foi atualizado com sucesso.`,
        });
      } else {
        const created = await createCompany(payload);
        const createdCondo = mapCompanyToCondo(created.company);
        setCondos((prev) => [...prev, createdCondo]);
        toast({
          title: "Condomínio adicionado!",
          description: `${formData.name} foi cadastrado com sucesso.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar condomínio",
        description: error?.message || "Não foi possível salvar os dados do condomínio.",
        variant: "destructive",
      });
      return;
    }

    setFormData(emptyFormData);
    setEditingCondo(null);
    setIsDialogOpen(false);
  };

  const confirmDelete = (id: string) => {
    if (condos.length === 1) {
      toast({
        title: "Não permitido",
        description: "Você precisa ter pelo menos um condomínio cadastrado.",
        variant: "destructive",
      });
      return;
    }
    setCondoToDelete(id);
  };

  const handleDelete = () => {
    if (!condoToDelete) return;
    
    const condoName = condos.find(c => c.id === condoToDelete)?.name;
    setCondos(condos.filter(c => c.id !== condoToDelete));
    setCondoToDelete(null);
    toast({
      title: "Condomínio removido",
      description: `${condoName} foi removido da sua conta.`,
    });
  };

  const resetTransferForm = () => {
    setTransferEmail("");
    setTransferStartDate("");
    setTransferEndDate("");
    setTransferPermanent(false);
  };

  const openTransferDialog = (condo: Condo) => {
    setTransferCondo(condo);
    resetTransferForm();
    setIsTransferDialogOpen(true);
  };

  const handleTransferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transferCondo) return;

    if (!transferEmail.trim()) {
      toast({
        title: "Informe o usuário destino",
        description: "Digite o email da pessoa que vai receber o condomínio.",
        variant: "destructive",
      });
      return;
    }

    if (!transferEndDate && !transferPermanent) {
      toast({
        title: "Confirme a transferência",
        description: "Informe a data final ou confirme a transferência definitiva.",
        variant: "destructive",
      });
      return;
    }

    if (transferStartDate && transferEndDate && transferStartDate > transferEndDate) {
      toast({
        title: "Datas inválidas",
        description: "A data final precisa ser maior que a data inicial.",
        variant: "destructive",
      });
      return;
    }

    setIsTransferSubmitting(true);
    try {
      await transferCompany(transferCondo.id, {
        email: transferEmail.trim(),
        start_date: transferStartDate || undefined,
        end_date: transferEndDate || undefined,
        permanent: !transferEndDate && transferPermanent,
      });

      if (!transferEndDate && transferPermanent) {
        setCondos((prev) => prev.filter((condo) => condo.id !== transferCondo.id));
      }

      toast({
        title: "Transferência enviada",
        description: transferEndDate
          ? `O condomínio ficará disponível até ${transferEndDate}.`
          : "O condomínio foi transferido em definitivo.",
      });
      setIsTransferDialogOpen(false);
      setTransferCondo(null);
      resetTransferForm();
    } catch (error: any) {
      toast({
        title: "Erro na transferência",
        description: error?.message || "Não foi possível transferir o condomínio.",
        variant: "destructive",
      });
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.95)), url(${condosBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meus Condomínios</h1>
            <p className="text-muted-foreground">
              Gerencie os CNPJs e dados cadastrados na sua conta
            </p>
          </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingCondo(null);
                setFormData(emptyFormData);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openNewDialog}>
                  <Plus className="h-4 w-4" />
                  Novo Condomínio
                </Button>
              </DialogTrigger>
              <DialogContent className="border-2 border-border bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {editingCondo ? "Editar Condomínio" : "Adicionar Condomínio"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-4">
                  <Tabs defaultValue="basico" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                      <TabsTrigger value="basico" className="gap-1 text-xs sm:text-sm">
                        <Building2 className="h-4 w-4 hidden sm:block" />
                        Básico
                      </TabsTrigger>
                      <TabsTrigger value="endereco" className="gap-1 text-xs sm:text-sm">
                        <MapPin className="h-4 w-4 hidden sm:block" />
                        Endereço
                      </TabsTrigger>
                      <TabsTrigger value="contato" className="gap-1 text-xs sm:text-sm">
                        <Phone className="h-4 w-4 hidden sm:block" />
                        Contato
                      </TabsTrigger>
                      <TabsTrigger value="predio" className="gap-1 text-xs sm:text-sm">
                        <Home className="h-4 w-4 hidden sm:block" />
                        Prédio
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="basico" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Condomínio *</Label>
                        <Input
                          id="name"
                          placeholder="Ex: Condomínio Residencial Vista Mar"
                          className="h-12 border-2"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="razaoSocial">Razão Social</Label>
                        <Input
                          id="razaoSocial"
                          placeholder="Razão social completa"
                          className="h-12 border-2"
                          value={formData.razaoSocial}
                          onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ *</Label>
                        <div className="relative">
                          <Input
                            id="cnpj"
                            placeholder="00.000.000/0000-00"
                            className="h-12 border-2 pr-10"
                            value={formData.cnpj}
                            onChange={handleCNPJChange}
                            maxLength={18}
                          />
                          {isLoadingCNPJ && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Digite o CNPJ completo para buscar dados automaticamente
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                          <Input
                            id="inscricaoEstadual"
                            placeholder="Número"
                            className="h-12 border-2"
                            value={formData.inscricaoEstadual}
                            onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                          <Input
                            id="inscricaoMunicipal"
                            placeholder="Número"
                            className="h-12 border-2"
                            value={formData.inscricaoMunicipal}
                            onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="endereco" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-1">
                          <Label htmlFor="cep">CEP</Label>
                          <div className="relative">
                            <Input
                              id="cep"
                              placeholder="00000-000"
                              className="h-12 border-2 pr-10"
                              value={formData.cep}
                              onChange={handleCEPChange}
                              maxLength={9}
                            />
                            {isLoadingCEP && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="address">Logradouro</Label>
                          <Input
                            id="address"
                            placeholder="Rua, Avenida, etc."
                            className="h-12 border-2"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numero">Número</Label>
                          <Input
                            id="numero"
                            placeholder="Nº"
                            className="h-12 border-2"
                            value={formData.numero}
                            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input
                            id="complemento"
                            placeholder="Bloco, Apto, etc."
                            className="h-12 border-2"
                            value={formData.complemento}
                            onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                          id="bairro"
                          placeholder="Nome do bairro"
                          className="h-12 border-2"
                          value={formData.bairro}
                          onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            placeholder="São Paulo"
                            className="h-12 border-2"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            placeholder="SP"
                            className="h-12 border-2"
                            maxLength={2}
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="contato" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          placeholder="(00) 00000-0000"
                          className="h-12 border-2"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="contato@condominio.com.br"
                          className="h-12 border-2"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          placeholder="www.condominio.com.br"
                          className="h-12 border-2"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="predio" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalUnidades">Total de Unidades</Label>
                          <Input
                            id="totalUnidades"
                            type="number"
                            placeholder="Ex: 120"
                            className="h-12 border-2"
                            value={formData.totalUnidades}
                            onChange={(e) => setFormData({ ...formData, totalUnidades: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="totalBlocos">Número de Blocos</Label>
                          <Input
                            id="totalBlocos"
                            type="number"
                            placeholder="Ex: 3"
                            className="h-12 border-2"
                            value={formData.totalBlocos}
                            onChange={(e) => setFormData({ ...formData, totalBlocos: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalAndares">Andares por Bloco</Label>
                          <Input
                            id="totalAndares"
                            type="number"
                            placeholder="Ex: 15"
                            className="h-12 border-2"
                            value={formData.totalAndares}
                            onChange={(e) => setFormData({ ...formData, totalAndares: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="areaTotal">Área Total (m²)</Label>
                          <Input
                            id="areaTotal"
                            type="number"
                            placeholder="Ex: 5000"
                            className="h-12 border-2"
                            value={formData.areaTotal}
                            onChange={(e) => setFormData({ ...formData, areaTotal: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="anoConstucao">Ano de Construção</Label>
                          <Input
                            id="anoConstucao"
                            type="number"
                            placeholder="Ex: 2015"
                            className="h-12 border-2"
                            value={formData.anoConstucao}
                            onChange={(e) => setFormData({ ...formData, anoConstucao: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sindico">Síndico</Label>
                          <Input
                            id="sindico"
                            placeholder="Nome do síndico"
                            className="h-12 border-2"
                            value={formData.sindico}
                            onChange={(e) => setFormData({ ...formData, sindico: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="administradora">Administradora</Label>
                        <Input
                          id="administradora"
                          placeholder="Nome da administradora"
                          className="h-12 border-2"
                          value={formData.administradora}
                          onChange={(e) => setFormData({ ...formData, administradora: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="administradoraEmail">E-mail da administradora</Label>
                        <Input
                          id="administradoraEmail"
                          type="email"
                          placeholder="administradora@empresa.com.br"
                          className="h-12 border-2"
                          value={formData.administradoraEmail}
                          onChange={(e) => setFormData({ ...formData, administradoraEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          placeholder="Informações adicionais sobre o condomínio..."
                          className="border-2 min-h-[100px]"
                          value={formData.observacoes}
                          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-4 pt-6 mt-6 border-t-2 border-border">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 border-2"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingCondo ? "Salvar Alterações" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Dialog
            open={isTransferDialogOpen}
            onOpenChange={(open) => {
              setIsTransferDialogOpen(open);
              if (!open) {
                setTransferCondo(null);
                resetTransferForm();
              }
            }}
          >
            <DialogContent className="border-2 border-border bg-card max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl">Transferir condomínio</DialogTitle>
              </DialogHeader>
              <form className="space-y-5" onSubmit={handleTransferSubmit}>
                <div className="space-y-2">
                  <Label>Condomínio</Label>
                  <Input
                    value={transferCondo?.name || ""}
                    className="h-12 border-2"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferEmail">Email do usuário destino</Label>
                  <Input
                    id="transferEmail"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    className="h-12 border-2"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transferStart">Data de início</Label>
                    <Input
                      id="transferStart"
                      type="date"
                      className="h-12 border-2"
                      value={transferStartDate}
                      onChange={(e) => setTransferStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transferEnd">Data final</Label>
                    <Input
                      id="transferEnd"
                      type="date"
                      className="h-12 border-2"
                      value={transferEndDate}
                      onChange={(e) => setTransferEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {!transferEndDate && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={transferPermanent}
                      onCheckedChange={(checked) => setTransferPermanent(checked === true)}
                    />
                    Transferir em definitivo (sem data final).
                  </label>
                )}
                <div className="flex gap-4 pt-4 border-t-2 border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-2"
                    onClick={() => setIsTransferDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isTransferSubmitting}>
                    {isTransferSubmitting ? "Transferindo..." : "Transferir"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Condos List */}
          <div className="space-y-4">
            {isLoadingCondos && (
              <div className="border-2 border-border p-6 bg-card">
                <p className="text-muted-foreground">Carregando condomínios...</p>
              </div>
            )}

            {!isLoadingCondos && condos.length === 0 && (
              <div className="border-2 border-dashed border-border p-8 bg-card text-center">
                <p className="text-muted-foreground">
                  Nenhum condomínio aprovado encontrado.
                </p>
              </div>
            )}

            {!isLoadingCondos &&
              condos.map((condo) => (
                <div 
                  key={condo.id} 
                  className="border-2 border-border p-6 bg-card hover:border-primary transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-secondary border-2 border-border">
                        <Hexagon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-lg">{condo.name}</h3>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 border-2 ${
                              condo.approved
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            {condo.approved ? "Aprovado" : "Em análise"}
                          </span>
                        </div>
                        {condo.razaoSocial && (
                          <p className="text-sm text-muted-foreground">{condo.razaoSocial}</p>
                        )}
                        <p className="text-muted-foreground font-mono">{condo.cnpj}</p>
                        {condo.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {condo.address}, {condo.numero} - {condo.bairro}, {condo.city}/{condo.state}
                          </p>
                        )}
                        {condo.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {condo.phone}
                          </p>
                        )}
                        {condo.totalUnidades && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {condo.totalUnidades} unidades • {condo.totalBlocos} blocos
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-2"
                        onClick={() => openEditDialog(condo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-2"
                        onClick={() => openTransferDialog(condo)}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => confirmDelete(condo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

        {/* Confirm Delete Dialog */}
        <AlertDialog open={!!condoToDelete} onOpenChange={(open) => !open && setCondoToDelete(null)}>
          <AlertDialogContent className="border-2 border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Remover condomínio?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este condomínio da sua conta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-2">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Condos;
