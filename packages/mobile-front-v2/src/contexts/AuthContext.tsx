import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithSocial: (provider: "google" | "apple") => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("chroma_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - in production, this would call an API
    if (email && password.length >= 6) {
      const mockUser = {
        id: "1",
        name: email.split("@")[0],
        email,
      };
      setUser(mockUser);
      await AsyncStorage.setItem("chroma_user", JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const loginWithSocial = async (provider: "google" | "apple"): Promise<boolean> => {
    // Mock social login
    const mockUser = {
      id: "1",
      name: `Usuário ${provider}`,
      email: `user@${provider}.com`,
    };
    setUser(mockUser);
    await AsyncStorage.setItem("chroma_user", JSON.stringify(mockUser));
    return true;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    if (name && email && password.length >= 6) {
      const mockUser = { id: "1", name, email };
      setUser(mockUser);
      await AsyncStorage.setItem("chroma_user", JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    AsyncStorage.removeItem("chroma_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
