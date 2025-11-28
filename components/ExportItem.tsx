import React from "react";
import { StyleSheet, Pressable, View, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface ExportItemProps {
  name: string;
  type: "stem" | "midi";
  fileSize?: string;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  onDownload: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ExportItem({
  name,
  type,
  fileSize,
  isDownloading,
  isDownloaded,
  onDownload,
}: ExportItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onDownload}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDownloading || isDownloaded}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.iconContainer, type === "midi" && styles.midiIcon]}>
        <Feather
          name={type === "stem" ? "music" : "file-text"}
          size={24}
          color={type === "stem" ? Colors.dark.accent : Colors.dark.info}
        />
      </View>
      <View style={styles.content}>
        <ThemedText type="body" numberOfLines={1}>
          {name}
        </ThemedText>
        {fileSize ? (
          <ThemedText type="caption" style={styles.fileSize}>
            {fileSize}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.actionContainer}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={Colors.dark.accent} />
        ) : isDownloaded ? (
          <View style={styles.downloadedBadge}>
            <Feather name="check" size={16} color={Colors.dark.success} />
          </View>
        ) : (
          <Feather name="download" size={20} color={Colors.dark.text} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.dark.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  midiIcon: {
    backgroundColor: Colors.dark.info + "20",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  fileSize: {
    color: Colors.dark.textSecondary,
  },
  actionContainer: {
    width: 32,
    alignItems: "center",
  },
  downloadedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.success + "20",
    alignItems: "center",
    justifyContent: "center",
  },
});
