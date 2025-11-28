import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Platform, Alert, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { RecordButton } from "@/components/RecordButton";
import { UploadButton } from "@/components/UploadButton";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { Timer } from "@/components/Timer";
import { SongSearchInput } from "@/components/SongSearchInput";
import { SongHistoryGallery } from "@/components/SongHistoryGallery";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { AnalyzingAnimation } from "@/components/AnalyzingAnimation";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import tuneForgeAPI, { SongSuggestion } from "@/services/api";

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

type InputMode = 'record' | 'search' | 'history';
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "AudioInput">;

export default function AudioInputScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const insets = useSafeAreaInsets();
  
  const [inputMode, setInputMode] = useState<InputMode>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Identifying track...");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isHummingMode, setIsHummingMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongSuggestion | null>(null);
  
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const historyKeyRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      historyKeyRef.current += 1;
    }, [])
  );

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
    setProcessingMessage("Uploading audio...");
    setProcessingProgress(10);
    
    try {
      setProcessingMessage("Analyzing audio patterns...");
      setProcessingProgress(30);
      
      const { id } = await tuneForgeAPI.uploadAudioAndCreateJob(uri);
      
      setProcessingMessage("Processing complete!");
      setProcessingProgress(100);
      
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        
        navigation.navigate("RecognitionResults", {
          audioUri: uri,
          jobId: id,
        });
      }, 500);
    } catch (error) {
      setIsProcessing(false);
      setProcessingProgress(0);
      console.error("Failed to process audio:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process audio. Please try again."
      );
    }
  };

  const handleSelectSong = async (song: SongSuggestion) => {
    setSelectedSong(song);
    
    if (!song.isrc) {
      Alert.alert(
        "Cannot Process",
        "This song doesn't have an ISRC code. Try recording or uploading the audio instead."
      );
      return;
    }
    
    setIsProcessing(true);
    setProcessingMessage("Finding high-quality audio...");
    setProcessingProgress(20);
    
    try {
      const { id } = await tuneForgeAPI.createJobFromISRC(song.isrc, {
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumArt: song.albumArt,
      });
      
      setProcessingMessage("Processing track...");
      setProcessingProgress(60);
      
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setSelectedSong(null);
        
        navigation.navigate("RecognitionResults", {
          audioUri: '',
          jobId: id,
        });
      }, 500);
    } catch (error) {
      setIsProcessing(false);
      setProcessingProgress(0);
      setSelectedSong(null);
      console.error("Failed to process song:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process this song. Please try again."
      );
    }
  };

  const handleSelectFromHistory = (jobId: string) => {
    navigation.navigate("RecognitionResults", {
      audioUri: '',
      jobId,
    });
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const renderModeToggle = () => (
    <View style={styles.modeToggle}>
      <Pressable
        style={[styles.modeButton, inputMode === 'record' && styles.modeButtonActive]}
        onPress={() => setInputMode('record')}
      >
        <Feather 
          name="mic" 
          size={18} 
          color={inputMode === 'record' ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
        <ThemedText 
          type="small" 
          style={[styles.modeButtonText, inputMode === 'record' && styles.modeButtonTextActive]}
        >
          Record
        </ThemedText>
      </Pressable>
      
      <Pressable
        style={[styles.modeButton, inputMode === 'search' && styles.modeButtonActive]}
        onPress={() => setInputMode('search')}
      >
        <Feather 
          name="search" 
          size={18} 
          color={inputMode === 'search' ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
        <ThemedText 
          type="small" 
          style={[styles.modeButtonText, inputMode === 'search' && styles.modeButtonTextActive]}
        >
          Search
        </ThemedText>
      </Pressable>
      
      <Pressable
        style={[styles.modeButton, inputMode === 'history' && styles.modeButtonActive]}
        onPress={() => setInputMode('history')}
      >
        <Feather 
          name="clock" 
          size={18} 
          color={inputMode === 'history' ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
        <ThemedText 
          type="small" 
          style={[styles.modeButtonText, inputMode === 'history' && styles.modeButtonTextActive]}
        >
          History
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderRecordMode = () => (
    <Animated.View 
      style={styles.recordModeContainer}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.hummingToggle}>
        <Pressable
          style={[styles.hummingButton, !isHummingMode && styles.hummingButtonActive]}
          onPress={() => setIsHummingMode(false)}
        >
          <Feather name="radio" size={16} color={!isHummingMode ? Colors.dark.text : Colors.dark.textSecondary} />
          <ThemedText type="small" style={!isHummingMode ? styles.hummingTextActive : styles.hummingText}>
            Play Audio
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.hummingButton, isHummingMode && styles.hummingButtonActive]}
          onPress={() => setIsHummingMode(true)}
        >
          <Feather name="music" size={16} color={isHummingMode ? Colors.dark.text : Colors.dark.textSecondary} />
          <ThemedText type="small" style={isHummingMode ? styles.hummingTextActive : styles.hummingText}>
            Hum / Sing
          </ThemedText>
        </Pressable>
      </View>

      <WaveformVisualizer isActive={isRecording} />
      
      {isRecording ? (
        <Timer seconds={recordingSeconds} maxSeconds={MAX_RECORDING_SECONDS} />
      ) : (
        <ThemedText type="small" style={styles.hint}>
          {isHummingMode 
            ? "Hum or sing the melody you remember"
            : "Tap to record 15-30 seconds of audio"
          }
        </ThemedText>
      )}

      <RecordButton
        isRecording={isRecording}
        onPress={handleRecordPress}
        disabled={isProcessing}
      />

      <View style={styles.uploadSection}>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText type="caption" style={styles.dividerText}>
            or
          </ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <UploadButton onPress={handleUpload} disabled={isRecording || isProcessing} />
        
        <ThemedText type="caption" style={styles.formatText}>
          Supports MP3, WAV, FLAC, M4A
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderSearchMode = () => (
    <Animated.View 
      style={styles.searchModeContainer}
      entering={SlideInUp.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.searchHeader}>
        <ThemedText type="h3" style={styles.searchTitle}>
          Find a Song
        </ThemedText>
        <ThemedText type="caption" style={styles.searchSubtitle}>
          Type a title, paste lyrics, or describe what you're looking for
        </ThemedText>
      </View>
      
      <SongSearchInput onSelectSong={handleSelectSong} />
      
      <View style={styles.searchTips}>
        <ThemedText type="small" style={styles.tipsTitle}>Tips:</ThemedText>
        <View style={styles.tipItem}>
          <Feather name="music" size={14} color={Colors.dark.textSecondary} />
          <ThemedText type="caption" style={styles.tipText}>
            "that song that goes la la la"
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <Feather name="user" size={14} color={Colors.dark.textSecondary} />
          <ThemedText type="caption" style={styles.tipText}>
            "upbeat dance song from 2023"
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <Feather name="file-text" size={14} color={Colors.dark.textSecondary} />
          <ThemedText type="caption" style={styles.tipText}>
            Paste partial lyrics to find the song
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderHistoryMode = () => (
    <Animated.View 
      style={styles.historyModeContainer}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      key={historyKeyRef.current}
    >
      <SongHistoryGallery 
        onSelectSong={handleSelectFromHistory}
        onNewSong={() => setInputMode('record')}
      />
    </Animated.View>
  );

  if (isProcessing) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <Animated.View 
          style={styles.processingContainer}
          entering={FadeIn.duration(300)}
        >
          <AnalyzingAnimation 
            stage="analyzing"
            progress={processingProgress}
            message={processingMessage}
          />
          
          {selectedSong ? (
            <View style={styles.selectedSongInfo}>
              <ThemedText type="body" style={styles.selectedSongTitle}>
                {selectedSong.title}
              </ThemedText>
              <ThemedText type="caption" style={styles.selectedSongArtist}>
                {selectedSong.artist}
              </ThemedText>
            </View>
          ) : null}
          
          <Pressable 
            style={styles.cancelButton}
            onPress={() => {
              setIsProcessing(false);
              setProcessingProgress(0);
              setSelectedSong(null);
            }}
          >
            <ThemedText type="small" style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop, paddingBottom }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandingSection}>
          <ThemedText type="h1" style={styles.title}>
            TuneForge
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Identify, analyze, and remix any song
          </ThemedText>
        </View>

        {renderModeToggle()}

        <View style={styles.modeContent}>
          {inputMode === 'record' && renderRecordMode()}
          {inputMode === 'search' && renderSearchMode()}
          {inputMode === 'history' && renderHistoryMode()}
        </View>
      </ScrollView>

      <OnboardingOverlay 
        onComplete={handleOnboardingComplete}
        forceShow={showOnboarding}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  brandingSection: {
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.dark.text,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: Colors.dark.backgroundElevated,
  },
  modeButtonText: {
    color: Colors.dark.textSecondary,
  },
  modeButtonTextActive: {
    color: Colors.dark.primary,
  },
  modeContent: {
    flex: 1,
    minHeight: 400,
  },
  recordModeContainer: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  hummingToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.pill,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  hummingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  hummingButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  hummingText: {
    color: Colors.dark.textSecondary,
  },
  hummingTextActive: {
    color: Colors.dark.text,
  },
  hint: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  uploadSection: {
    width: "100%",
    gap: Spacing.md,
    marginTop: Spacing.md,
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
  formatText: {
    color: Colors.dark.textDisabled,
    textAlign: "center",
  },
  searchModeContainer: {
    gap: Spacing.lg,
  },
  searchHeader: {
    gap: Spacing.xs,
  },
  searchTitle: {
    color: Colors.dark.text,
  },
  searchSubtitle: {
    color: Colors.dark.textSecondary,
  },
  searchTips: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tipsTitle: {
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tipText: {
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  historyModeContainer: {
    flex: 1,
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  selectedSongInfo: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  selectedSongTitle: {
    color: Colors.dark.text,
    textAlign: "center",
  },
  selectedSongArtist: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
  },
});
