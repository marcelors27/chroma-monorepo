import { Switch as TamaguiSwitch } from "tamagui";

interface UISwitchProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value = false, onValueChange, disabled }: UISwitchProps) {
  return (
    <TamaguiSwitch
      checked={value}
      onCheckedChange={(next) => onValueChange?.(next === true)}
      disabled={disabled}
      backgroundColor={value ? "$backgroundStrong" : "$backgroundStrong"}
      borderColor="$borderColor"
      borderWidth={1}
    >
      <TamaguiSwitch.Thumb backgroundColor="#FFFFFF" />
    </TamaguiSwitch>
  );
}
