import React from "react";
import { StyleSheet, View, Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { Colors, BorderRadius, Spacing } from "@/constants/theme";

interface AlbumArtHeroProps {
  imageUrl: string | null;
  size?: number;
}

export function AlbumArtHero({ imageUrl, size = 280 }: AlbumArtHeroProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width: size, height: size }]}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Feather name="disc" size={80} color={Colors.dark.textSecondary} />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    alignSelf: "center",
  },
  image: {
    borderRadius: BorderRadius.md,
  },
  placeholder: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
});
