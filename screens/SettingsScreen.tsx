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

type RecognitionProvider = "acrcloud" | "acoustid";
type StemProvider = "fadr" | "lalalai" | "none";
type MidiProvider = "fadr" | "basicpitch" | "none";

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  pricing: string;
  icon: keyof typeof Feather.glyphMap;
}

const RECOGNITION_PROVIDERS: ProviderInfo[] = [
  {
    id: "acrcloud",
    name: "ACRCloud",
    description: "Industry-leading accuracy with extensive music database",
    pricing: "Free tier: 1,000 requests/day",
    icon: "zap",
  },
  {
    id: "acoustid",
    name: "AcoustID",
    description: "Open-source fingerprinting with MusicBrainz database",
    pricing: "Free and open-source",
    icon: "database",
  },
];

const STEM_PROVIDERS: ProviderInfo[] = [
  {
    id: "fadr",
    name: "Fadr",
    description: "High-quality AI stem separation with MIDI support",
    pricing: "$10/month for API access",
    icon: "layers",
  },
  {
    id: "lalalai",
    name: "LALAL.AI",
    description: "Neural network powered vocal and instrumental separation",
    pricing: "Pay-per-minute pricing",
    icon: "cpu",
  },
  {
    id: "none",
    name: "Skip Stem Separation",
    description: "Use TuneForge for recognition only",
    pricing: "No additional cost",
    icon: "skip-forward",
  },
];

const MIDI_PROVIDERS: ProviderInfo[] = [
  {
    id: "fadr",
    name: "Fadr",
    description: "Extract melodies, chords, and beats to MIDI",
    pricing: "Included with Fadr subscription",
    icon: "music",
  },
  {
    id: "basicpitch",
    name: "Basic Pitch",
    description: "Spotify's open-source audio-to-MIDI converter",
    pricing: "Free and open-source",
    icon: "git-branch",
  },
  {
    id: "none",
    name: "Skip MIDI Generation",
    description: "Export audio stems only",
    pricing: "No additional cost",
    icon: "skip-forward",
  },
];

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
  lalalai: {
    title: "LALAL.AI API Key",
    steps: [
      "Go to lalal.ai and create an account",
      "Navigate to Account Settings",
      "Find the 'API' section and generate your key",
      "Purchase credits for API usage",
      "Copy your API key and paste it here",
    ],
    url: "https://www.lalal.ai/",
    urlLabel: "Visit LALAL.AI",
    note: "Pay-as-you-go pricing based on audio minutes processed.",
  },
  basicpitch: {
    title: "Basic Pitch",
    steps: [
      "Basic Pitch runs locally - no API key needed!",
      "It's Spotify's open-source audio-to-MIDI model",
      "Processing happens on-device for privacy",
    ],
    url: "https://github.com/spotify/basic-pitch",
    urlLabel: "View on GitHub",
    note: "Free to use with no rate limits. May be slower on older devices.",
  },
};

