import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hexagon, Plus, Trash2, Upload, FileText, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCNPJ, validateCNPJ } from "@/lib/cnpj";
import authBg from "@/assets/auth-bg.jpg";

interface Company {
  id: string;
  cnpj: string;
  companyName: string;
  document: File | null;
  documentName: string;
}

const CompanyLink = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [companies, setCompanies] = useState<Company[]>([
    { id: crypto.randomUUID(), cnpj: "", companyName: "", document: null, documentName: "" }
  ]);

  const handleCNPJChange = (id: string, value: string) => {
    const formatted = formatCNPJ(value);
    setCompanies(companies.map(c => 
      c.id === id ? { ...c, cnpj: formatted } : c
    ));
  };

  const handleCompanyNameChange = (id: string, value: string) => {
    setCompanies(companies.map(c => 
      c.id === id ? { ...c, companyName: value } : c
    ));
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      setCompanies(companies.map(c => 
        c.id === id ? { ...c, document: file, documentName: file.name } : c
      ));
    }
  };

  const addCompany = () => {
    if (companies.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Você pode vincular no máximo 10 empresas por vez.",
        variant: "destructive",
      });
      return;
    }
    setCompanies([...companies, { 
      id: crypto.randomUUID(), 
      cnpj: "", 
      companyName: "", 
      document: null, 
      documentName: "" 
    }]);
  };

  const removeCompany = (id: string) => {
    if (companies.length === 1) {
      toast({
        title: "Atenção",
        description: "Você precisa vincular pelo menos uma empresa.",
        variant: "destructive",
      });
      return;
    }
    setCompanies(companies.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const company of companies) {
      if (!company.cnpj || !company.companyName) {
        toast({
          title: "Erro",
          description: "Preencha o CNPJ e nome de todas as empresas.",
          variant: "destructive",
        });
        return;
      }
      
      if (!validateCNPJ(company.cnpj)) {
        toast({
          title: "CNPJ inválido",
          description: `O CNPJ ${company.cnpj} é inválido.`,
          variant: "destructive",
        });
        return;
      }

      if (!company.document) {
        toast({
          title: "Documento obrigatório",
          description: `Anexe o documento comprovando vínculo com ${company.companyName}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: "Empresas vinculadas!",
        description: `${companies.length} empresa(s) vinculada(s) com sucesso.`,
      });
      setIsLoading(false);
      navigate("/onboarding");
    }, 1500);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.97)), url(${authBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hexagon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight text-primary">Chroma</span>
          </div>
          <Button asChild variant="outline" className="border-2">
            <Link to="/auth">Voltar ao login</Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Vincule suas Empresas</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Para continuar, vincule pelo menos uma empresa informando o CNPJ e anexando um documento que comprove seu vínculo (contrato social, procuração, etc).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {companies.map((company, index) => (
              <div 
                key={company.id} 
                className="border-2 border-border p-6 bg-card hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">
                    Empresa {index + 1}
                  </h3>
                  {companies.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCompany(company.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`companyName-${company.id}`}>Nome da Empresa *</Label>
                    <Input
                      id={`companyName-${company.id}`}
                      placeholder="Razão Social"
                      className="h-12 border-2"
                      value={company.companyName}
                      onChange={(e) => handleCompanyNameChange(company.id, e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cnpj-${company.id}`}>CNPJ *</Label>
                    <Input
                      id={`cnpj-${company.id}`}
                      placeholder="00.000.000/0000-00"
                      className="h-12 border-2"
                      value={company.cnpj}
                      onChange={(e) => handleCNPJChange(company.id, e.target.value)}
                      maxLength={18}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Documento Comprobatório *</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Contrato social, procuração, ou outro documento que comprove vínculo com a empresa.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      id={`document-${company.id}`}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(company.id, e)}
                    />
                    <label
                      htmlFor={`document-${company.id}`}
                      className={`flex items-center gap-3 p-4 border-2 border-dashed cursor-pointer transition-colors hover:border-primary hover:bg-muted/50 ${
                        company.document ? "border-primary bg-muted/30" : "border-border"
                      }`}
                    >
                      {company.document ? (
                        <>
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{company.documentName}</p>
                            <p className="text-sm text-muted-foreground">Clique para alterar</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">Clique para anexar documento</p>
                            <p className="text-sm text-muted-foreground">PDF, JPG, PNG ou DOC (máx. 10MB)</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-2 border-dashed"
              onClick={addCompany}
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar outra empresa
            </Button>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg"
              disabled={isLoading}
            >
              {isLoading ? "Vinculando..." : `Continuar com ${companies.length} empresa(s)`}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CompanyLink;
