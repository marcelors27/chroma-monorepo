import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listCompanies } from "@/lib/medusa";
import { toast } from "@/lib/toast";

export interface Condo {
  id: string;
  name: string;
  address: string;
  units: number;
  role: string;
  approved?: boolean;
}

interface CondoContextType {
  condos: Condo[];
  activeCondo: Condo | null;
  setActiveCondo: (condo: Condo | null) => void;
  isAllCondos: boolean;
  setAllCondos: () => void;
  refreshCondos: () => Promise<void>;
}

const CondoContext = createContext<CondoContextType | undefined>(undefined);

export function CondoProvider({ children }: { children: ReactNode }) {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [activeCondo, setActiveCondoState] = useState<Condo | null>(null);

  const refreshCondos = async () => {
    try {
      const data = await listCompanies();
      const mapped = (data?.companies || [])
        .filter((company: any) => company?.approved)
        .map((company: any) => ({
          id: company.id,
          name: company.fantasy_name || company.trade_name || company.name || "Condomínio",
          address: company.metadata?.address || company.metadata?.city || "",
          units: Number(company.metadata?.units) || 0,
          role: company.metadata?.role || "Síndico",
          approved: true,
        }));
      setCondos(mapped);
      setActiveCondoState((current) => {
        if (current && mapped.some((condo) => condo.id === current.id)) {
          return current;
        }
        return mapped[0] || null;
      });
      return mapped;
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível carregar os condomínios.");
      setCondos([]);
      setActiveCondoState(null);
      return [];
    }
  };

  useEffect(() => {
    const loadCondo = async () => {
      const approved = await refreshCondos();
      const savedCondoId = await AsyncStorage.getItem("activeCondoId");
      if (!savedCondoId || savedCondoId === "all") return;
      const found = approved.find((condo) => condo.id === savedCondoId);
      if (found) {
        setActiveCondoState(found);
      }
    };

    loadCondo();
  }, []);

  const setActiveCondo = (condo: Condo | null) => {
    setActiveCondoState(condo);
    if (condo) {
      AsyncStorage.setItem("activeCondoId", condo.id);
    } else {
      AsyncStorage.setItem("activeCondoId", "all");
    }
  };

  const setAllCondos = () => {
    setActiveCondoState(null);
    AsyncStorage.setItem("activeCondoId", "all");
  };

  const isAllCondos = activeCondo === null;

  return (
    <CondoContext.Provider
      value={{
        condos,
        activeCondo,
        setActiveCondo,
        isAllCondos,
        setAllCondos,
        refreshCondos,
      }}
    >
      {children}
    </CondoContext.Provider>
  );
}

export function useCondo() {
  const context = useContext(CondoContext);
  if (context === undefined) {
    throw new Error("useCondo must be used within a CondoProvider");
  }
  return context;
}
