import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearSession,
  getCustomerMe,
  getTokenValue,
  listCompanies,
  login as loginCustomer,
  MedusaCustomer,
  registerStore,
} from "@/lib/medusa";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithSocial: (provider: "google" | "apple") => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "chroma_front_v2_user";

const mapCustomerToUser = (customer: MedusaCustomer): User => ({
  id: customer.id,
  name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email || "Usuário",
  email: customer.email || "",
});

const hasApprovedCompany = async () => {
  const data = await listCompanies();
  return (data?.companies || []).some((company: any) => company?.approved);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      const token = await getTokenValue();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { customer } = await getCustomerMe();
        if (customer) {
          const mapped = mapCustomerToUser(customer);
          setUser(mapped);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
        }
      } catch {
        await clearSession();
        setUser(null);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    if (!email || password.length < 6) return false;
    try {
      await loginCustomer(email, password);
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("401") || /unauthorized/i.test(message)) {
        setAuthError("Email ou senha inválidos.");
      } else {
        setAuthError("Não foi possível entrar. Tente novamente.");
      }
      return false;
    }
    const approved = await hasApprovedCompany();
    if (!approved) {
      await clearSession();
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setAuthError("Seu acesso está em avaliação. Aguarde a aprovação do condomínio.");
      return false;
    }
    const { customer } = await getCustomerMe();
    if (!customer) return false;
    const mapped = mapCustomerToUser(customer);
    setUser(mapped);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
    setAuthError(null);
    return true;
  };

  const loginWithSocial = async (provider: "google" | "apple"): Promise<boolean> => {
    console.warn(`Login social (${provider}) ainda não implementado no backend.`);
    return false;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    if (!name || !email || password.length < 6) return false;
    await registerStore(email, password);
    setAuthError("Seu acesso está em avaliação. Aguarde a aprovação do condomínio.");
    const { customer } = await getCustomerMe();
    const mapped = customer ? mapCustomerToUser(customer) : { id: "new", name, email };
    setUser(mapped);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
    return true;
  };

  const logout = () => {
    setUser(null);
    AsyncStorage.removeItem(USER_STORAGE_KEY);
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authError,
        login,
        loginWithSocial,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
