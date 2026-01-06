import { ScrollView } from "tamagui";
import type { ScrollViewProps } from "tamagui";

export function ScrollArea(props: ScrollViewProps) {
  return <ScrollView flex={1} {...props} />;
}
