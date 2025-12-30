import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hexagon, ShieldAlert } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";

const AccessPending = () => {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center px-6 py-12"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.97)), url(${authBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <Hexagon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">Chroma</span>
        </div>

          <div className="border-2 border-border bg-card p-8">
            <div className="w-14 h-14 border-2 border-primary/40 bg-primary/10 flex items-center justify-center mb-6">
              <ShieldAlert className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Seu acesso está em avaliação</h1>
            <p className="text-muted-foreground mb-6">
              Você precisa ter pelo menos um CNPJ aprovado para acessar o catálogo.
              Enquanto isso, cadastre uma empresa e envie o documento para análise.
            </p>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/company-link">Cadastrar empresa</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-2">
                <Link to="/auth">Voltar ao login</Link>
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default AccessPending;
