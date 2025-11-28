import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface ConfidenceBadgeProps {
  confidence: number;
  source: "acrcloud" | "acoustid";
}

export function ConfidenceBadge({ confidence, source }: ConfidenceBadgeProps) {
  const isHighConfidence = confidence >= 90;
  const isMediumConfidence = confidence >= 70 && confidence < 90;

  const getColor = () => {
    if (isHighConfidence) return Colors.dark.success;
    if (isMediumConfidence) return Colors.dark.warning;
    return Colors.dark.error;
  };

  const getLabel = () => {
    if (isHighConfidence) return "High Match";
    if (isMediumConfidence) return "Possible Match";
    return "Uncertain Match";
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
        <Feather
          name={isHighConfidence ? "check-circle" : "alert-circle"}
          size={14}
          color={color}
        />
        <ThemedText type="caption" style={{ color }}>
          {Math.round(confidence)}% - {getLabel()}
        </ThemedText>
      </View>
      <View style={styles.sourceBadge}>
        <ThemedText type="caption" style={styles.sourceText}>
          via {source === "acrcloud" ? "ACRCloud" : "AcoustID"}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  sourceBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
  },
  sourceText: {
    color: Colors.dark.textSecondary,
  },
});
