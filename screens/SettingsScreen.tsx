import React from "react";
import { StyleSheet, View, Alert, Platform, Pressable, ActivityIndicator } from "react-native";
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
import {
  useSettings,
  RecognitionProvider,
  StemProvider,
  MidiProvider,
  RecordingQuality,
} from "@/hooks/useSettings";

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  pricing: string;
  icon: keyof typeof Feather.glyphMap;
  tier?: "recommended" | "pro" | "free";
  requiresApi?: boolean;
}

const RECOGNITION_PROVIDERS: ProviderInfo[] = [
  {
    id: "acrcloud",
    name: "ACRCloud",
    description: "Industry-leading accuracy with extensive music database",
    pricing: "Free: 1,000 requests/day",
    icon: "zap",
    tier: "recommended",
    requiresApi: true,
  },
  {
    id: "acoustid",
    name: "AcoustID",
    description: "Open-source fingerprinting with MusicBrainz database",
    pricing: "Free and open-source",
    icon: "database",
    tier: "free",
    requiresApi: true,
  },
];

const STEM_PROVIDERS: ProviderInfo[] = [
  {
    id: "lalalai",
    name: "LALAL.AI",
    description: "Perseus neural network with best-in-class vocal separation. Desktop, web & mobile apps available.",
    pricing: "From $10/month or pay-per-minute",
    icon: "award",
    tier: "recommended",
    requiresApi: true,
  },
  {
    id: "gaudio",
    name: "Gaudio Studio",
    description: "GSEP model excels at vocals and piano. Token-based pricing, no subscription required.",
    pricing: "Token-based, from $5",
    icon: "speaker",
    tier: "pro",
    requiresApi: true,
  },
  {
    id: "fadr",
    name: "Fadr",
    description: "Full suite with MIDI extraction, SynthGPT, and DrumGPT. Plugin available.",
    pricing: "$10/month or $100/year",
    icon: "layers",
    tier: "pro",
    requiresApi: true,
  },
  {
    id: "moises",
    name: "Moises",
    description: "Great for live instruments. Includes smart metronome, chord detection & practice tools.",
    pricing: "Free tier, Premium from $4/month",
    icon: "music",
    tier: "pro",
    requiresApi: true,
  },
  {
    id: "audioshake",
    name: "AudioShake (LANDR)",
    description: "Award-winning AI used by major labels. Available through LANDR subscription.",
    pricing: "LANDR from $20/year",
    icon: "radio",
    tier: "pro",
    requiresApi: true,
  },
  {
    id: "audiostrip",
    name: "AudioStrip",
    description: "Web-based with clean vocal separation. No installation required.",
    pricing: "Free with limits, Pro available",
    icon: "globe",
    tier: "free",
    requiresApi: true,
  },
  {
    id: "uvr5",
    name: "Ultimate Vocal Remover 5",
    description: "Free & open-source with multiple AI models. Runs locally on your computer.",
    pricing: "Free and open-source",
    icon: "gift",
    tier: "free",
    requiresApi: false,
  },
  {
    id: "none",
    name: "Skip Stem Separation",
    description: "Use TuneForge for song recognition only",
    pricing: "No additional cost",
    icon: "skip-forward",
  },
];

const MIDI_PROVIDERS: ProviderInfo[] = [
  {
    id: "fadr",
    name: "Fadr",
    description: "Extract melodies, chords, drums and basslines to MIDI with high accuracy.",
    pricing: "Included with Fadr subscription",
    icon: "music",
    tier: "recommended",
    requiresApi: true,
  },
  {
    id: "basicpitch",
    name: "Basic Pitch",
    description: "Spotify's open-source polyphonic audio-to-MIDI. Runs locally for privacy.",
    pricing: "Free and open-source",
    icon: "git-branch",
    tier: "free",
    requiresApi: false,
  },
  {
    id: "ripx",
    name: "Hit'n'Mix RipX",
    description: "Deep audio editing with Rip Audio format. Edit individual notes and harmonies.",
    pricing: "From $99 one-time",
    icon: "edit-3",
    tier: "pro",
    requiresApi: false,
  },
  {
    id: "none",
    name: "Skip MIDI Generation",
    description: "Export audio stems only without MIDI conversion",
    pricing: "No additional cost",
    icon: "skip-forward",
  },
];

