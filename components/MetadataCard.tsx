import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface MetadataCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

export function MetadataCard({ icon, label, value, onPress }: MetadataCardProps) {
  const Content = (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={20} color={Colors.dark.accent} />
      </View>
      <View style={styles.textContainer}>
        <ThemedText type="caption" style={styles.label}>
          {label}
        </ThemedText>
        <ThemedText type="body" numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
      {onPress ? (
        <Feather name="external-link" size={16} color={Colors.dark.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {Content}
      </Pressable>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: BorderRadius.sm,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.dark.textSecondary,
  },
});
