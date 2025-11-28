import React, { useState } from "react";
import { StyleSheet, View, Alert, Linking, Platform, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import {
  SettingsSection,
  SettingsRow,
  SecureInputRow,
} from "@/components/SettingsSection";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export default function SettingsScreen() {
  const navigation = useNavigation();

  const [acrCloudKey, setAcrCloudKey] = useState("");
  const [acrCloudSecret, setAcrCloudSecret] = useState("");
  const [acoustIdKey, setAcoustIdKey] = useState("");
  const [fadrToken, setFadrToken] = useState("");

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleClearCache = (type: "recognition" | "stems") => {
    const title = type === "recognition" ? "Recognition Cache" : "Processed Stems";

    Alert.alert(
      `Clear ${title}`,
      `Are you sure you want to clear all cached ${type === "recognition" ? "recognition results" : "processed stems"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert("Cleared", `${title} has been cleared.`);
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <SettingsSection title="API Configuration">
        <SecureInputRow
          icon="key"
          label="ACRCloud Access Key"
          value={acrCloudKey}
          onChangeText={setAcrCloudKey}
          placeholder="Enter access key"
        />
        <SecureInputRow
          icon="lock"
          label="ACRCloud Secret"
          value={acrCloudSecret}
          onChangeText={setAcrCloudSecret}
          placeholder="Enter secret key"
        />
        <SecureInputRow
          icon="key"
          label="AcoustID API Key"
          value={acoustIdKey}
          onChangeText={setAcoustIdKey}
          placeholder="Enter API key"
        />
        <SecureInputRow
          icon="key"
          label="Fadr API Token"
          value={fadrToken}
          onChangeText={setFadrToken}
          placeholder="Enter bearer token"
        />
      </SettingsSection>

      <SettingsSection title="Audio Quality">
        <SettingsRow
          icon="sliders"
          label="Recording Quality"
          value="High"
          onPress={() => {
            Alert.alert(
              "Recording Quality",
              "Select audio recording quality:",
              [
                { text: "Low (64kbps)", onPress: () => {} },
                { text: "Medium (128kbps)", onPress: () => {} },
                { text: "High (256kbps)", onPress: () => {} },
                { text: "Cancel", style: "cancel" },
              ]
            );
          }}
        />
      </SettingsSection>

      <SettingsSection title="Storage">
        <SettingsRow
          icon="trash-2"
          label="Clear Recognition Cache"
          onPress={() => handleClearCache("recognition")}
          isDestructive
        />
        <SettingsRow
          icon="trash-2"
          label="Clear Processed Stems"
          onPress={() => handleClearCache("stems")}
          isDestructive
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow icon="info" label="Version" value={appVersion} />
        <SettingsRow
          icon="file-text"
          label="Privacy Policy"
          onPress={() => handleOpenLink("https://example.com/privacy")}
        />
        <SettingsRow
          icon="help-circle"
          label="Help & Support"
          onPress={() => handleOpenLink("https://example.com/support")}
        />
      </SettingsSection>

      <View style={styles.footer}>
        <ThemedText type="caption" style={styles.footerText}>
          TuneForge - AI Music Analyzer
        </ThemedText>
        <ThemedText type="caption" style={styles.footerText}>
          All audio processing is performed locally and via secure APIs.
        </ThemedText>
      </View>

      <Pressable
        onPress={handleDone}
        style={({ pressed }) => [
          styles.doneButton,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText type="body" style={styles.doneText}>
          Done
        </ThemedText>
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  footer: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  footerText: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.sm,
  },
  doneText: {
    color: Colors.dark.accent,
    fontWeight: "600",
  },
});
