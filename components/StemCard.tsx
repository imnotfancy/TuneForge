import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface StemCardProps {
  type: "vocals" | "drums" | "bass" | "melodies" | "instrumental";
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  hasMidi: boolean;
  isLoading?: boolean;
  progress?: number;
  onPlayPress: () => void;
  onMutePress: () => void;
  onSoloPress: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const stemIcons: Record<string, keyof typeof Feather.glyphMap> = {
  vocals: "mic",
  drums: "disc",
  bass: "radio",
  melodies: "music",
  instrumental: "headphones",
};

const stemColors: Record<string, string> = {
  vocals: "#FF6B6B",
  drums: "#4ECDC4",
  bass: "#9B59B6",
  melodies: "#F39C12",
  instrumental: "#3498DB",
};

export function StemCard({
  type,
  isPlaying,
  isMuted,
  isSolo,
  hasMidi,
  isLoading,
  progress = 0,
  onPlayPress,
  onMutePress,
  onSoloPress,
}: StemCardProps) {
  const scale = useSharedValue(1);
  const stemColor = stemColors[type];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const formatType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${stemColor}20` }]}>
          <Feather name={stemIcons[type]} size={24} color={stemColor} />
        </View>
        <View style={styles.titleContainer}>
          <ThemedText type="bodyLarge" style={styles.title}>
            {formatType(type)}
          </ThemedText>
          {hasMidi ? (
            <View style={styles.midiBadge}>
              <ThemedText type="caption" style={styles.midiText}>
                MIDI
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      ) : (
        <View style={styles.waveformPlaceholder}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: 8 + Math.sin(i * 0.5) * 12 + Math.random() * 8,
                  backgroundColor: isMuted ? Colors.dark.textDisabled : stemColor,
                  opacity: isMuted ? 0.3 : 0.6,
                },
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          onPress={onPlayPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.playButton,
            { opacity: pressed ? 0.8 : 1, backgroundColor: stemColor },
          ]}
          disabled={isLoading}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={Colors.dark.buttonText}
          />
        </Pressable>

        <View style={styles.toggleContainer}>
          <Pressable
            onPress={onMutePress}
            style={({ pressed }) => [
              styles.toggleButton,
              isMuted && styles.toggleActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            disabled={isLoading}
          >
            <Feather
              name={isMuted ? "volume-x" : "volume-2"}
              size={16}
              color={isMuted ? Colors.dark.accent : Colors.dark.textSecondary}
            />
            <ThemedText
              type="caption"
              style={[styles.toggleText, isMuted && styles.toggleTextActive]}
            >
              Mute
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onSoloPress}
            style={({ pressed }) => [
              styles.toggleButton,
              isSolo && styles.toggleActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            disabled={isLoading}
          >
            <Feather
              name="headphones"
              size={16}
              color={isSolo ? Colors.dark.accentSecondary : Colors.dark.textSecondary}
            />
            <ThemedText
              type="caption"
              style={[
                styles.toggleText,
                isSolo && { color: Colors.dark.accentSecondary },
              ]}
            >
              Solo
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontWeight: "600",
  },
  midiBadge: {
    backgroundColor: Colors.dark.info + "30",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  midiText: {
    color: Colors.dark.info,
    fontWeight: "600",
  },
  progressContainer: {
    height: 40,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.xs,
  },
  waveformPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    paddingHorizontal: Spacing.xs,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleContainer: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
  },
  toggleActive: {
    backgroundColor: Colors.dark.backgroundTertiary,
  },
  toggleText: {
    color: Colors.dark.textSecondary,
  },
  toggleTextActive: {
    color: Colors.dark.accent,
  },
});
