import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { RecordButton } from "@/components/RecordButton";
import { UploadButton } from "@/components/UploadButton";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { Timer } from "@/components/Timer";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Colors, Spacing } from "@/constants/theme";
import { RootStackParamList, TrackMetadata } from "@/navigation/RootStackNavigator";
import tuneForgeAPI from "@/services/api";

const MAX_RECORDING_SECONDS = 30;

const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/*",
];


type NavigationProp = NativeStackNavigationProp<RootStackParamList, "AudioInput">;

export default function AudioInputScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { paddingTop, paddingBottom, insets } = useScreenInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!permissionResponse?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            "Microphone Access Required",
            "Please enable microphone access in your device settings to record audio."
          );
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Recording Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setIsRecording(false);

        if (uri) {
          processAudio(uri);
        }
      } catch (error) {
        console.error("Failed to stop recording:", error);
        setIsRecording(false);
      }
    }
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_AUDIO_TYPES,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const fileName = asset.name?.toLowerCase() ?? "";
        const isSupported = 
          fileName.endsWith(".mp3") ||
          fileName.endsWith(".wav") ||
          fileName.endsWith(".flac") ||
          fileName.endsWith(".m4a") ||
          fileName.endsWith(".aac");

        if (!isSupported && asset.mimeType && !asset.mimeType.startsWith("audio/")) {
          Alert.alert(
            "Unsupported Format",
            "Please select an audio file (MP3, WAV, FLAC, or M4A)."
          );
          return;
        }

        processAudio(asset.uri);
      }
    } catch (error) {
      console.error("Failed to pick document:", error);
      Alert.alert("Upload Error", "Failed to upload file. Please try again.");
    }
  };

  const processAudio = async (uri: string) => {
    setIsProcessing(true);
    
    try {
      const { id } = await tuneForgeAPI.uploadAudioAndCreateJob(uri);
      
      setIsProcessing(false);
      
      navigation.navigate("RecognitionResults", {
        audioUri: uri,
        jobId: id,
      });
    } catch (error) {
      setIsProcessing(false);
      console.error("Failed to process audio:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process audio. Please try again."
      );
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop, paddingBottom }]}>
      <View style={styles.content}>
        <View style={styles.brandingSection}>
          <ThemedText type="h1" style={styles.title}>
            TuneForge
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Identify, analyze, and remix any song
          </ThemedText>
        </View>

        <View style={styles.recordSection}>
          <WaveformVisualizer isActive={isRecording} />
          
          {isRecording ? (
            <Timer seconds={recordingSeconds} maxSeconds={MAX_RECORDING_SECONDS} />
          ) : (
            <ThemedText type="small" style={styles.hint}>
              Tap to record 15-30 seconds of audio
            </ThemedText>
          )}

          <RecordButton
            isRecording={isRecording}
            onPress={handleRecordPress}
            disabled={isProcessing}
          />
        </View>

        <View style={styles.uploadSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText type="caption" style={styles.dividerText}>
              or
            </ThemedText>
            <View style={styles.dividerLine} />
          </View>

          <UploadButton onPress={handleUpload} disabled={isRecording || isProcessing} />
          
          <View style={styles.formatInfo}>
            <ThemedText type="caption" style={styles.formatText}>
              Supports MP3, WAV, FLAC, M4A
            </ThemedText>
          </View>
        </View>
      </View>

      <LoadingOverlay visible={isProcessing} message="Identifying track..." />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xl,
  },
  brandingSection: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    color: Colors.dark.text,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  recordSection: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  hint: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  uploadSection: {
    gap: Spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  dividerText: {
    color: Colors.dark.textSecondary,
  },
  formatInfo: {
    alignItems: "center",
  },
  formatText: {
    color: Colors.dark.textDisabled,
  },
});
