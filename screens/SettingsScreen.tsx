import React, { useState } from "react";
import { StyleSheet, View, Alert, Platform, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
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

const API_TOOLTIPS = {
  acrCloudAccessKey: {
    title: "ACRCloud Access Key",
    steps: [
      "Go to console.acrcloud.com and create a free account",
      "Click 'Create Project' and select 'Audio & Video Recognition'",
      "Choose 'Recorded Audio' as the audio type",
      "Once created, find your Access Key in the project dashboard",
      "Copy the Access Key and paste it here",
    ],
    url: "https://console.acrcloud.com/signup",
    urlLabel: "Sign Up for ACRCloud",
    note: "Free tier includes 1,000 recognition requests per day - perfect for testing!",
  },
  acrCloudSecret: {
    title: "ACRCloud Secret Key",
    steps: [
      "Log in to console.acrcloud.com",
      "Open your Audio Recognition project",
      "Find the Secret Key next to your Access Key",
      "Click 'Show' to reveal, then copy and paste here",
    ],
    url: "https://console.acrcloud.com/",
    urlLabel: "Open ACRCloud Console",
    note: "Keep this secret! Never share it publicly.",
  },
  acoustId: {
    title: "AcoustID API Key",
    steps: [
      "Visit acoustid.org and click 'Log in'",
      "Create an account or log in with an existing one",
      "Go to 'My Applications' in your profile",
      "Click 'Register a new application'",
      "Enter an app name and description, then submit",
      "Copy your new API key from the application page",
    ],
    url: "https://acoustid.org/new-application",
    urlLabel: "Register AcoustID App",
    note: "AcoustID is free and open-source, powered by MusicBrainz database.",
  },
  fadr: {
    title: "Fadr API Token",
    steps: [
      "Go to fadr.com and create an account",
      "Subscribe to Fadr Plus ($10/month) to access API features",
      "Navigate to your account settings/dashboard",
      "Find the 'API Access' or 'Developer' section",
      "Generate or copy your Bearer token",
    ],
    url: "https://fadr.com/",
    urlLabel: "Visit Fadr",
    note: "Fadr Plus subscription required. Supports stem separation, MIDI generation, key/tempo detection.",
  },
};

export default function SettingsScreen() {
  const navigation = useNavigation();

  const [acrCloudKey, setAcrCloudKey] = useState("");
  const [acrCloudSecret, setAcrCloudSecret] = useState("");
  const [acoustIdKey, setAcoustIdKey] = useState("");
  const [fadrToken, setFadrToken] = useState("");
  const [recordingQuality, setRecordingQuality] = useState("High");

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

  const handleQualityChange = () => {
    Alert.alert(
      "Recording Quality",
      "Higher quality produces better recognition results but uses more storage.",
      [
        { text: "Low (64kbps)", onPress: () => setRecordingQuality("Low") },
        { text: "Medium (128kbps)", onPress: () => setRecordingQuality("Medium") },
        { text: "High (256kbps)", onPress: () => setRecordingQuality("High") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerInfo}>
        <View style={styles.headerIconContainer}>
          <Feather name="key" size={24} color={Colors.dark.accent} />
        </View>
        <ThemedText type="body" style={styles.headerText}>
          Tap the help icon next to each field for step-by-step setup instructions.
        </ThemedText>
      </View>

      <SettingsSection title="API Configuration">
        <SecureInputRow
          icon="key"
          label="ACRCloud Access Key"
          value={acrCloudKey}
          onChangeText={setAcrCloudKey}
          placeholder="Enter access key"
          tooltip={API_TOOLTIPS.acrCloudAccessKey}
        />
        <SecureInputRow
          icon="lock"
          label="ACRCloud Secret"
          value={acrCloudSecret}
          onChangeText={setAcrCloudSecret}
          placeholder="Enter secret key"
          tooltip={API_TOOLTIPS.acrCloudSecret}
        />
        <SecureInputRow
          icon="key"
          label="AcoustID API Key"
          value={acoustIdKey}
          onChangeText={setAcoustIdKey}
          placeholder="Enter API key"
          tooltip={API_TOOLTIPS.acoustId}
        />
        <SecureInputRow
          icon="key"
          label="Fadr API Token"
          value={fadrToken}
          onChangeText={setFadrToken}
          placeholder="Enter bearer token"
          tooltip={API_TOOLTIPS.fadr}
        />
      </SettingsSection>

      <SettingsSection title="Audio Settings">
        <SettingsRow
          icon="sliders"
          label="Recording Quality"
          value={recordingQuality}
          onPress={handleQualityChange}
        />
        <View style={styles.supportedFormatsRow}>
          <Feather name="file-text" size={20} color={Colors.dark.accent} />
          <View style={styles.formatsContent}>
            <ThemedText type="body">Supported Formats</ThemedText>
            <View style={styles.formatBadges}>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>MP3</ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>WAV</ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>FLAC</ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>M4A</ThemedText>
              </View>
            </View>
          </View>
        </View>
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
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    color: Colors.dark.textSecondary,
  },
  supportedFormatsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  formatsContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  formatBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  formatBadge: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  formatText: {
    color: Colors.dark.textSecondary,
    fontWeight: "600",
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
