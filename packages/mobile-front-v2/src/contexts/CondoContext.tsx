import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTokenValue, listCompanies } from "@/lib/medusa";
import { registerDevicePushToken } from "@/lib/push";
import { toast } from "@/lib/toast";

export interface Condo {
  id: string;
  name: string;
  address: string;
  cnpj?: string;
  razaoSocial?: string;
  number?: string;
  complemento?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  units: number;
  role: string;
  approved?: boolean;
  pointsBalance?: number;
  billingEmails?: string[];
}

interface CondoContextType {
  condos: Condo[];
  activeCondo: Condo | null;
  setActiveCondo: (condo: Condo | null) => void;
  isAllCondos: boolean;
  setAllCondos: () => void;
  refreshCondos: () => Promise<void>;
  hasApprovedCondo: boolean;
  isLoading: boolean;
}

const CondoContext = createContext<CondoContextType | undefined>(undefined);

export function CondoProvider({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [activeCondo, setActiveCondoState] = useState<Condo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCondos = async () => {
    const token = await getTokenValue();
    if (!isAuthenticated || !token) {
      setCondos([]);
      setActiveCondoState(null);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    try {
      const data = await listCompanies();
      const normalizeBillingEmails = (value: unknown) => {
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === "string" && value.trim()) {
          return value
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);
        }
        return [];
      };
      const mapped = (data?.companies || [])
        .filter((company: any) => company?.approved)
        .map((company: any) => ({
          id: company.id,
          name: company.fantasy_name || company.trade_name || company.name || "Condomínio",
          cnpj: company.cnpj || company.metadata?.cnpj || "",
          razaoSocial: company.trade_name || company.metadata?.razaoSocial || "",
          address: company.metadata?.address || company.metadata?.city || "",
          number: company.metadata?.numero || "",
          complemento: company.metadata?.complemento || "",
          neighborhood: company.metadata?.neighborhood || company.metadata?.bairro || "",
          city: company.metadata?.city || "",
          state: company.metadata?.state || "",
          zip: company.metadata?.zip || company.metadata?.cep || "",
          phone: company.metadata?.phone || "",
          email: company.metadata?.email || "",
          units: Number(company.metadata?.units) || 0,
          role: company.metadata?.role || "Síndico",
          approved: true,
          pointsBalance: Number(company.metadata?.points_balance || 0),
          billingEmails: normalizeBillingEmails(company.metadata?.billing_emails),
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadCondo = async () => {
      const token = await getTokenValue();
      if (!isAuthenticated || !token) {
        setCondos([]);
        setActiveCondoState(null);
        setIsLoading(false);
        return;
      }
      const approved = await refreshCondos();
      const savedCondoId = await AsyncStorage.getItem("activeCondoId");
      if (!savedCondoId || savedCondoId === "all") return;
      const found = approved.find((condo) => condo.id === savedCondoId);
      if (found) {
        setActiveCondoState(found);
      }
    };

    loadCondo();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    registerDevicePushToken(activeCondo?.id).catch(() => undefined);
  }, [isAuthenticated, activeCondo?.id]);

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
  const hasApprovedCondo = condos.length > 0;

  return (
    <CondoContext.Provider
      value={{
        condos,
        activeCondo,
        setActiveCondo,
        isAllCondos,
        setAllCondos,
        refreshCondos,
        hasApprovedCondo,
        isLoading,
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
