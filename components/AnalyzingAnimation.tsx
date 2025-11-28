import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CENTER_SIZE = 120;
const NUM_RINGS = 5;
const NUM_PARTICLES = 24;
const NUM_WAVES = 6;

interface AnalyzingAnimationProps {
  stage?: 'analyzing' | 'processing' | 'matching' | 'complete';
  progress?: number;
  message?: string;
}

export function AnalyzingAnimation({ 
  stage = 'analyzing', 
  progress = 0,
  message = "Analyzing audio patterns..."
}: AnalyzingAnimationProps) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const wavePhase = useSharedValue(0);
  const particleProgress = useSharedValue(0);
  const glowIntensity = useSharedValue(0.3);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
    
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    wavePhase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    
    particleProgress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
    
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      cancelAnimation(wavePhase);
      cancelAnimation(particleProgress);
      cancelAnimation(glowIntensity);
    };
  }, [rotation, pulse, wavePhase, particleProgress, glowIntensity]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const reverseRotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value * 0.7}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
    transform: [{ scale: interpolate(glowIntensity.value, [0.3, 0.8], [1, 1.1]) }],
  }));

  const rings = useMemo(() => {
    return Array.from({ length: NUM_RINGS }, (_, i) => ({
      id: `ring-${i}`,
      size: CENTER_SIZE + 30 + i * 25,
      delay: i * 200,
      opacity: 1 - i * 0.15,
    }));
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: NUM_PARTICLES }, (_, i) => ({
      id: `particle-${i}`,
      angle: (360 / NUM_PARTICLES) * i,
      distance: 80 + Math.random() * 40,
      size: 4 + Math.random() * 4,
      speed: 0.5 + Math.random() * 0.5,
    }));
  }, []);

  const waves = useMemo(() => {
    return Array.from({ length: NUM_WAVES }, (_, i) => ({
      id: `wave-${i}`,
      delay: i * 150,
      width: SCREEN_WIDTH * 0.6 + i * 20,
    }));
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <LinearGradient
          colors={['transparent', Colors.dark.primaryMuted, 'transparent']}
          style={styles.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {waves.map((wave) => (
        <AnimatedWave key={wave.id} {...wave} wavePhase={wavePhase} />
      ))}

      <Animated.View style={[styles.ringContainer, reverseRotatingStyle]}>
        {rings.map((ring) => (
          <AnimatedRing key={ring.id} {...ring} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.particleContainer, rotatingStyle]}>
        {particles.map((particle) => (
          <AnimatedParticle 
            key={particle.id} 
            {...particle} 
            particleProgress={particleProgress}
          />
        ))}
      </Animated.View>

      <Animated.View style={[styles.centerCore, centerStyle]}>
        <LinearGradient
          colors={[Colors.dark.primary, Colors.dark.primaryMuted, Colors.dark.primary]}
          style={styles.centerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.innerCore}>
            <NeuralNetwork />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.textContainer}>
        <ThemedText type="body" style={styles.stageText}>
          {stage === 'complete' ? 'Analysis Complete' : message}
        </ThemedText>
        {progress > 0 ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, progress)}%` }
                ]} 
              />
            </View>
            <ThemedText type="small" style={styles.progressText}>
              {Math.round(progress)}%
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AnimatedRing({ size, delay, opacity }: { size: number; delay: number; opacity: number }) {
  const scale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0.9, { duration: 2000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      )
    );
    
    ringOpacity.value = withDelay(delay, withTiming(opacity, { duration: 500 }));

    return () => {
      cancelAnimation(scale);
      cancelAnimation(ringOpacity);
    };
  }, [scale, ringOpacity, delay, opacity]);

  const style = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    transform: [{ scale: scale.value }],
    opacity: ringOpacity.value,
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

function AnimatedParticle({ 
  angle, 
  distance, 
  size, 
  speed,
  particleProgress 
}: { 
  angle: number; 
  distance: number; 
  size: number;
  speed: number;
  particleProgress: { value: number };
}) {
  const style = useAnimatedStyle(() => {
    const currentAngle = angle + particleProgress.value * 360 * speed;
    const radians = (currentAngle * Math.PI) / 180;
    const currentDistance = distance + Math.sin(particleProgress.value * Math.PI * 4) * 10;
    
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [
        { translateX: Math.cos(radians) * currentDistance },
        { translateY: Math.sin(radians) * currentDistance },
      ],
      opacity: 0.3 + Math.sin(particleProgress.value * Math.PI * 2 + angle) * 0.4,
    };
  });

  return <Animated.View style={[styles.particle, style]} />;
}

function AnimatedWave({ 
  delay, 
  width,
  wavePhase 
}: { 
  delay: number; 
  width: number;
  wavePhase: { value: number };
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    return () => cancelAnimation(opacity);
  }, [opacity, delay]);

  const style = useAnimatedStyle(() => {
    const phase = wavePhase.value + delay / 100;
    return {
      opacity: opacity.value * (0.2 + Math.sin(phase) * 0.15),
      transform: [
        { scaleY: 0.8 + Math.sin(phase + 1) * 0.2 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wave, { width }, style]}>
      <LinearGradient
        colors={['transparent', Colors.dark.primaryMuted, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
    </Animated.View>
  );
}

interface NeuralNodeData {
  id: string;
  x: number;
  y: number;
  layer: number;
}

function NeuralNetwork() {
  const nodes = useMemo(() => {
    const result: NeuralNodeData[] = [];
    const layers = [3, 5, 5, 3];
    let nodeId = 0;
    
    layers.forEach((count, layerIndex) => {
      const layerX = -30 + layerIndex * 20;
      for (let i = 0; i < count; i++) {
        const nodeY = -((count - 1) * 8) / 2 + i * 8;
        result.push({
          id: `node-${nodeId++}`,
          x: layerX,
          y: nodeY,
          layer: layerIndex,
        });
      }
    });
    
    return result;
  }, []);

  return (
    <View style={styles.neuralNetwork}>
      {nodes.map((node) => (
        <NeuralNode key={node.id} x={node.x} y={node.y} layer={node.layer} />
      ))}
    </View>
  );
}

function NeuralNode({ x, y, layer }: { x: number; y: number; layer: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      layer * 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 + Math.random() * 400 }),
          withTiming(0.3, { duration: 400 + Math.random() * 400 })
        ),
        -1,
        true
      )
    );
    return () => cancelAnimation(opacity);
  }, [opacity, layer]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: y },
    ],
  }));

  return <Animated.View style={[styles.neuralNode, style]} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: 320,
    width: "100%",
  },
  glowContainer: {
    position: "absolute",
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: "100%",
    height: "100%",
    borderRadius: 150,
  },
  ringContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  particleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    backgroundColor: Colors.dark.primary,
  },
  wave: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
  },
  centerCore: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    overflow: "hidden",
  },
  centerGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  innerCore: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.dark.background,
    borderRadius: CENTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  neuralNetwork: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  neuralNode: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.primary,
  },
  textContainer: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    gap: Spacing.sm,
  },
  stageText: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressTrack: {
    width: 120,
    height: 4,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.dark.textSecondary,
    width: 35,
    textAlign: "right",
  },
});
