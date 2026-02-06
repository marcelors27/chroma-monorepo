import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import authBg from "@/assets/auth-bg.jpg";
import logo from "@/assets/logo.png";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  completeSocialAuth,
  listCompanies,
  login,
  registerStore,
  requestPasswordReset,
  startSocialAuth,
} from "@/lib/medusa";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "register");
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  
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
        navigate("/condos?new=1");
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
        navigate("/condos?new=1");
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

  const handlePasswordReset = async () => {
    if (isResetting) return;
    const targetEmail = resetEmail || formData.email;
    if (!targetEmail) {
      toast({
        title: "Erro",
        description: "Informe seu e-mail para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }
    setIsResetting(true);
    try {
      await requestPasswordReset(targetEmail);
      toast({
        title: "Senha enviada!",
        description: "Enviamos uma nova senha para o seu e-mail.",
      });
      setShowReset(false);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível enviar a nova senha.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
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
            <img src={logo} alt="Chroma" className="h-8 w-8" />
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

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    data-testid="auth-name"
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
                  data-testid="auth-email"
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
                  data-testid="auth-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 border-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {isLogin && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-sm"
                  onClick={() => {
                    setShowReset((prev) => !prev);
                    if (!resetEmail && formData.email) {
                      setResetEmail(formData.email);
                    }
                  }}
                >
                  Esqueci minha senha
                </Button>
                {showReset && (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                    <Label htmlFor="reset-email">E-mail de recuperação</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-11 border-2"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handlePasswordReset}
                      disabled={isResetting}
                    >
                      {isResetting ? "Enviando..." : "Enviar nova senha"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    data-testid="auth-confirm-password"
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
              data-testid="auth-submit"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoadingSpinner size={20} />
                  Carregando...
                </span>
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              onClick={() => handleSocialLogin("facebook")}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22 12.06C22 6.56 17.52 2 12 2S2 6.56 2 12.06c0 4.84 3.44 8.88 7.94 9.82v-6.95H7.9v-2.87h2.04V9.9c0-2.02 1.2-3.13 3.02-3.13.88 0 1.8.16 1.8.16v1.98h-1.02c-1 0-1.3.63-1.3 1.27v1.52h2.22l-.36 2.87h-1.86v6.95C18.56 20.94 22 16.9 22 12.06z"
                />
              </svg>
              Facebook
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-2"
              onClick={() => handleSocialLogin("apple")}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M16.37 1.6c0 1-.37 1.93-1.05 2.7-.75.84-1.98 1.47-3.04 1.39-.12-1.05.35-2.12 1.02-2.85.72-.8 2-1.39 3.07-1.24zM20.5 17.1c-.6 1.4-1.28 2.63-2.1 3.65-1.1 1.33-2 1.13-3.25.6-1.28-.54-2.46-.56-3.81 0-1.34.58-2.15.42-3.17-.68-1.7-1.86-3-4.9-3.08-7.87-.02-1.66.56-2.92 1.48-3.82.93-.9 2.2-1.45 3.49-1.42 1.13.02 2.2.67 2.96.67.72 0 2.06-.83 3.48-.71.6.03 2.3.25 3.39 1.89-.09.06-2.02 1.18-2 3.5.02 2.78 2.44 3.71 2.46 3.72-.02.08-.39 1.3-1.15 2.47z"
                />
              </svg>
              Apple
            </Button>
          </div>

          <p className="text-center mt-8 text-muted-foreground">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
              data-testid="auth-toggle"
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
          <img src={logo} alt="Chroma" className="h-16 w-16 mb-8" />
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
