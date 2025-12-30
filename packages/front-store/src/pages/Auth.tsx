import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hexagon, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import authBg from "@/assets/auth-bg.jpg";
import {
  completeSocialAuth,
  listCompanies,
  login,
  registerStore,
  startSocialAuth,
} from "@/lib/medusa";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "register");
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "register");
  }, [searchParams]);

  const handleLoginSuccess = async () => {
    try {
      const { companies } = await listCompanies();
      const hasApproved = companies?.some((company) => company?.approved);
      if (!hasApproved) {
        toast({
          title: "Seu acesso está em avaliação",
          description: "Vincule uma empresa para continuar.",
        });
        navigate("/company-link");
        return;
      }
    } catch {}
    toast({
      title: "Login realizado!",
      description: "Redirecionando para o catálogo.",
    });
    navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!isLogin) {
      if (!formData.name) {
        toast({
          title: "Erro",
          description: "Informe seu nome.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        await handleLoginSuccess();
      } else {
        await registerStore(formData.email, formData.password);
        toast({
          title: "Cadastro enviado!",
          description: "Vamos validar seus dados e liberar o catálogo.",
        });
        navigate("/company-link");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível concluir a ação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const provider = searchParams.get("provider");
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!provider || !code) return;

    let active = true;
    const finalize = async () => {
      setIsLoading(true);
      try {
        const token = await completeSocialAuth(provider, { code, state: state || undefined });
        if (!token || !active) return;
        await handleLoginSuccess();
      } catch (err: any) {
        if (!active) return;
        toast({
          title: "Erro no login social",
          description: err?.message || "Não foi possível autenticar.",
          variant: "destructive",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    finalize();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleSocialLogin = async (provider: string) => {
    toast({
      title: "Login Social",
      description: `Conectando com ${provider}...`,
    });
    try {
      setIsLoading(true);
      const callbackUrl = `${window.location.origin}/auth?provider=${provider}`;
      const { location, token } = await startSocialAuth(provider, callbackUrl);
      if (token) {
        await handleLoginSuccess();
        return;
      }
      if (location) {
        window.location.assign(location);
        return;
      }
      throw new Error("Não foi possível iniciar o login social.");
    } catch (err: any) {
      toast({
        title: "Erro no login social",
        description: err?.message || "Não foi possível iniciar o login social.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-20">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <div className="flex items-center gap-2 mb-8">
            <Hexagon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">Chroma</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLogin 
              ? "Entre para acessar sua conta e seus condomínios." 
              : "Cadastre-se e informe os dados da empresa depois."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    className="pl-10 h-12 border-2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 h-12 border-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 border-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 border-2"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-12 border-2"
              onClick={() => handleSocialLogin("google")}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-2"
              onClick={() => handleSocialLogin("github")}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0.5C5.73 0.5.5 5.74.5 12.02c0 5.11 3.29 9.44 7.86 10.97.58.1.79-.26.79-.57v-2.02c-3.2.7-3.88-1.38-3.88-1.38-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.72 0-1.26.45-2.3 1.19-3.11-.12-.3-.52-1.52.11-3.16 0 0 .98-.31 3.21 1.19.93-.26 1.93-.39 2.92-.39.99 0 1.99.13 2.92.39 2.23-1.5 3.21-1.19 3.21-1.19.63 1.64.23 2.86.11 3.16.74.81 1.19 1.85 1.19 3.11 0 4.45-2.69 5.42-5.25 5.71.41.36.78 1.07.78 2.16v3.2c0 .32.21.68.8.57 4.56-1.53 7.85-5.86 7.85-10.97C23.5 5.74 18.27 0.5 12 0.5z"
                />
              </svg>
              GitHub
            </Button>
          </div>

          <p className="text-center mt-8 text-muted-foreground">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative"
        style={{
          backgroundImage: `url(${authBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
        <div className="max-w-md text-foreground relative z-10">
          <Hexagon className="h-16 w-16 mb-8 text-primary" />
          <h2 className="text-4xl font-bold mb-4">
            Gerencie as compras do seu condomínio
          </h2>
          <p className="text-xl text-muted-foreground">
            Centralize pedidos, gerencie múltiplos CNPJs e tenha acesso a produtos exclusivos para condomínios.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
