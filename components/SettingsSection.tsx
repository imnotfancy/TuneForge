import React, { useState } from "react";
import { StyleSheet, View, Pressable, TextInput, Modal, ScrollView, Linking, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="caption" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isDestructive,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed && onPress ? 0.8 : 1 },
      ]}
    >
      <Feather
        name={icon}
        size={20}
        color={isDestructive ? Colors.dark.error : Colors.dark.accent}
      />
      <ThemedText
        type="body"
        style={[styles.rowLabel, isDestructive && styles.destructiveText]}
      >
        {label}
      </ThemedText>
      {value ? (
        <ThemedText type="small" style={styles.rowValue}>
          {value}
        </ThemedText>
      ) : null}
      {onPress ? (
        <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
      ) : null}
    </Pressable>
  );
}

interface TooltipContent {
  title: string;
  steps: string[];
  url: string;
  urlLabel: string;
  note?: string;
}

interface SecureInputRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  tooltip?: TooltipContent;
}

export function SecureInputRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  tooltip,
}: SecureInputRowProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleOpenUrl = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <View style={styles.inputRow}>
      <View style={styles.inputHeader}>
        <Feather name={icon} size={20} color={Colors.dark.accent} />
        <ThemedText type="body" style={styles.rowLabel}>
          {label}
        </ThemedText>
        {tooltip ? (
          <Pressable
            onPress={() => setShowTooltip(true)}
            style={({ pressed }) => [
              styles.helpButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="help-circle" size={18} color={Colors.dark.info} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.textDisabled}
          secureTextEntry={!isVisible}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setIsVisible(!isVisible)}
          style={({ pressed }) => [styles.visibilityButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather
            name={isVisible ? "eye-off" : "eye"}
            size={20}
            color={Colors.dark.textSecondary}
          />
        </Pressable>
      </View>

      {tooltip ? (
        <Modal
          visible={showTooltip}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTooltip(false)}
        >
          <Pressable
            style={styles.tooltipOverlay}
            onPress={() => setShowTooltip(false)}
          >
            <Pressable style={styles.tooltipContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.tooltipHeader}>
                <View style={styles.tooltipIconContainer}>
                  <Feather name="info" size={20} color={Colors.dark.info} />
                </View>
                <ThemedText type="h4" style={styles.tooltipTitle}>
                  {tooltip.title}
                </ThemedText>
                <Pressable
                  onPress={() => setShowTooltip(false)}
                  style={({ pressed }) => [
                    styles.tooltipCloseButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="x" size={24} color={Colors.dark.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.tooltipContent} showsVerticalScrollIndicator={false}>
                <ThemedText type="caption" style={styles.stepsLabel}>
                  HOW TO GET YOUR KEY
                </ThemedText>
                
                {tooltip.steps.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <ThemedText type="caption" style={styles.stepNumberText}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" style={styles.stepText}>
                      {step}
                    </ThemedText>
                  </View>
                ))}

                {tooltip.note ? (
                  <View style={styles.noteContainer}>
                    <Feather name="alert-circle" size={16} color={Colors.dark.warning} />
                    <ThemedText type="small" style={styles.noteText}>
                      {tooltip.note}
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => handleOpenUrl(tooltip.url)}
                  style={({ pressed }) => [
                    styles.openUrlButton,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Feather name="external-link" size={18} color={Colors.dark.buttonText} />
                  <ThemedText type="body" style={styles.openUrlText}>
                    {tooltip.urlLabel}
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    color: Colors.dark.textSecondary,
  },
  destructiveText: {
    color: Colors.dark.error,
  },
  inputRow: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  helpButton: {
    marginLeft: "auto",
    padding: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.md + 20,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    padding: Spacing.sm,
  },
  visibilityButton: {
    padding: Spacing.sm,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  tooltipContainer: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.md,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  tooltipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.info + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipTitle: {
    flex: 1,
  },
  tooltipCloseButton: {
    padding: Spacing.xs,
  },
  tooltipContent: {
    padding: Spacing.md,
  },
  stepsLabel: {
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: Colors.dark.accent,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    color: Colors.dark.text,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.warning + "15",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  noteText: {
    flex: 1,
    color: Colors.dark.warning,
  },
  openUrlButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  openUrlText: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
});
