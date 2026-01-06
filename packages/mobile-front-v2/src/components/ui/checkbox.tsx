import { Checkbox as TamaguiCheckbox, View } from "tamagui";
import type { CheckboxProps as TamaguiCheckboxProps } from "tamagui";

export function Checkbox({ checked = false, onCheckedChange, ...props }: TamaguiCheckboxProps) {
  return (
    <TamaguiCheckbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      width={20}
      height={20}
      borderRadius={999}
      borderWidth={1}
      borderColor={checked ? "#5DA2E6" : "$borderColor"}
      backgroundColor="transparent"
      {...props}
    >
      <TamaguiCheckbox.Indicator>
        <View width={10} height={10} borderRadius={999} backgroundColor="#5DA2E6" />
      </TamaguiCheckbox.Indicator>
    </TamaguiCheckbox>
  );
}
