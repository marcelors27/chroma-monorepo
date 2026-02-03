import React from "react";
import { Slider as TamaguiSlider } from "@tamagui/slider";

type UISliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
};

export function UISlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
}: UISliderProps) {
  const safeValue = Number.isFinite(value) ? value : minimumValue;
  return (
    <TamaguiSlider
      value={[safeValue]}
      onValueChange={(next) => onValueChange(next[0] ?? safeValue)}
      min={minimumValue}
      max={maximumValue}
      step={step}
      disabled={disabled}
      height={24}
    >
      <TamaguiSlider.Track backgroundColor="hsl(220 15% 20%)" height={6} borderRadius={999}>
        <TamaguiSlider.TrackActive backgroundColor="hsl(220 10% 50%)" />
      </TamaguiSlider.Track>
      <TamaguiSlider.Thumb
        backgroundColor="hsl(220 10% 50%)"
        borderColor="hsl(220 15% 20%)"
        borderWidth={1}
        width={18}
        height={18}
        borderRadius={999}
      />
    </TamaguiSlider>
  );
}

export { UISlider as Slider };
