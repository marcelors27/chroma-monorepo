import { Alert, Platform, ToastAndroid } from "react-native";

type ToastInput = {
  title: string;
  description?: string;
};

export const showToast = ({ title, description }: ToastInput) => {
  if (Platform.OS === "android") {
    const message = description ? `${title}\n${description}` : title;
    ToastAndroid.show(message, ToastAndroid.LONG);
    return;
  }
  Alert.alert(title, description);
};

export const useToast = () => ({ toast: showToast });

export type { ToastInput };
