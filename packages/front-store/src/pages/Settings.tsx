import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User,
  Phone,
  Mail,
  Lock,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import condosBg from "@/assets/condos-bg.jpg";
import { getCustomerMe, updateCustomerMe, updatePassword } from "@/lib/medusa";

const Settings = () => {
  const { toast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [customerMetadata, setCustomerMetadata] = useState<Record<string, any>>({});
  
  // User profile data
  const [profileData, setProfileData] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    telefone: "",
    cargo: "",
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    let mounted = true;
    getCustomerMe()
      .then((data) => {
        if (!mounted) return;
        const customer = data?.customer;
        if (!customer) return;
        const metadata = customer.metadata || {};
        setCustomerMetadata(metadata);
        setProfileData({
          nome: customer.first_name || "",
          sobrenome: customer.last_name || "",
          email: customer.email || "",
          telefone: formatPhone(customer.phone || metadata.telefone || ""),
          cargo: metadata.cargo || "",
        });
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setProfileData({ ...profileData, telefone: formatted });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.nome || !profileData.email) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingProfile(true);
      const phoneDigits = profileData.telefone.replace(/\D/g, "");
      const payload = {
        first_name: profileData.nome,
        last_name: profileData.sobrenome || undefined,
        phone: phoneDigits || undefined,
        metadata: {
          ...customerMetadata,
          cargo: profileData.cargo || undefined,
          telefone: profileData.telefone || undefined,
        },
      };
      const updated = await updateCustomerMe(payload);
      setCustomerMetadata(updated?.customer?.metadata || customerMetadata);
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram salvos com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível atualizar seus dados.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.senhaAtual || !passwordData.novaSenha || !passwordData.confirmarSenha) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingPassword(true);
      await updatePassword({
        old_password: passwordData.senhaAtual,
        password: passwordData.novaSenha,
      });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      setPasswordData({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao alterar senha",
        description: err?.message || "Não foi possível atualizar sua senha.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie seus dados pessoais e segurança
          </p>
        </div>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="perfil" className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="gap-2">
              <Lock className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações de contato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        placeholder="Seu nome"
                        className="h-12 border-2"
                        value={profileData.nome}
                        onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sobrenome">Sobrenome</Label>
                      <Input
                        id="sobrenome"
                        placeholder="Seu sobrenome"
                        className="h-12 border-2"
                        value={profileData.sobrenome}
                        onChange={(e) => setProfileData({ ...profileData, sobrenome: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="h-12 border-2 pl-10"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telefone"
                        placeholder="(00) 00000-0000"
                        className="h-12 border-2 pl-10"
                        value={profileData.telefone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo / Função</Label>
                    <Input
                      id="cargo"
                      placeholder="Ex: Síndico, Administrador"
                      className="h-12 border-2"
                      value={profileData.cargo}
                      onChange={(e) => setProfileData({ ...profileData, cargo: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSavingProfile}>
                    <Save className="h-4 w-4" />
                    {isSavingProfile ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguranca">
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="senhaAtual">Senha Atual</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="senhaAtual"
                        type={showPasswords.atual ? "text" : "password"}
                        placeholder="Digite sua senha atual"
                        className="h-12 border-2 pl-10 pr-10"
                        value={passwordData.senhaAtual}
                        onChange={(e) => setPasswordData({ ...passwordData, senhaAtual: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPasswords({ ...showPasswords, atual: !showPasswords.atual })}
                      >
                        {showPasswords.atual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="novaSenha">Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="novaSenha"
                        type={showPasswords.nova ? "text" : "password"}
                        placeholder="Digite a nova senha"
                        className="h-12 border-2 pl-10 pr-10"
                        value={passwordData.novaSenha}
                        onChange={(e) => setPasswordData({ ...passwordData, novaSenha: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPasswords({ ...showPasswords, nova: !showPasswords.nova })}
                      >
                        {showPasswords.nova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmarSenha"
                        type={showPasswords.confirmar ? "text" : "password"}
                        placeholder="Confirme a nova senha"
                        className="h-12 border-2 pl-10 pr-10"
                        value={passwordData.confirmarSenha}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmarSenha: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPasswords({ ...showPasswords, confirmar: !showPasswords.confirmar })}
                      >
                        {showPasswords.confirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSavingPassword}>
                    <Lock className="h-4 w-4" />
                    {isSavingPassword ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-2 border-border mt-6">
              <CardHeader>
                <CardTitle>Sessão</CardTitle>
                <CardDescription>
                  Gerencie sua sessão de login
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Sair de todos os dispositivos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
