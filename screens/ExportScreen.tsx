import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ExportItem } from "@/components/ExportItem";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteType = RouteProp<RootStackParamList, "Export">;

const formatStemName = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1);
const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]+/gi, "_");

interface DownloadTarget {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

export default function ExportScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { metadata, stems = [] } = route.params;

  const title = metadata?.title || "Unknown Track";
  const artist = metadata?.artist || "Unknown Artist";

  const [downloadedStems, setDownloadedStems] = useState<Set<string>>(
    new Set(),
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleDownloadTarget = async (target: DownloadTarget) => {
    if (downloadedStems.has(target.id)) return;

    setDownloadingId(target.id);

    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.open(target.url, "_blank");
        }
      } else {
        const documentDirectory = FileSystem.documentDirectory;
        if (!documentDirectory) {
          throw new Error("Device document directory is unavailable");
        }

        const localUri = `${documentDirectory}${sanitizeFilename(target.name)}`;
        const result = await FileSystem.downloadAsync(target.url, localUri);
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(result.uri, {
            mimeType: target.mimeType,
            dialogTitle: target.name,
          });
        }
      }

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      setDownloadedStems((prev) => new Set([...prev, target.id]));
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Download Error", `Could not download ${target.name}.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const getDownloadTargets = (): DownloadTarget[] => {
    const stemTargets = stems.map((stem) => ({
      id: stem.id,
      name: `${formatStemName(stem.type)}.wav`,
      url: stem.url,
      mimeType: "audio/wav",
    }));

    const midiTargets = stems
      .filter((stem) => stem.hasMidi && stem.midiUrl)
      .map((stem) => ({
        id: `midi-${stem.id}`,
        name: `${formatStemName(stem.type)}.mid`,
        url: stem.midiUrl as string,
        mimeType: "audio/midi",
      }));

    return [...stemTargets, ...midiTargets];
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);

    for (const target of getDownloadTargets()) {
      await handleDownloadTarget(target);
    }

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsDownloadingAll(false);
  };

  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Share",
        "Share functionality is not available on web. Please use Expo Go on your mobile device.",
      );
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Share", "Sharing is not available on this device.");
      return;
    }

    try {
      await Share.share({
        message: `Check out my remix of "${title}" by ${artist} - created with TuneForge!`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const stemsWithMidi = stems.filter((s) => s.hasMidi);

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerSection}>
        <ThemedText type="h3">{title}</ThemedText>
        <ThemedText type="body" style={styles.artistText}>
          {artist}
        </ThemedText>
      </View>

      <Pressable
        onPress={handleDownloadAll}
        disabled={isDownloadingAll}
        style={({ pressed }) => [
          styles.downloadAllButton,
          {
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Feather
          name="download-cloud"
          size={24}
          color={Colors.dark.buttonText}
        />
        <View style={styles.downloadAllText}>
          <ThemedText type="bodyLarge" style={styles.downloadAllTitle}>
            Download Available Files
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
              onDownload={() =>
                handleDownloadTarget({
                  id: stem.id,
                  name: `${formatStemName(stem.type)}.wav`,
                  url: stem.url,
                  mimeType: "audio/wav",
                })
              }
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
                  stem.midiUrl
                    ? handleDownloadTarget({
                        id: `midi-${stem.id}`,
                        name: `${formatStemName(stem.type)}.mid`,
                        url: stem.midiUrl,
                        mimeType: "audio/midi",
                      })
                    : undefined
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
