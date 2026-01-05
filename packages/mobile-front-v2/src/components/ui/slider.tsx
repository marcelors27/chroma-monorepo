import Slider from "@react-native-community/slider";
import type { SliderProps } from "@react-native-community/slider";

export function UISlider(props: SliderProps) {
  return (
    <Slider
      minimumTrackTintColor="hsl(220 10% 50%)"
      maximumTrackTintColor="hsl(220 15% 20%)"
      thumbTintColor="hsl(220 10% 50%)"
      {...props}
    />
  );
}

export { UISlider as Slider };
