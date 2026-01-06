import { Text } from "tamagui";
import type { TextProps } from "tamagui";

export function Label(props: TextProps) {
  return <Text color="$colorMuted" fontSize={13} {...props} />;
}
