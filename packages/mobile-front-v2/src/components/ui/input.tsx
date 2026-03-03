import { Input as TamaguiInput } from "tamagui";
import type { InputProps as TamaguiInputProps } from "tamagui";

type InputProps = TamaguiInputProps & {
  type?: "text" | "password" | string;
};

export function Input({ type, secureTextEntry, autoCapitalize, textContentType, ...props }: InputProps) {
  const isPassword = type === "password";

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
      secureTextEntry={secureTextEntry ?? isPassword}
      autoCapitalize={autoCapitalize ?? (isPassword ? "none" : undefined)}
      textContentType={textContentType ?? (isPassword ? "password" : undefined)}
      {...props}
    />
  );
}
