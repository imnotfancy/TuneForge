import React from "react";
import { StyleSheet, View, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
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

interface SecureInputRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SecureInputRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
}: SecureInputRowProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <View style={styles.inputRow}>
      <View style={styles.inputHeader}>
        <Feather name={icon} size={20} color={Colors.dark.accent} />
        <ThemedText type="body" style={styles.rowLabel}>
          {label}
        </ThemedText>
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
});
