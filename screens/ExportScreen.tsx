import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, Share } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ExportItem } from "@/components/ExportItem";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteType = RouteProp<RootStackParamList, "Export">;

const formatStemName = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

export default function ExportScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { metadata, stems } = route.params;

  const [downloadedStems, setDownloadedStems] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadStem = async (stemId: string, name: string) => {
    if (downloadedStems.has(stemId)) return;

    setDownloadingId(stemId);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setDownloadedStems((prev) => new Set([...prev, stemId]));
    setDownloadingId(null);

    Alert.alert("Downloaded", `${name} has been saved to your device.`);
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);

    for (const stem of stems) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownloadedStems((prev) => new Set([...prev, stem.id, `midi-${stem.id}`]));
    }

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsDownloadingAll(false);
    Alert.alert("Downloaded", "All stems and MIDI files have been saved to your device.");
  };

  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Share", "Share functionality is not available on web. Please use Expo Go on your mobile device.");
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Share", "Sharing is not available on this device.");
      return;
    }

    try {
      await Share.share({
        message: `Check out my remix of "${metadata.title}" by ${metadata.artist} - created with TuneForge!`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const stemsWithMidi = stems.filter((s) => s.hasMidi);

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerSection}>
        <ThemedText type="h3">{metadata.title}</ThemedText>
        <ThemedText type="body" style={styles.artistText}>
          {metadata.artist}
        </ThemedText>
      </View>

      <Pressable
        onPress={handleDownloadAll}
        disabled={isDownloadingAll}
        style={({ pressed }) => [
          styles.downloadAllButton,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Feather name="download-cloud" size={24} color={Colors.dark.buttonText} />
        <View style={styles.downloadAllText}>
          <ThemedText type="bodyLarge" style={styles.downloadAllTitle}>
            Download All as ZIP
          </ThemedText>
          <ThemedText type="caption" style={styles.downloadAllSubtitle}>
            {stems.length} stems + {stemsWithMidi.length} MIDI files
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.section}>
        <ThemedText type="caption" style={styles.sectionLabel}>
          AUDIO STEMS
        </ThemedText>
        <View style={styles.grid}>
          {stems.map((stem) => (
            <ExportItem
              key={stem.id}
              name={`${formatStemName(stem.type)}.wav`}
              type="stem"
              fileSize="~8.2 MB"
              isDownloading={downloadingId === stem.id}
              isDownloaded={downloadedStems.has(stem.id)}
              onDownload={() => handleDownloadStem(stem.id, formatStemName(stem.type))}
            />
          ))}
        </View>
      </View>

      {stemsWithMidi.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionLabel}>
            MIDI FILES
          </ThemedText>
          <View style={styles.grid}>
            {stemsWithMidi.map((stem) => (
              <ExportItem
                key={`midi-${stem.id}`}
                name={`${formatStemName(stem.type)}.mid`}
                type="midi"
                fileSize="~24 KB"
                isDownloading={downloadingId === `midi-${stem.id}`}
                isDownloaded={downloadedStems.has(`midi-${stem.id}`)}
                onDownload={() =>
                  handleDownloadStem(`midi-${stem.id}`, `${formatStemName(stem.type)} MIDI`)
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [
          styles.shareButton,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="share-2" size={20} color={Colors.dark.text} />
        <ThemedText type="body">Share</ThemedText>
      </Pressable>

      <Pressable
        onPress={() => navigation.goBack()}
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
  headerSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  artistText: {
    color: Colors.dark.textSecondary,
  },
  downloadAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.accent,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    ...Shadows.floating,
  },
  downloadAllText: {
    flex: 1,
  },
  downloadAllTitle: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
  downloadAllSubtitle: {
    color: Colors.dark.buttonText,
    opacity: 0.8,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: Spacing.xs,
  },
  grid: {
    gap: Spacing.sm,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: BorderRadius.sm,
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  doneText: {
    color: Colors.dark.accent,
    fontWeight: "600",
  },
});
