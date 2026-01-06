import { Input as TamaguiInput } from "tamagui";
import type { InputProps as TamaguiInputProps } from "tamagui";

export function Input(props: TamaguiInputProps) {
  return (
    <TamaguiInput
      backgroundColor="$backgroundStrong"
      borderColor="$borderColor"
      borderWidth={1}
      color="$color"
      fontSize={14}
      height={48}
      borderRadius={16}
      paddingHorizontal={12}
      placeholderTextColor="#8C98A8"
      {...props}
    />
  );
}
