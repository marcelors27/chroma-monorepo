import { Switch as RNSwitch } from "react-native";
import type { SwitchProps } from "react-native";

interface UISwitchProps extends SwitchProps {
  className?: string;
}

export function Switch(props: UISwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: "hsl(220 15% 20%)", true: "hsl(220 10% 50%)" }}
      thumbColor="white"
      {...props}
    />
  );
}
