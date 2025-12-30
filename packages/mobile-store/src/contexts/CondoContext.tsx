import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { listCompanies } from "../lib/medusa";
import { showToast } from "../hooks/useToast";

export type CondoOption = {
  id: string;
  name: string;
  cnpj?: string;
  approved?: boolean;
};

interface CondoContextType {
  condos: CondoOption[];
  selectedCondo: CondoOption | null;
  setSelectedCondo: (condo: CondoOption | null) => void;
  refreshCondos: () => Promise<void>;
}

const CondoContext = createContext<CondoContextType | undefined>(undefined);

export const CondoProvider = ({ children }: { children: ReactNode }) => {
  const [condos, setCondos] = useState<CondoOption[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<CondoOption | null>(null);

  const refreshCondos = async () => {
    try {
      const data = await listCompanies();
      const approved = (data?.companies || [])
        .filter((company: any) => company?.approved)
        .map((company: any) => ({
          id: company.id,
          name: company.fantasy_name || company.trade_name || "Empresa",
          cnpj: company.cnpj || undefined,
          approved: true,
        }));
      setCondos(approved);
      setSelectedCondo((current) => {
        if (current && approved.some((c: CondoOption) => c.id === current.id)) {
          return current;
        }
        return approved[0] || null;
      });
    } catch (err: any) {
      showToast({
        title: "Erro ao carregar condominios",
        description: err?.message || "Tente novamente.",
      });
      setCondos([]);
      setSelectedCondo(null);
    }
  };

  useEffect(() => {
    refreshCondos();
  }, []);

  return (
    <CondoContext.Provider value={{ condos, selectedCondo, setSelectedCondo, refreshCondos }}>
      {children}
    </CondoContext.Provider>
  );
};

export const useCondos = () => {
  const ctx = useContext(CondoContext);
  if (!ctx) throw new Error("useCondos must be used within CondoProvider");
  return ctx;
};
