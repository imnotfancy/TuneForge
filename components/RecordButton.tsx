import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  WithSpringConfig,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { Colors, Spacing } from "@/constants/theme";

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RecordButton({ isRecording, onPress, disabled }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.6, { duration: 200 });
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        <Animated.View style={[styles.pulse, pulseStyle]} />
      ) : null}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          disabled && styles.buttonDisabled,
          buttonStyle,
        ]}
      >
        <Feather
          name={isRecording ? "square" : "mic"}
          size={48}
          color={Colors.dark.buttonText}
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.dark.accent,
  },
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.dark.backgroundSecondary,
  },
  buttonRecording: {
    backgroundColor: Colors.dark.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
