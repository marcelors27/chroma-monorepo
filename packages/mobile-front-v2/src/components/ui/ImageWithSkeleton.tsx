import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ImageProps, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { Skeleton } from "./skeleton";

interface ImageWithSkeletonProps extends ImageProps {
  skeletonStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ImageStyle>;
}

export function ImageWithSkeleton({ style, skeletonStyle, ...props }: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const DEBUG = process.env.EXPO_PUBLIC_DEBUG_FRONT === "true";
  const fallbackSource = props.defaultSource || undefined;

  return (
    <View style={styles.container}>
      {isLoading && <Skeleton style={[styles.skeleton, skeletonStyle]} />}
      <Image
        {...props}
        style={[styles.image, style]}
        onLoadEnd={() => setIsLoading(false)}
        onError={(event) => {
          setIsLoading(false);
          setHasError(true);
          if (DEBUG) {
            console.debug("[image] load error", event.nativeEvent?.error, props.source);
          }
        }}
        resizeMode="cover"
      />
      {hasError && fallbackSource && (
        <Image source={fallbackSource} style={[styles.image, style]} resizeMode="cover" />
      )}
      {hasError && !fallbackSource && <View style={styles.fallback} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 38, 46, 0.35)",
  },
});
