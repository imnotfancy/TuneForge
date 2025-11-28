import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";

import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
}

function WaveformBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(10);

  React.useEffect(() => {
    if (isActive) {
      const minHeight = 8 + Math.random() * 10;
      const maxHeight = 30 + Math.random() * 30;
      const duration = 200 + Math.random() * 300;

      height.value = withDelay(
        index * 50,
        withRepeat(
          withTiming(maxHeight, {
            duration,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(10, { duration: 300 });
    }
  }, [isActive, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        isActive && styles.barActive,
        animatedStyle,
      ]}
    />
  );
}

export function WaveformVisualizer({ isActive, barCount = 20 }: WaveformVisualizerProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={styles.container}>
      {bars.map((_, index) => (
        <WaveformBar key={index} index={index} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    gap: 4,
    paddingHorizontal: Spacing.lg,
  },
  bar: {
    width: 4,
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: Colors.dark.accent,
  },
});
