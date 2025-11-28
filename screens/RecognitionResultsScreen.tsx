import React, { useState } from "react";
import { StyleSheet, View, Pressable, Alert, Linking, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { AlbumArtHero } from "@/components/AlbumArtHero";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { MetadataCard } from "@/components/MetadataCard";
import { Button } from "@/components/Button";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "RecognitionResults">;
type RouteType = RouteProp<RootStackParamList, "RecognitionResults">;

export default function RecognitionResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { audioUri, metadata } = route.params;
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  const handleProcessStems = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Process Stems",
      "This will upload the full track to Fadr for processing. This may take a few minutes. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            navigation.navigate("RemixProcessing", {
              audioUri,
              metadata,
            });
          },
        },
      ]
    );
  };

  const openExternalLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <AlbumArtHero imageUrl={metadata.albumArt} />
        </View>

        <View style={styles.infoSection}>
          <ThemedText type="hero" style={styles.trackTitle}>
            {metadata.title}
          </ThemedText>
          <ThemedText type="bodyLarge" style={styles.artistName}>
            {metadata.artist}
          </ThemedText>
          
          <ConfidenceBadge confidence={metadata.confidence} source={metadata.source} />
        </View>

        <View style={styles.metadataSection}>
          <MetadataCard icon="disc" label="Album" value={metadata.album} />
          {metadata.year ? (
            <MetadataCard icon="calendar" label="Year" value={metadata.year} />
          ) : null}
          {metadata.genre ? (
            <MetadataCard icon="music" label="Genre" value={metadata.genre} />
          ) : null}
        </View>

        {(metadata.spotifyUrl || metadata.youtubeUrl) ? (
          <View style={styles.linksSection}>
            <ThemedText type="caption" style={styles.sectionLabel}>
              LISTEN ON
            </ThemedText>
            <View style={styles.linksRow}>
              {metadata.spotifyUrl ? (
                <Pressable
                  onPress={() => openExternalLink(metadata.spotifyUrl!)}
                  style={({ pressed }) => [
                    styles.linkButton,
                    styles.spotifyButton,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="music" size={20} color="#1DB954" />
                  <ThemedText type="body" style={styles.linkText}>
                    Spotify
                  </ThemedText>
                </Pressable>
              ) : null}
              {metadata.youtubeUrl ? (
                <Pressable
                  onPress={() => openExternalLink(metadata.youtubeUrl!)}
                  style={({ pressed }) => [
                    styles.linkButton,
                    styles.youtubeButton,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="youtube" size={20} color="#FF0000" />
                  <ThemedText type="body" style={styles.linkText}>
                    YouTube
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.spacer} />
      </ScreenScrollView>

      <View style={styles.floatingButtonContainer}>
        <Pressable
          onPress={handleProcessStems}
          style={({ pressed }) => [
            styles.processButton,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Feather name="sliders" size={20} color={Colors.dark.buttonText} />
          <ThemedText type="body" style={styles.processButtonText}>
            Process Stems
          </ThemedText>
        </Pressable>
      </View>
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
  sectionLabel: {
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  linksSection: {
    marginTop: Spacing.sm,
  },
  linksRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  linkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  spotifyButton: {
    backgroundColor: "#1DB95420",
  },
  youtubeButton: {
    backgroundColor: "#FF000020",
  },
  linkText: {
    fontWeight: "600",
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
