import { TextArea } from "tamagui";
import type { TextAreaProps } from "tamagui";

export function Textarea(props: TextAreaProps) {
  return (
    <TextArea
      backgroundColor="$backgroundStrong"
      borderColor="$borderColor"
      borderWidth={1}
      color="$color"
      fontSize={14}
      borderRadius={16}
      paddingHorizontal={12}
      paddingVertical={10}
      minHeight={120}
      textAlignVertical="top"
      placeholderTextColor="#8C98A8"
      {...props}
    />
  );
}
