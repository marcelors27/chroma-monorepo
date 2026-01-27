import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerPushToken } from "@/lib/medusa";

const getPlatform = () => (Platform.OS === "ios" ? "ios" : "android");

export const registerDevicePushToken = async (companyId?: string | null) => {
  if (!Device.isDevice) return;

  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }
  if (status !== "granted") return;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  const provider = deviceToken.type === "apns" ? "apns" : "fcm";
  const token = deviceToken.data;

  await registerPushToken({
    provider,
    platform: getPlatform(),
    token,
    device_id: Device.osBuildId || Device.modelId || undefined,
    company_id: companyId || null,
  });
};