function ProviderSelector({
  providers,
  selectedId,
  onSelect,
  disabled,
}: {
  providers: ProviderInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const handlePress = async (id: string) => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    onSelect(id);
  };

  return (
    <View style={styles.providerList}>
      {providers.map((provider) => {
        const isSelected = provider.id === selectedId;
        return (
          <Pressable
            key={provider.id}
            style={[
              styles.providerCard,
              isSelected && styles.providerCardSelected,
              disabled && styles.providerCardDisabled,
            ]}
            onPress={() => handlePress(provider.id)}
          >
            <View style={styles.providerHeader}>
              <View
                style={[
                  styles.providerIconContainer,
                  isSelected && styles.providerIconSelected,
                ]}
              >
                <Feather
                  name={provider.icon}
                  size={18}
                  color={isSelected ? Colors.dark.accent : Colors.dark.textSecondary}
                />
              </View>
              <View style={styles.providerInfo}>
                <ThemedText type="body" style={styles.providerName}>
                  {provider.name}
                </ThemedText>
                <ThemedText type="caption" style={styles.providerPricing}>
                  {provider.pricing}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected ? <View style={styles.radioInner} /> : null}
              </View>
            </View>
            <ThemedText type="caption" style={styles.providerDescription}>
              {provider.description}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function LevelBadge({ level, required }: { level: number; required: boolean }) {
  return (
    <View style={styles.levelBadgeContainer}>
      <View style={[styles.levelBadge, required && styles.levelBadgeRequired]}>
        <ThemedText type="caption" style={styles.levelBadgeText}>
          Level {level}
        </ThemedText>
      </View>
      {required ? (
        <View style={styles.requiredBadge}>
          <ThemedText type="caption" style={styles.requiredText}>
            Required
          </ThemedText>
        </View>
      ) : (
        <View style={styles.optionalBadge}>
          <ThemedText type="caption" style={styles.optionalText}>
            Optional
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  const [recognitionProvider, setRecognitionProvider] =
    useState<RecognitionProvider>("acrcloud");
  const [stemProvider, setStemProvider] = useState<StemProvider>("fadr");
  const [midiProvider, setMidiProvider] = useState<MidiProvider>("fadr");

  const [acrCloudKey, setAcrCloudKey] = useState("");
  const [acrCloudSecret, setAcrCloudSecret] = useState("");
  const [acoustIdKey, setAcoustIdKey] = useState("");
  const [fadrToken, setFadrToken] = useState("");
  const [lalalaiKey, setLalalaiKey] = useState("");
  const [recordingQuality, setRecordingQuality] = useState("High");

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const needsFadrToken = stemProvider === "fadr" || midiProvider === "fadr";
  const needsLalalaiKey = stemProvider === "lalalai";

  const handleClearCache = (type: "recognition" | "stems") => {
    const title =
      type === "recognition" ? "Recognition Cache" : "Processed Stems";

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
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
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
        {
          text: "Medium (128kbps)",
          onPress: () => setRecordingQuality("Medium"),
        },
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
          <Feather name="settings" size={24} color={Colors.dark.accent} />
        </View>
        <ThemedText type="body" style={styles.headerText}>
          Configure your preferred providers for each feature. Only Level 1 is
          required to use TuneForge.
        </ThemedText>
      </View>

      <View style={styles.levelSection}>
        <LevelBadge level={1} required />
        <SettingsSection title="Music Recognition">
          <ThemedText type="caption" style={styles.sectionHint}>
            Choose your music identification service. This is required to
            identify songs.
          </ThemedText>
          <ProviderSelector
            providers={RECOGNITION_PROVIDERS}
            selectedId={recognitionProvider}
            onSelect={(id) => setRecognitionProvider(id as RecognitionProvider)}
          />
        </SettingsSection>

        {recognitionProvider === "acrcloud" ? (
          <SettingsSection title="ACRCloud Configuration">
            <SecureInputRow
              icon="key"
              label="Access Key"
              value={acrCloudKey}
              onChangeText={setAcrCloudKey}
              placeholder="Enter ACRCloud access key"
              tooltip={API_TOOLTIPS.acrCloudAccessKey}
            />
            <SecureInputRow
              icon="lock"
              label="Secret Key"
              value={acrCloudSecret}
              onChangeText={setAcrCloudSecret}
              placeholder="Enter ACRCloud secret key"
              tooltip={API_TOOLTIPS.acrCloudSecret}
            />
          </SettingsSection>
        ) : (
          <SettingsSection title="AcoustID Configuration">
            <SecureInputRow
              icon="key"
              label="API Key"
              value={acoustIdKey}
              onChangeText={setAcoustIdKey}
              placeholder="Enter AcoustID API key"
              tooltip={API_TOOLTIPS.acoustId}
            />
          </SettingsSection>
        )}
      </View>

      <View style={styles.levelSection}>
        <LevelBadge level={2} required={false} />
        <SettingsSection title="Stem Separation">
          <ThemedText type="caption" style={styles.sectionHint}>
            Extract vocals, drums, bass, and other instruments from your audio.
          </ThemedText>
          <ProviderSelector
            providers={STEM_PROVIDERS}
            selectedId={stemProvider}
            onSelect={(id) => setStemProvider(id as StemProvider)}
          />
        </SettingsSection>
      </View>

      <View style={styles.levelSection}>
        <LevelBadge level={3} required={false} />
        <SettingsSection title="MIDI Generation">
          <ThemedText type="caption" style={styles.sectionHint}>
            Convert audio to MIDI for use in your DAW or music production
            software.
          </ThemedText>
          <ProviderSelector
            providers={MIDI_PROVIDERS}
            selectedId={midiProvider}
            onSelect={(id) => setMidiProvider(id as MidiProvider)}
          />
        </SettingsSection>
      </View>

      {(needsFadrToken || needsLalalaiKey) && (
        <SettingsSection title="Provider API Keys">
          {needsFadrToken ? (
            <SecureInputRow
              icon="key"
              label="Fadr API Token"
              value={fadrToken}
              onChangeText={setFadrToken}
              placeholder="Enter Fadr bearer token"
              tooltip={API_TOOLTIPS.fadr}
            />
          ) : null}
          {needsLalalaiKey ? (
            <SecureInputRow
              icon="key"
              label="LALAL.AI API Key"
              value={lalalaiKey}
              onChangeText={setLalalaiKey}
              placeholder="Enter LALAL.AI API key"
              tooltip={API_TOOLTIPS.lalalai}
            />
          ) : null}
        </SettingsSection>
      )}

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
                <ThemedText type="caption" style={styles.formatText}>
                  MP3
                </ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>
                  WAV
                </ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>
                  FLAC
                </ThemedText>
              </View>
              <View style={styles.formatBadge}>
                <ThemedText type="caption" style={styles.formatText}>
                  M4A
                </ThemedText>
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
  levelSection: {
    gap: Spacing.sm,
  },
  levelBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  levelBadgeRequired: {
    backgroundColor: Colors.dark.accent + "30",
  },
  levelBadgeText: {
    color: Colors.dark.textPrimary,
    fontWeight: "700",
  },
  requiredBadge: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  requiredText: {
    color: Colors.dark.textPrimary,
    fontWeight: "600",
  },
  optionalBadge: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.dark.textSecondary + "40",
  },
  optionalText: {
    color: Colors.dark.textSecondary,
    fontWeight: "600",
  },
  sectionHint: {
    color: Colors.dark.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  providerList: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  providerCard: {
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  providerCardSelected: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.accent + "10",
  },
  providerCardDisabled: {
    opacity: 0.5,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  providerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  providerIconSelected: {
    backgroundColor: Colors.dark.accent + "30",
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontWeight: "600",
  },
  providerPricing: {
    color: Colors.dark.accent,
  },
  providerDescription: {
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dark.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: Colors.dark.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.accent,
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
