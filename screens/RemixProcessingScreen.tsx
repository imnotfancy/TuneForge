import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  StyleSheet,
  View,
  Alert,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import { StemCard } from "@/components/StemCard";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, StemData } from "@/navigation/RootStackNavigator";
import { useMultiTrackPlayer } from "@/hooks/useAudioPlayer";
import { tuneForgeAPI, JobStatus } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RemixProcessing"
>;
type RouteType = RouteProp<RootStackParamList, "RemixProcessing">;

const STEM_TYPES = [
  "vocals",
  "drums",
  "bass",
  "melody",
  "instrumental",
] as const;

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Preparing to process...",
  identifying: "Identifying track...",
  acquiring: "Acquiring high-quality audio...",
  separating: "Separating stems...",
  generating_midi: "Generating MIDI files...",
  completed: "Complete!",
  failed: "Processing failed",
};

export default function RemixProcessingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { jobId, metadata } = route.params;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    togglePlay,
    toggleMute,
    toggleSolo,
    stopAll,
    isTrackPlaying,
    isTrackMuted,
    isTrackSolo,
  } = useMultiTrackPlayer();

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const status = await tuneForgeAPI.getJobStatus(jobId);

      if (!isMountedRef.current) return;

      setJob(status);
      setIsLoading(false);
      setRetryCount(0);

      if (status.status === "completed" || status.status === "failed") {
        clearPolling();
        if (status.status === "completed" && Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error("Failed to fetch job status:", err);
      setRetryCount((prev) => prev + 1);

      if (retryCount >= 3) {
        clearPolling();
        setError("Unable to connect to server. Please check your connection.");
        setIsLoading(false);
      }
    }
  }, [jobId, retryCount, clearPolling]);

  useEffect(() => {
    isMountedRef.current = true;

    pollJobStatus();

    pollIntervalRef.current = setInterval(pollJobStatus, 2000);

    return () => {
      isMountedRef.current = false;
      clearPolling();
      stopAll();
    };
  }, [pollJobStatus, clearPolling, stopAll]);

  const isComplete = job?.status === "completed";
  const stems: StemData[] = useMemo(
    () =>
      job?.stems?.map((stem) => ({
        id: stem.id,
        type: (stem.type === "melody"
          ? "melodies"
          : stem.type) as StemData["type"],
        url: stem.downloadUrl
          ? tuneForgeAPI.toAbsoluteUrl(stem.downloadUrl)
          : tuneForgeAPI.getStemDownloadUrl(jobId, stem.type),
        hasMidi: stem.hasMidi,
        midiUrl: stem.hasMidi
          ? stem.midiUrl
            ? tuneForgeAPI.toAbsoluteUrl(stem.midiUrl)
            : tuneForgeAPI.getStemDownloadUrl(jobId, stem.type, "midi")
          : undefined,
      })) || [],
    [job?.stems, jobId],
  );

  const handleExport = useCallback(() => {
    navigation.navigate("Export", {
      jobId,
      metadata:
        metadata ||
        (job?.metadata
          ? {
              title: job.metadata.title || "Unknown",
              artist: job.metadata.artist || "Unknown",
              album: job.metadata.album || "",
              albumArt: job.metadata.albumArt || null,
              confidence: 100,
              source: "acrcloud",
            }
          : undefined),
      stems,
    });
  }, [job?.metadata, jobId, metadata, navigation, stems]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleExport}
          disabled={!isComplete}
          style={({ pressed }) => ({
            opacity: isComplete ? (pressed ? 0.6 : 1) : 0.3,
            padding: Spacing.xs,
          })}
        >
          <Feather
            name="share"
            size={24}
            color={isComplete ? Colors.dark.text : Colors.dark.textDisabled}
          />
        </Pressable>
      ),
    });
  }, [handleExport, isComplete, navigation]);

  const handlePlayPress = async (stemId: string, stemUrl?: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await togglePlay(stemId, stemUrl);
  };

  const handleMutePress = (stemId: string) => {
    toggleMute(stemId);
  };

  const handleSoloPress = (stemId: string) => {
    toggleSolo(stemId);
  };

  const handleCancel = () => {
    Alert.alert(
      "Leave Processing",
      "Processing may continue on the server. You can return from History when it finishes.",
      [
        { text: "Continue", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <ThemedText type="body" style={styles.loadingText}>
          Loading job status...
        </ThemedText>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="alert-circle" size={48} color={Colors.dark.error} />
        <ThemedText type="body" style={styles.errorText}>
          {error || "Failed to load job"}
        </ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            pollJobStatus();
          }}
        >
          <ThemedText type="body" style={styles.retryButtonText}>
            Retry
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const title = metadata?.title || job.metadata?.title || "Unknown Track";
  const artist = metadata?.artist || job.metadata?.artist || "Unknown Artist";
  const status =
    STATUS_MESSAGES[job.status] || job.progressMessage || "Processing...";

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerSection}>
        <ThemedText type="h3">{title}</ThemedText>
        <ThemedText type="body" style={styles.artistText}>
          {artist}
        </ThemedText>
      </View>

      <View style={styles.progressSection}>
        <ProgressBar progress={job.progress} status={status} />
      </View>

      {job.analysis?.key || job.analysis?.tempo ? (
        <View style={styles.analysisSection}>
          {job.analysis?.key ? (
            <View style={styles.analysisPill}>
              <ThemedText type="caption" style={styles.analysisLabel}>
                KEY
              </ThemedText>
              <ThemedText type="body" style={styles.analysisValue}>
                {job.analysis.key}
              </ThemedText>
            </View>
          ) : null}
          {job.analysis?.tempo ? (
            <View style={styles.analysisPill}>
              <ThemedText type="caption" style={styles.analysisLabel}>
                BPM
              </ThemedText>
              <ThemedText type="body" style={styles.analysisValue}>
                {Math.round(job.analysis.tempo)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.stemsSection}>
        <ThemedText type="caption" style={styles.sectionLabel}>
          STEMS
        </ThemedText>
        <View style={styles.stemsList}>
          {STEM_TYPES.map((type, index) => {
            const displayType = type === "melody" ? "melodies" : type;
            const stem = stems.find(
              (s) => s.type === displayType || s.type === type,
            );
            const stemId = stem?.id ?? type;
            const isLoadingStems = !isComplete;
            const stemProgress = isLoadingStems
              ? Math.min(100, Math.max(0, (job.progress - index * 15) * 2))
              : 100;

            return (
              <StemCard
                key={type}
                type={displayType as StemData["type"]}
                isPlaying={isTrackPlaying(stemId)}
                isMuted={isTrackMuted(stemId)}
                isSolo={isTrackSolo(stemId)}
                hasMidi={stem?.hasMidi ?? false}
                isLoading={isLoadingStems}
                progress={stemProgress}
                onPlayPress={() => handlePlayPress(stemId, stem?.url)}
                onMutePress={() => handleMutePress(stemId)}
                onSoloPress={() => handleSoloPress(stemId)}
              />
            );
          })}
        </View>
      </View>

      {job.error ? (
        <View style={styles.errorSection}>
          <Feather name="alert-triangle" size={20} color={Colors.dark.error} />
          <ThemedText type="body" style={styles.errorSectionText}>
            {job.error}
          </ThemedText>
        </View>
      ) : null}

      {!isComplete ? (
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText type="body" style={styles.cancelText}>
            Cancel
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleExport}
          style={({ pressed }) => [
            styles.exportButton,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Feather name="download" size={20} color={Colors.dark.buttonText} />
          <ThemedText type="body" style={styles.exportButtonText}>
            Export Stems
          </ThemedText>
        </Pressable>
      )}
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
    backgroundColor: Colors.dark.backgroundRoot,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
  },
  errorText: {
    color: Colors.dark.error,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark.accent,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
  headerSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  artistText: {
    color: Colors.dark.textSecondary,
  },
  progressSection: {
    backgroundColor: Colors.dark.backgroundDefault,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  analysisSection: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  analysisPill: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundDefault,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  analysisLabel: {
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
  },
  analysisValue: {
    color: Colors.dark.text,
    fontWeight: "700",
  },
  stemsSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: Spacing.xs,
  },
  stemsList: {
    gap: Spacing.sm,
  },
  errorSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.dark.error + "20",
    borderRadius: BorderRadius.sm,
  },
  errorSectionText: {
    flex: 1,
    color: Colors.dark.error,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  exportButtonText: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
});
