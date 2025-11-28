import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ONBOARDING_KEY = "@tuneforge_onboarding_complete";

interface OnboardingStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  highlight: 'record' | 'search' | 'upload' | null;
}

const STEPS: OnboardingStep[] = [
  {
    icon: "music",
    title: "Welcome to TuneForge",
    description: "Identify any song, separate stems, and create remixes with AI-powered analysis",
    highlight: null,
  },
  {
    icon: "mic",
    title: "Record or Hum",
    description: "Tap the microphone to record a song playing nearby, or hum a melody you remember",
    highlight: "record",
  },
  {
    icon: "search",
    title: "Search by Text",
    description: "Type a song name, paste lyrics, or describe what you're looking for",
    highlight: "search",
  },
  {
    icon: "upload",
    title: "Upload Audio",
    description: "Already have an audio file? Upload it directly for instant analysis",
    highlight: "upload",
  },
  {
    icon: "sliders",
    title: "Separate & Remix",
    description: "Extract vocals, drums, bass, and melodies. Download stems or generate MIDI",
    highlight: null,
  },
];

interface OnboardingOverlayProps {
  onComplete: () => void;
  forceShow?: boolean;
}

export function OnboardingOverlay({ onComplete, forceShow = false }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(forceShow);
  const [hasChecked, setHasChecked] = useState(false);
  
  const iconScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (forceShow) {
        setIsVisible(true);
        setHasChecked(true);
        return;
      }
      
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        setIsVisible(completed !== 'true');
      } catch (err) {
        console.log("Could not check onboarding status");
        setIsVisible(true);
      }
      setHasChecked(true);
    };
    
    checkOnboarding();
  }, [forceShow]);

  useEffect(() => {
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    progressWidth.value = withTiming((currentStep + 1) / STEPS.length, { duration: 300 });
  }, [currentStep, iconScale, progressWidth]);

  const handleNext = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, []);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (err) {
      console.log("Could not save onboarding status");
    }
    
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  if (!hasChecked || !isVisible) {
    return null;
  }

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <Animated.View 
      style={styles.overlay}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <ThemedText type="caption" style={styles.skipText}>Skip</ThemedText>
      </Pressable>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
        </View>
        <ThemedText type="small" style={styles.progressText}>
          {currentStep + 1} / {STEPS.length}
        </ThemedText>
      </View>

      <Animated.View 
        style={styles.content}
        entering={SlideInDown.springify().damping(15)}
        key={`step-${currentStep}`}
      >
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.primaryMuted]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={step.icon} size={48} color={Colors.dark.text} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.textContainer}>
          <ThemedText type="h1" style={styles.title}>
            {step.title}
          </ThemedText>
          <ThemedText type="body" style={styles.description}>
            {step.description}
          </ThemedText>
        </View>

        <View style={styles.dotsContainer}>
          {STEPS.map((_, index) => (
            <View 
              key={index}
              style={[
                styles.dot,
                index === currentStep && styles.dotActive,
                index < currentStep && styles.dotCompleted,
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <ThemedText type="body" style={styles.nextButtonText}>
            {isLastStep ? "Get Started" : "Next"}
          </ThemedText>
          <Feather 
            name={isLastStep ? "check" : "arrow-right"} 
            size={20} 
            color={Colors.dark.text} 
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export async function resetOnboarding() {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (err) {
    console.log("Could not reset onboarding");
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
    return completed === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: Spacing.xl,
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.dark.textSecondary,
  },
  progressContainer: {
    position: "absolute",
    top: 100,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.primary,
  },
  progressText: {
    color: Colors.dark.textSecondary,
    minWidth: 40,
    textAlign: "right",
  },
  content: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: {
    color: Colors.dark.text,
    textAlign: "center",
  },
  description: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  dotActive: {
    backgroundColor: Colors.dark.primary,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: Colors.dark.primaryMuted,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 60,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  nextButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    color: Colors.dark.text,
    fontWeight: "600",
  },
});
