import { Star, Gift, ArrowRight } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";
import { resolveBusinessBackground } from "@/lib/business-background";

interface LayoutContext {
  selectedCondo: { id: string; name: string; pointsBalance?: number } | null;
}

const Points = () => {
  const { terms, activeBusinessType, activeBusinessTypeKey } = useBusinessTerms();
  const { selectedCondo } = useOutletContext<LayoutContext>();
  const pointsBalance = selectedCondo?.pointsBalance ?? 0;

  return (
    <div
      className="min-h-screen relative -m-4 lg:-m-8 p-4 lg:p-8"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.78), hsl(var(--background) / 0.86)), url(${resolveBusinessBackground(activeBusinessTypeKey, terms.labelLower, activeBusinessType?.terms || null)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Gastar {terms.pointsLabelLower}</h1>
          <p className="text-muted-foreground">
            Use seus {terms.pointsLabelLower} acumulados para resgatar benefícios especiais.
          </p>
        </div>

        <div className="border-2 border-border bg-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {terms.pointsLabel} disponíveis
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {pointsBalance}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCondo?.name || terms.label}
            </div>
          </div>
        </div>

        <div className="border-2 border-dashed border-border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gift className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Catálogo de resgates em breve</h2>
          <p className="text-muted-foreground">
            Estamos preparando um espaço para trocar seus {terms.pointsLabelLower} por vantagens e produtos.
          </p>
          <Button asChild className="gap-2">
            <Link to="/dashboard">
              Continuar comprando
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Points;