const API_TOOLTIPS: Record<string, {
  title: string;
  steps: string[];
  url: string;
  urlLabel: string;
  note: string;
}> = {
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
      "Purchase credits or subscribe for API usage",
      "Copy your API key and paste it here",
    ],
    url: "https://www.lalal.ai/",
    urlLabel: "Visit LALAL.AI",
    note: "Best vocal separation. Pay-per-minute or subscription options available.",
  },
  moises: {
    title: "Moises API Key",
    steps: [
      "Go to moises.ai and create an account",
      "Subscribe to a Premium plan for API access",
      "Visit developer.moises.ai for API documentation",
      "Generate your API key from the developer portal",
      "Copy the key and paste it here",
    ],
    url: "https://moises.ai/",
    urlLabel: "Visit Moises",
    note: "Includes smart metronome, chord detection, and practice tools. Great for live instruments.",
  },
  gaudio: {
    title: "Gaudio Studio API Key",
    steps: [
      "Go to gaudiolab.io and create an account",
      "Purchase tokens for API usage",
      "Navigate to the API section in your dashboard",
      "Generate or copy your API key",
      "Paste it here to connect",
    ],
    url: "https://www.gaudiolab.io/",
    urlLabel: "Visit Gaudio Lab",
    note: "Token-based pricing. Excellent for vocals and piano separation.",
  },
  audioshake: {
    title: "AudioShake / LANDR API",
    steps: [
      "Go to landr.com and subscribe to a plan",
      "Access the LANDR Stems feature from your dashboard",
      "For API access, contact AudioShake directly",
      "Enterprise users can request API credentials",
    ],
    url: "https://www.landr.com/",
    urlLabel: "Visit LANDR",
    note: "Uses AudioShake's AI, trusted by major labels and publishers.",
  },
  audiostrip: {
    title: "AudioStrip",
    steps: [
      "Go to audiostrip.co.uk",
      "Create an account for Pro features",
      "Navigate to API settings if available",
      "Copy your API credentials",
    ],
    url: "https://www.audiostrip.co.uk/",
    urlLabel: "Visit AudioStrip",
    note: "Web-based service with clean vocal separation. Easy to use.",
  },
};

