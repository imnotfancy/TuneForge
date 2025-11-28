import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Alert, Platform, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import { StemCard } from "@/components/StemCard";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList, StemData } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "RemixProcessing">;
type RouteType = RouteProp<RootStackParamList, "RemixProcessing">;

const STEM_TYPES = ["vocals", "drums", "bass", "melodies", "instrumental"] as const;

const mockStems: StemData[] = [
  { id: "1", type: "vocals", url: "", hasMidi: true, midiUrl: "" },
  { id: "2", type: "drums", url: "", hasMidi: false },
  { id: "3", type: "bass", url: "", hasMidi: true, midiUrl: "" },
  { id: "4", type: "melodies", url: "", hasMidi: true, midiUrl: "" },
  { id: "5", type: "instrumental", url: "", hasMidi: false },
];

export default function RemixProcessingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { metadata } = route.params;

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Uploading track...");
  const [isComplete, setIsComplete] = useState(false);
  const [stems, setStems] = useState<StemData[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [soloId, setSoloId] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    simulateProcessing();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

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
  }, [isComplete, navigation]);

  const simulateProcessing = async () => {
    const stages = [
      { progress: 10, status: "Uploading track...", duration: 500 },
      { progress: 25, status: "Analyzing audio...", duration: 800 },
      { progress: 40, status: "Separating stems...", duration: 1200 },
      { progress: 60, status: "Processing vocals...", duration: 800 },
      { progress: 75, status: "Generating MIDI...", duration: 1000 },
      { progress: 90, status: "Finalizing...", duration: 600 },
      { progress: 100, status: "Complete!", duration: 300 },
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, stage.duration));
      setProgress(stage.progress);
      setStatus(stage.status);
    }

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsComplete(true);
    setStems(mockStems);
  };

  const handleExport = () => {
    navigation.navigate("Export", {
      metadata,
      stems,
    });
  };

  const handlePlayPress = async (stemId: string) => {
    if (playingId === stemId) {
      setPlayingId(null);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      setPlayingId(stemId);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleMutePress = (stemId: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stemId)) {
        next.delete(stemId);
      } else {
        next.add(stemId);
      }
      return next;
    });
  };

  const handleSoloPress = (stemId: string) => {
    setSoloId((prev) => (prev === stemId ? null : stemId));
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Processing",
      "Stop processing and discard results?",
      [
        { text: "Continue", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerSection}>
        <ThemedText type="h3">{metadata.title}</ThemedText>
        <ThemedText type="body" style={styles.artistText}>
          {metadata.artist}
        </ThemedText>
      </View>

      <View style={styles.progressSection}>
        <ProgressBar progress={progress} status={status} />
      </View>

      <View style={styles.stemsSection}>
        <ThemedText type="caption" style={styles.sectionLabel}>
          STEMS
        </ThemedText>
        <View style={styles.stemsList}>
          {STEM_TYPES.map((type, index) => {
            const stem = stems.find((s) => s.type === type);
            const isLoading = !isComplete;
            const stemProgress = isLoading
              ? Math.min(100, Math.max(0, (progress - index * 15) * 2))
              : 100;

            return (
              <StemCard
                key={type}
                type={type}
                isPlaying={playingId === (stem?.id ?? type)}
                isMuted={mutedIds.has(stem?.id ?? type)}
                isSolo={soloId === (stem?.id ?? type)}
                hasMidi={stem?.hasMidi ?? (type !== "drums" && type !== "instrumental")}
                isLoading={isLoading}
                progress={stemProgress}
                onPlayPress={() => handlePlayPress(stem?.id ?? type)}
                onMutePress={() => handleMutePress(stem?.id ?? type)}
                onSoloPress={() => handleSoloPress(stem?.id ?? type)}
              />
            );
          })}
        </View>
      </View>

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
