import { Alert } from "react-native";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

const showToast = (title: string, description?: string) => {
  Alert.alert(title, description);
};

export const toast = Object.assign(
  ({ title, description, variant }: ToastInput) => {
    if (title || description) {
      showToast(
        title || (variant === "destructive" ? "Erro" : "Aviso"),
        description,
      );
    }
  },
  {
    success: (message: string) => showToast("Sucesso", message),
    error: (message: string) => showToast("Erro", message),
    info: (message: string) => showToast("Info", message),
  },
);
