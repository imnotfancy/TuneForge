import React, { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AlbumArtHero } from "@/components/AlbumArtHero";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { MetadataCard } from "@/components/MetadataCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import tuneForgeAPI, { JobStatus } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "RecognitionResults">;
type RouteType = RouteProp<RootStackParamList, "RecognitionResults">;

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Preparing to process...",
  identifying: "Identifying track...",
  acquiring: "Acquiring high-quality audio...",
  separating: "Separating stems...",
  generating_midi: "Generating MIDI files...",
  completed: "Processing complete!",
  failed: "Processing failed",
};

export default function RecognitionResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { jobId } = route.params;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setRetryCount(prev => prev + 1);
      
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
    };
  }, [pollJobStatus, clearPolling]);

  const handleProcessStems = async () => {
    if (!job) return;

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    navigation.navigate("RemixProcessing", {
      jobId,
      metadata: job.metadata ? {
        title: job.metadata.title || "Unknown",
        artist: job.metadata.artist || "Unknown",
        album: job.metadata.album || "",
        albumArt: job.metadata.albumArt || null,
        confidence: 100,
        source: "acrcloud",
      } : undefined,
    });
  };

  const openExternalLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
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

  const isProcessing = ["pending", "identifying", "acquiring"].includes(job.status);
  const isComplete = job.status === "completed" || job.status === "separating" || job.status === "generating_midi";
  const hasStemData = job.stems && job.stems.length > 0;

  return (
    <View style={styles.wrapper}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {isProcessing ? (
          <View style={styles.processingSection}>
            <ActivityIndicator size="large" color={Colors.dark.accent} style={styles.processingSpinner} />
            <ThemedText type="h2" style={styles.processingTitle}>
              {STATUS_MESSAGES[job.status]}
            </ThemedText>
            <ProgressBar progress={job.progress} />
            {job.progressMessage ? (
              <ThemedText type="caption" style={styles.progressMessage}>
                {job.progressMessage}
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.heroSection}>
              <AlbumArtHero imageUrl={job.metadata?.albumArt || null} />
            </View>

            <View style={styles.infoSection}>
              <ThemedText type="hero" style={styles.trackTitle}>
                {job.metadata?.title || "Unknown Track"}
              </ThemedText>
              <ThemedText type="bodyLarge" style={styles.artistName}>
                {job.metadata?.artist || "Unknown Artist"}
              </ThemedText>

              {job.status === "completed" || job.status === "separating" || job.status === "generating_midi" ? (
                <ConfidenceBadge confidence={100} source="acrcloud" />
              ) : job.status === "failed" ? (
                <View style={styles.errorBadge}>
                  <Feather name="x-circle" size={16} color={Colors.dark.error} />
                  <ThemedText type="small" style={styles.errorBadgeText}>
                    Processing failed
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={styles.metadataSection}>
              {job.metadata?.album ? (
                <MetadataCard icon="disc" label="Album" value={job.metadata.album} />
              ) : null}
              {job.metadata?.isrc ? (
                <MetadataCard icon="hash" label="ISRC" value={job.metadata.isrc} />
              ) : null}
              {job.audioSource?.service ? (
                <MetadataCard icon="cloud" label="Source" value={job.audioSource.service} />
              ) : null}
              {job.audioSource?.format ? (
                <MetadataCard icon="file" label="Format" value={job.audioSource.format.toUpperCase()} />
              ) : null}
            </View>

            {job.status !== "completed" && job.status !== "failed" ? (
              <View style={styles.processingStatusSection}>
                <ProgressBar progress={job.progress} />
                <ThemedText type="caption" style={styles.statusText}>
                  {STATUS_MESSAGES[job.status] || job.progressMessage || "Processing..."}
                </ThemedText>
              </View>
            ) : null}

            {job.error ? (
              <View style={styles.errorSection}>
                <Feather name="alert-triangle" size={20} color={Colors.dark.error} />
                <ThemedText type="body" style={styles.errorSectionText}>
                  {job.error}
                </ThemedText>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.spacer} />
      </ScreenScrollView>

      {isComplete && !job.error ? (
        <View style={styles.floatingButtonContainer}>
          <Pressable
            onPress={handleProcessStems}
            style={({ pressed }) => [
              styles.processButton,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Feather name={hasStemData ? "play" : "sliders"} size={20} color={Colors.dark.buttonText} />
            <ThemedText type="body" style={styles.processButtonText}>
              {hasStemData ? "View Stems" : "Process Stems"}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  container: {
    gap: Spacing.lg,
    paddingBottom: 100,
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
  processingSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.lg,
  },
  processingSpinner: {
    marginBottom: Spacing.md,
  },
  processingTitle: {
    textAlign: "center",
    color: Colors.dark.text,
  },
  progressMessage: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
  },
  infoSection: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  trackTitle: {
    textAlign: "center",
  },
  artistName: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  metadataSection: {
    gap: Spacing.sm,
  },
  processingStatusSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  statusText: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  errorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark.error + "20",
    borderRadius: BorderRadius.sm,
  },
  errorBadgeText: {
    color: Colors.dark.error,
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
  spacer: {
    height: 40,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.dark.backgroundRoot,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.backgroundDefault,
  },
  processButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    ...Shadows.floating,
  },
  processButtonText: {
    color: Colors.dark.buttonText,
    fontWeight: "600",
  },
});
