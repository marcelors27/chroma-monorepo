import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Condo {
  id: string;
  name: string;
  address: string;
  units: number;
  role: string;
}

interface CondoContextType {
  condos: Condo[];
  activeCondo: Condo | null;
  setActiveCondo: (condo: Condo | null) => void;
  isAllCondos: boolean;
  setAllCondos: () => void;
}

const CondoContext = createContext<CondoContextType | undefined>(undefined);

const defaultCondos: Condo[] = [
  {
    id: "1",
    name: "Residencial Jardins",
    address: "Rua das Flores, 123 - Centro",
    units: 48,
    role: "Síndico",
  },
  {
    id: "2",
    name: "Edifício Aurora",
    address: "Av. Principal, 456 - Bairro Alto",
    units: 120,
    role: "Síndico",
  },
  {
    id: "3",
    name: "Condomínio Vista Mar",
    address: "Rua da Praia, 789 - Orla",
    units: 64,
    role: "Subsíndico",
  },
];

export function CondoProvider({ children }: { children: ReactNode }) {
  const [condos] = useState<Condo[]>(defaultCondos);
  const [activeCondo, setActiveCondoState] = useState<Condo | null>(null);

  useEffect(() => {
    const loadCondo = async () => {
      const savedCondoId = await AsyncStorage.getItem("activeCondoId");
      if (savedCondoId && savedCondoId !== "all") {
        const found = condos.find((c) => c.id === savedCondoId);
        if (found) {
          setActiveCondoState(found);
        }
      }
    };

    loadCondo();
  }, [condos]);

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
