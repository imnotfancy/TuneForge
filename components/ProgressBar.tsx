import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export interface ProgressBarProps {
  progress: number;
  status?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, status, showPercentage = true }: ProgressBarProps) {
  const animatedWidth = useSharedValue(0);

  React.useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {(status || showPercentage) ? (
        <View style={styles.header}>
          {status ? <ThemedText type="body">{status}</ThemedText> : <View />}
          {showPercentage ? (
            <ThemedText type="bodyLarge" style={styles.percentage}>
              {Math.round(progress)}%
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <View style={styles.trackContainer}>
        <Animated.View style={[styles.progressContainer, animatedStyle]}>
          <LinearGradient
            colors={[Colors.dark.accent, "#FF6B8A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentage: {
    color: Colors.dark.accent,
    fontWeight: "700",
  },
  trackContainer: {
    height: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressContainer: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
});
