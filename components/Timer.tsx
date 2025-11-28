import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

interface TimerProps {
  seconds: number;
  maxSeconds: number;
}

export function Timer({ seconds, maxSeconds }: TimerProps) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const progress = (seconds / maxSeconds) * 100;

  return (
    <View style={styles.container}>
      <ThemedText type="h2" style={styles.time}>
        {formatTime(seconds)}
      </ThemedText>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <ThemedText type="small" style={styles.label}>
        Recording... Max {maxSeconds}s
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  time: {
    fontVariant: ["tabular-nums"],
    color: Colors.dark.accent,
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 2,
  },
  label: {
    color: Colors.dark.textSecondary,
  },
});
