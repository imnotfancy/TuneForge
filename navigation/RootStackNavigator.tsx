import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import AudioInputScreen from "@/screens/AudioInputScreen";
import RecognitionResultsScreen from "@/screens/RecognitionResultsScreen";
import RemixProcessingScreen from "@/screens/RemixProcessingScreen";
import ExportScreen from "@/screens/ExportScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Spacing } from "@/constants/theme";

export type TrackMetadata = {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  confidence: number;
  source: "acrcloud" | "acoustid";
  spotifyUrl?: string;
  youtubeUrl?: string;
  year?: string;
  genre?: string;
};

export type StemData = {
  id: string;
  type: "vocals" | "drums" | "bass" | "melodies" | "instrumental";
  url: string;
  hasMidi: boolean;
  midiUrl?: string;
};

export type RootStackParamList = {
  AudioInput: undefined;
  RecognitionResults: {
    audioUri: string;
    jobId: string;
  };
  RemixProcessing: {
    jobId: string;
    metadata?: TrackMetadata;
  };
  Export: {
    jobId: string;
    metadata?: TrackMetadata;
    stems?: StemData[];
  };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="AudioInput"
        component={AudioInputScreen}
        options={({ navigation }) => ({
          headerTitle: () => <HeaderTitle title="TuneForge" />,
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: Spacing.xs,
              })}
            >
              <Feather name="settings" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="RecognitionResults"
        component={RecognitionResultsScreen}
        options={{
          headerTitle: "Track Info",
        }}
      />
      <Stack.Screen
        name="RemixProcessing"
        component={RemixProcessingScreen}
        options={{
          headerTitle: "Processing",
        }}
      />
      <Stack.Screen
        name="Export"
        component={ExportScreen}
        options={{
          headerTitle: "Export",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
