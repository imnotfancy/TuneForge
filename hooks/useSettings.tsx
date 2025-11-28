import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type RecognitionProvider = "acrcloud" | "acoustid";
type StemProvider = "fadr" | "lalalai" | "moises" | "audioshake" | "gaudio" | "uvr5" | "audiostrip" | "none";
type MidiProvider = "fadr" | "basicpitch" | "ripx" | "none";
type RecordingQuality = "Low" | "Medium" | "High";

interface ProviderSettings {
  recognitionProvider: RecognitionProvider;
  stemProvider: StemProvider;
  midiProvider: MidiProvider;
  recordingQuality: RecordingQuality;
}

interface ApiKeys {
  acrCloudKey: string;
  acrCloudSecret: string;
  acoustIdKey: string;
  fadrToken: string;
  lalalaiKey: string;
  moisesKey: string;
  gaudioKey: string;
  audioshakeKey: string;
  audiostripKey: string;
}

interface SettingsContextType {
  providerSettings: ProviderSettings;
  apiKeys: ApiKeys;
  isLoading: boolean;
  updateProviderSettings: (settings: Partial<ProviderSettings>) => Promise<void>;
  updateApiKey: (key: keyof ApiKeys, value: string) => Promise<void>;
  clearAllSettings: () => Promise<void>;
  hasRequiredKeys: () => boolean;
}

const defaultProviderSettings: ProviderSettings = {
  recognitionProvider: "acrcloud",
  stemProvider: "lalalai",
  midiProvider: "fadr",
  recordingQuality: "High",
};

const defaultApiKeys: ApiKeys = {
  acrCloudKey: "",
  acrCloudSecret: "",
  acoustIdKey: "",
  fadrToken: "",
  lalalaiKey: "",
  moisesKey: "",
  gaudioKey: "",
  audioshakeKey: "",
  audiostripKey: "",
};

const SETTINGS_KEY = "tuneforge_settings";
const API_KEYS_PREFIX = "tuneforge_key_";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn("Failed to save to localStorage");
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn("Failed to save to SecureStore:", error);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn("Failed to remove from localStorage");
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn("Failed to delete from SecureStore:", error);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(defaultProviderSettings);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(defaultApiKeys);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsJson = await secureGet(SETTINGS_KEY);
      if (settingsJson) {
        const parsed = JSON.parse(settingsJson) as Partial<ProviderSettings>;
        setProviderSettings({ ...defaultProviderSettings, ...parsed });
      }

      const loadedKeys: Partial<ApiKeys> = {};
      for (const keyName of Object.keys(defaultApiKeys) as (keyof ApiKeys)[]) {
        const value = await secureGet(`${API_KEYS_PREFIX}${keyName}`);
        if (value) {
          loadedKeys[keyName] = value;
        }
      }
      setApiKeys({ ...defaultApiKeys, ...loadedKeys });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProviderSettings = useCallback(async (newSettings: Partial<ProviderSettings>) => {
    const updated = { ...providerSettings, ...newSettings };
    setProviderSettings(updated);
    await secureSet(SETTINGS_KEY, JSON.stringify(updated));
  }, [providerSettings]);

  const updateApiKey = useCallback(async (key: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
    if (value) {
      await secureSet(`${API_KEYS_PREFIX}${key}`, value);
    } else {
      await secureDelete(`${API_KEYS_PREFIX}${key}`);
    }
  }, []);

  const clearAllSettings = useCallback(async () => {
    setProviderSettings(defaultProviderSettings);
    setApiKeys(defaultApiKeys);
    await secureDelete(SETTINGS_KEY);
    for (const keyName of Object.keys(defaultApiKeys) as (keyof ApiKeys)[]) {
      await secureDelete(`${API_KEYS_PREFIX}${keyName}`);
    }
  }, []);

  const hasRequiredKeys = useCallback((): boolean => {
    const { recognitionProvider } = providerSettings;
    if (recognitionProvider === "acrcloud") {
      return !!(apiKeys.acrCloudKey && apiKeys.acrCloudSecret);
    }
    if (recognitionProvider === "acoustid") {
      return !!apiKeys.acoustIdKey;
    }
    return false;
  }, [providerSettings, apiKeys]);

  return (
    <SettingsContext.Provider
      value={{
        providerSettings,
        apiKeys,
        isLoading,
        updateProviderSettings,
        updateApiKey,
        clearAllSettings,
        hasRequiredKeys,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export type { RecognitionProvider, StemProvider, MidiProvider, RecordingQuality, ProviderSettings, ApiKeys };
