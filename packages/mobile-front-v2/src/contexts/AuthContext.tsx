import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import { Buffer } from "buffer";
import {
  clearSession,
  completeSocialAuth,
  completeSocialAuthNative,
  getCustomerMe,
  getTokenValue,
  listCompanies,
  login as loginCustomer,
  MedusaCustomer,
  registerStore,
  startSocialAuth,
} from "@/lib/medusa";
import { isUnauthorizedError } from "@/lib/auth-errors";
import { useBusinessTerms } from "@/contexts/BusinessTypeContext";

interface User {
  id: string;
  name: string;
  email: string;
}

type SocialLoginResult = {
  success: boolean;
  flowId: string;
  code?: "link_required";
  email?: string;
  credential?: { identityToken: string; authorizationCode?: string };
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithSocial: (
    provider: "google" | "apple" | "facebook",
    options?: {
      mode?: "login" | "signup";
      linkExisting?: boolean;
      credential?: { identityToken: string; authorizationCode?: string };
    }
  ) => Promise<SocialLoginResult>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "chroma_front_v2_user";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const mapCustomerToUser = (customer: MedusaCustomer): User => ({
  id: customer.id,
  name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email || "Usuário",
  email: customer.email || "",
});

const isAccessPendingError = (err: any) => {
  const message = err?.message || "";
  return message.includes("403") || /forbidden|access pending/i.test(message);
};

const hasApprovedCompany = async () => {
  try {
    const data = await listCompanies();
    return (data?.companies || []).some((company: any) => company?.approved);
  } catch {
    return false;
  }
};

const createSocialFlowId = () => {
  return `social-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getErrorMessage = (error: any) => {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error;
  return (
    error?.message ||
    error?.error ||
    error?.description ||
    error?.nativeErrorMessage ||
    error?.toString?.() ||
    "unknown_error"
  );
};

const waitForAuthRedirect = (authUrl: string, redirectBase: string) => {
  return new Promise<string>((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      subscription.remove();
      reject(new Error("Tempo de autenticação esgotado."));
    }, 120000);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!url.startsWith(redirectBase)) return;
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      subscription.remove();
      resolve(url);
    });

    Linking.openURL(authUrl).catch((err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      subscription.remove();
      reject(err);
    });
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { terms } = useBusinessTerms();

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
      } catch (err) {
        if (isAccessPendingError(err)) {
          setAuthError(`Seu acesso está em avaliação. Aguarde a aprovação ${terms.articleSingular} ${terms.labelLower}.`);
        } else {
          await clearSession();
          setUser(null);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const finalizeLogin = async () => {
    const approved = await hasApprovedCompany();
    if (!approved) {
      await clearSession();
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setAuthError(`Seu acesso está em avaliação. Aguarde a aprovação ${terms.articleSingular} ${terms.labelLower}.`);
      return false;
    }
    const { customer } = await getCustomerMe();
    if (!customer) {
      setAuthError("Não foi possível finalizar o login.");
      return false;
    }
    const mapped = mapCustomerToUser(customer);
    setUser(mapped);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
    setAuthError(null);
    return true;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    if (!email || password.length < 6) return false;
    try {
      await loginCustomer(email, password);
    } catch (err: any) {
      if (isUnauthorizedError(err)) {
        setAuthError("Email ou senha inválidos.");
      } else {
        setAuthError("Não foi possível entrar. Tente novamente.");
      }
      return false;
    }
    return finalizeLogin();
  };

  const decodeJwtPayload = (token: string) => {
    try {
      const payload = token.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(normalized, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };

  const loginWithSocial = async (
    provider: "google" | "apple" | "facebook",
    options?: {
      mode?: "login" | "signup";
      linkExisting?: boolean;
      credential?: { identityToken: string; authorizationCode?: string };
    }
  ): Promise<SocialLoginResult> => {
    const flowId = createSocialFlowId();
    setAuthError(null);
    console.info("[auth-mobile] social login start", {
      flowId,
      provider,
      mode: options?.mode || "login",
      linkExisting: options?.linkExisting ?? null,
      platform: Platform.OS,
      hasCredentialToken: !!options?.credential?.identityToken,
      hasCredentialCode: !!options?.credential?.authorizationCode,
    });
    try {
      if (provider === "facebook") {
        let LoginManager;
        let AccessToken;
        let Settings;
        try {
          ({ LoginManager, AccessToken, Settings } = require("react-native-fbsdk-next"));
        } catch {
          setAuthError("Facebook login indisponível no momento.");
          return { success: false, flowId };
        }

        try {
          Settings?.initializeSDK?.();
          const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);
          if (result?.isCancelled) {
            console.info("[auth-mobile] facebook cancelled", { flowId });
            return { success: false, flowId };
          }
          const data = await AccessToken.getCurrentAccessToken();
          const accessToken = data?.accessToken?.toString?.() || data?.accessToken;
          if (!accessToken) {
            setAuthError("Não foi possível concluir o login com Facebook.");
            return { success: false, flowId };
          }
          await completeSocialAuthNative("facebook", { accessToken, debugFlowId: flowId });
        } catch (error: any) {
          const message = getErrorMessage(error);
          console.info("[auth-mobile] facebook native error", {
            flowId,
            message,
          });
          setAuthError(`Não foi possível iniciar o login com Facebook. ${message}`);
          return { success: false, flowId };
        }

        const success = await finalizeLogin();
        console.info("[auth-mobile] social login done", { flowId, provider, success });
        return { success, flowId };
      }

      if (provider === "google" && (Platform.OS === "android" || Platform.OS === "ios")) {
        if (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID) {
          setAuthError("Google login iOS não configurado.");
          return { success: false, flowId };
        }
        let GoogleSignin;
        try {
          ({ GoogleSignin } = require("@react-native-google-signin/google-signin"));
        } catch {
          setAuthError("Google login indisponível no momento.");
          return { success: false, flowId };
        }

        GoogleSignin.configure({
          ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
          offlineAccess: false,
          scopes: ["email", "profile"],
        });

        try {
          if (Platform.OS === "android") {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          }
          const userInfo = await GoogleSignin.signIn();
          const tokens = await GoogleSignin.getTokens();
          const idToken =
            userInfo?.idToken ||
            tokens?.idToken ||
            undefined;
          const accessToken = tokens?.accessToken || undefined;

          if (!idToken && !accessToken) {
            setAuthError("Não foi possível concluir o login com Google.");
            return { success: false, flowId };
          }

          await completeSocialAuthNative("google", {
            identityToken: idToken,
            accessToken,
            authorizationCode: userInfo.serverAuthCode || undefined,
            debugFlowId: flowId,
          });
        } catch (error: any) {
          const message = getErrorMessage(error);
          console.info("[auth-mobile] google native error", {
            flowId,
            platform: Platform.OS,
            message,
          });
          setAuthError(`Não foi possível iniciar o login com Google. ${message}`);
          return { success: false, flowId };
        }

        const success = await finalizeLogin();
        console.info("[auth-mobile] social login done", { flowId, provider, success });
        return { success, flowId };
      }

      if (provider === "apple") {
        const available = await AppleAuthentication.isAvailableAsync();
        console.info("[auth-mobile] apple availability", { flowId, available });
        if (!available) {
          setAuthError("Login com Apple está disponível apenas no iOS.");
          console.info("[auth-mobile] apple unavailable", { flowId, platform: Platform.OS });
          return { success: false, flowId };
        }

        const credential =
          options?.credential ||
          (await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            ],
          }));

        if (!credential.identityToken) {
          setAuthError("Não foi possível concluir o login com Apple.");
          console.info("[auth-mobile] apple credential missing identity token", { flowId });
          return { success: false, flowId };
        }

        const mode = options?.mode || "login";
        const linkExisting = options?.linkExisting ?? mode !== "signup";

        try {
          await completeSocialAuthNative("apple", {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode || undefined,
            linkExisting,
            debugFlowId: flowId,
          });
        } catch (err: any) {
          const message = err?.message || "";
          console.info("[auth-mobile] apple callback error", {
            flowId,
            linkExisting,
            message,
          });
          if (message.includes("link_required")) {
            const payload = decodeJwtPayload(credential.identityToken) || {};
            console.info("[auth-mobile] apple link required", {
              flowId,
              email: payload.email || null,
            });
            return {
              success: false,
              flowId,
              code: "link_required",
              email: payload.email,
              credential: {
                identityToken: credential.identityToken,
                authorizationCode: credential.authorizationCode || undefined,
              },
            };
          }
          setAuthError("Não foi possível iniciar o login social.");
          return { success: false, flowId };
        }

        const success = await finalizeLogin();
        console.info("[auth-mobile] social login done", { flowId, provider, success });
        return { success, flowId };
      }

      const redirectBase = Linking.createURL("auth-callback");
      console.info("[auth-mobile] social web flow start", { flowId, provider, redirectBase });
      const start = await startSocialAuth(provider, redirectBase, flowId);
      console.info("[auth-mobile] social web flow authenticate response", {
        flowId,
        provider,
        hasToken: !!start?.token,
        hasLocation: !!start?.location,
      });
      if (!start?.token && start?.location) {
        const redirectUrl = await waitForAuthRedirect(start.location, redirectBase);
        console.info("[auth-mobile] social web flow redirect received", {
          flowId,
          provider,
          redirectUrl,
        });
        const parsed = Linking.parse(redirectUrl);
        const code = parsed.queryParams?.code;
        const state = parsed.queryParams?.state;
        if (!code || typeof code !== "string") {
          console.info("[auth-mobile] social web flow missing code", {
            flowId,
            provider,
            queryParams: parsed.queryParams || null,
          });
          setAuthError("Não foi possível concluir o login social.");
          return { success: false, flowId };
        }
        try {
          await completeSocialAuth(
            provider,
            { code, state: typeof state === "string" ? state : undefined },
            flowId
          );
        } catch (error: any) {
          const message = getErrorMessage(error);
          console.info("[auth-mobile] social web flow callback error", {
            flowId,
            provider,
            message,
            state: typeof state === "string" ? state : null,
          });
          setAuthError(`Falha no callback de login social (${provider}). ${message}`);
          return { success: false, flowId };
        }
      }
      const success = await finalizeLogin();
      console.info("[auth-mobile] social login done", { flowId, provider, success });
      return { success, flowId };
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.info("[auth-mobile] social login fatal error", {
        flowId,
        provider,
        message,
      });
      setAuthError(`Não foi possível iniciar o login social. ${message}`);
      return { success: false, flowId };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    if (!name || !email || password.length < 6) return false;
    const existingToken = await getTokenValue();
    if (!existingToken) {
      await registerStore(email, password);
    }
    setAuthError(`Seu acesso está em avaliação. Aguarde a aprovação ${terms.articleSingular} ${terms.labelLower}.`);
    const fallback = { id: "new", name, email };
    setUser(fallback);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallback));
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
