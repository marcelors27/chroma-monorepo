import { config as defaultConfig } from "@tamagui/config/v3";
import { animations } from "@tamagui/animations-react-native";
import { createTamagui } from "tamagui";

const appConfig = createTamagui({
  ...defaultConfig,
  animations,
  themes: {
    ...defaultConfig.themes,
    dark: {
      ...defaultConfig.themes.dark,
      background: "#0B0F14",
      backgroundStrong: "#151A22",
      backgroundHover: "#1B2230",
      borderColor: "#2E3644",
      color: "#E6E8EA",
      colorHover: "#FFFFFF",
      colorMuted: "#8C98A8",
      shadowColor: "rgba(0, 0, 0, 0.5)",
    },
  },
});

export type AppTamaguiConfig = typeof appConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default appConfig;