function ProviderCard({
  provider,
  isSelected,
  onPress,
  disabled,
}: {
  provider: ProviderInfo;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const handlePress = async () => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    onPress();
  };

  const getTierColor = () => {
    switch (provider.tier) {
      case "recommended":
        return Colors.dark.accent;
      case "pro":
        return "#A78BFA";
      case "free":
        return "#34D399";
      default:
        return Colors.dark.textSecondary;
    }
  };

  const getTierLabel = () => {
    switch (provider.tier) {
      case "recommended":
        return "Top Pick";
      case "pro":
        return "Pro";
      case "free":
        return "Free";
      default:
        return null;
    }
  };

  return (
    <Pressable
      style={[
        styles.providerCard,
        isSelected && styles.providerCardSelected,
        disabled && styles.providerCardDisabled,
      ]}
      onPress={handlePress}
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
          <View style={styles.providerNameRow}>
            <ThemedText type="body" style={styles.providerName}>
              {provider.name}
            </ThemedText>
            {getTierLabel() ? (
              <View style={[styles.tierBadge, { backgroundColor: getTierColor() + "30" }]}>
                <ThemedText type="caption" style={[styles.tierText, { color: getTierColor() }]}>
                  {getTierLabel()}
                </ThemedText>
              </View>
            ) : null}
          </View>
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
      {provider.requiresApi === false ? (
        <View style={styles.localBadge}>
          <Feather name="download-cloud" size={12} color={Colors.dark.textSecondary} />
          <ThemedText type="caption" style={styles.localText}>
            Runs locally - no API key needed
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

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
  return (
    <View style={styles.providerList}>
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          isSelected={provider.id === selectedId}
          onPress={() => onSelect(provider.id)}
          disabled={disabled}
        />
      ))}
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
  const { providerSettings, apiKeys, isLoading, updateProviderSettings, updateApiKey, clearAllSettings } = useSettings();

  const { recognitionProvider, stemProvider, midiProvider, recordingQuality } = providerSettings;
  const {
    acrCloudKey,
    acrCloudSecret,
    acoustIdKey,
    fadrToken,
    lalalaiKey,
    moisesKey,
    gaudioKey,
    audioshakeKey,
    audiostripKey,
  } = apiKeys;

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const needsFadrToken = stemProvider === "fadr" || midiProvider === "fadr";
  const needsLalalaiKey = stemProvider === "lalalai";
  const needsMoisesKey = stemProvider === "moises";
  const needsGaudioKey = stemProvider === "gaudio";
  const needsAudioshakeKey = stemProvider === "audioshake";
  const needsAudiostripKey = stemProvider === "audiostrip";
  const hasApiKeysNeeded = needsFadrToken || needsLalalaiKey || needsMoisesKey || needsGaudioKey || needsAudioshakeKey || needsAudiostripKey;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <ThemedText type="body" style={styles.loadingText}>Loading settings...</ThemedText>
      </View>
    );
  }

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
        { text: "Low (64kbps)", onPress: () => updateProviderSettings({ recordingQuality: "Low" }) },
        {
          text: "Medium (128kbps)",
          onPress: () => updateProviderSettings({ recordingQuality: "Medium" }),
        },
        { text: "High (256kbps)", onPress: () => updateProviderSettings({ recordingQuality: "High" }) },
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
          <Feather name="sliders" size={24} color={Colors.dark.accent} />
        </View>
        <ThemedText type="body" style={styles.headerText}>
          Mix and match providers based on your needs. Plug in services you already use, or try new ones.
        </ThemedText>
      </View>

      <View style={styles.levelSection}>
        <LevelBadge level={1} required />
        <SettingsSection title="Music Recognition">
          <ThemedText type="caption" style={styles.sectionHint}>
            Required to identify songs. Choose your preferred recognition service.
          </ThemedText>
          <ProviderSelector
            providers={RECOGNITION_PROVIDERS}
            selectedId={recognitionProvider}
            onSelect={(id) => updateProviderSettings({ recognitionProvider: id as RecognitionProvider })}
          />
        </SettingsSection>

        {recognitionProvider === "acrcloud" ? (
          <SettingsSection title="ACRCloud Configuration">
            <SecureInputRow
              icon="key"
              label="Access Key"
              value={acrCloudKey}
              onChangeText={(text) => updateApiKey("acrCloudKey", text)}
              placeholder="Enter ACRCloud access key"
              tooltip={API_TOOLTIPS.acrCloudAccessKey}
            />
            <SecureInputRow
              icon="lock"
              label="Secret Key"
              value={acrCloudSecret}
              onChangeText={(text) => updateApiKey("acrCloudSecret", text)}
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
              onChangeText={(text) => updateApiKey("acoustIdKey", text)}
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
            Extract vocals, drums, bass, and instruments. Different services excel at different tasks.
          </ThemedText>
          <ProviderSelector
            providers={STEM_PROVIDERS}
            selectedId={stemProvider}
            onSelect={(id) => updateProviderSettings({ stemProvider: id as StemProvider })}
          />
        </SettingsSection>
      </View>

      <View style={styles.levelSection}>
        <LevelBadge level={3} required={false} />
        <SettingsSection title="MIDI Generation">
          <ThemedText type="caption" style={styles.sectionHint}>
            Convert audio to MIDI for DAW integration and music production.
          </ThemedText>
          <ProviderSelector
            providers={MIDI_PROVIDERS}
            selectedId={midiProvider}
            onSelect={(id) => updateProviderSettings({ midiProvider: id as MidiProvider })}
          />
        </SettingsSection>
      </View>

      {hasApiKeysNeeded ? (
        <SettingsSection title="Provider API Keys">
          <ThemedText type="caption" style={styles.sectionHint}>
            Enter credentials for your selected services.
          </ThemedText>
          {needsLalalaiKey ? (
            <SecureInputRow
              icon="key"
              label="LALAL.AI API Key"
              value={lalalaiKey}
              onChangeText={(text) => updateApiKey("lalalaiKey", text)}
              placeholder="Enter LALAL.AI API key"
              tooltip={API_TOOLTIPS.lalalai}
            />
          ) : null}
          {needsGaudioKey ? (
            <SecureInputRow
              icon="key"
              label="Gaudio Studio API Key"
              value={gaudioKey}
              onChangeText={(text) => updateApiKey("gaudioKey", text)}
              placeholder="Enter Gaudio API key"
              tooltip={API_TOOLTIPS.gaudio}
            />
          ) : null}
          {needsFadrToken ? (
            <SecureInputRow
              icon="key"
              label="Fadr API Token"
              value={fadrToken}
              onChangeText={(text) => updateApiKey("fadrToken", text)}
              placeholder="Enter Fadr bearer token"
              tooltip={API_TOOLTIPS.fadr}
            />
          ) : null}
          {needsMoisesKey ? (
            <SecureInputRow
              icon="key"
              label="Moises API Key"
              value={moisesKey}
              onChangeText={(text) => updateApiKey("moisesKey", text)}
              placeholder="Enter Moises API key"
              tooltip={API_TOOLTIPS.moises}
            />
          ) : null}
          {needsAudioshakeKey ? (
            <SecureInputRow
              icon="key"
              label="AudioShake / LANDR API"
              value={audioshakeKey}
              onChangeText={(text) => updateApiKey("audioshakeKey", text)}
              placeholder="Enter AudioShake credentials"
              tooltip={API_TOOLTIPS.audioshake}
            />
          ) : null}
          {needsAudiostripKey ? (
            <SecureInputRow
              icon="key"
              label="AudioStrip API Key"
              value={audiostripKey}
              onChangeText={(text) => updateApiKey("audiostripKey", text)}
              placeholder="Enter AudioStrip API key"
              tooltip={API_TOOLTIPS.audiostrip}
            />
          ) : null}
        </SettingsSection>
      ) : null}

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
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
    color: Colors.dark.text,
    fontWeight: "700",
  },
  requiredBadge: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  requiredText: {
    color: Colors.dark.text,
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
  providerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  providerName: {
    fontWeight: "600",
  },
  tierBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
  },
  providerPricing: {
    color: Colors.dark.accent,
  },
  providerDescription: {
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  localBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  localText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
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
