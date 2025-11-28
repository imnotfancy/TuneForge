import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Pressable, 
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import tuneForgeAPI, { SongSuggestion } from "@/services/api";
import { searchMusicBrainz } from "@/services/musicbrainz";

interface SongSearchInputProps {
  onSelectSong: (song: SongSuggestion) => void;
  placeholder?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SongSearchInput({ onSelectSong, placeholder = "Search by title, lyrics, or describe a song..." }: SongSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'title' | 'lyrics' | 'description'>('title');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  const pulseValue = useSharedValue(1);
  
  const searchTypeButtons: { type: 'title' | 'lyrics' | 'description'; icon: string; label: string }[] = [
    { type: 'title', icon: 'music', label: 'Title' },
    { type: 'lyrics', icon: 'file-text', label: 'Lyrics' },
    { type: 'description', icon: 'message-circle', label: 'Describe' },
  ];

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setShowSuggestions(true);
    
    pulseValue.value = withSequence(
      withTiming(1.02, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );

    try {
      let results: SongSuggestion[] = [];
      
      if (searchType === 'title') {
        try {
          const result = await tuneForgeAPI.searchBySpotify(searchQuery, 10);
          results = result.suggestions;
        } catch {
          try {
            const result = await tuneForgeAPI.searchByText(searchQuery, searchType);
            results = result.suggestions;
          } catch {
            results = await searchMusicBrainz(searchQuery, 10);
          }
        }
      } else {
        try {
          const result = await tuneForgeAPI.searchByText(searchQuery, searchType);
          results = result.suggestions;
        } catch {
          results = await searchMusicBrainz(searchQuery, 10);
        }
      }
      
      setSuggestions(results);
      
      if (results.length > 0 && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search unavailable. Try recording or uploading audio instead.');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchType, pulseValue]);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  }, [performSearch]);

  const handleSelectSong = useCallback((song: SongSuggestion) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Keyboard.dismiss();
    setShowSuggestions(false);
    setQuery(`${song.title} - ${song.artist}`);
    onSelectSong(song);
  }, [onSelectSong]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const renderSuggestion = ({ item, index }: { item: SongSuggestion; index: number }) => (
    <Animated.View
      entering={SlideInDown.delay(index * 50).springify()}
    >
      <Pressable
        style={({ pressed }) => [
          styles.suggestionItem,
          pressed && styles.suggestionItemPressed,
        ]}
        onPress={() => handleSelectSong(item)}
      >
        <View style={styles.suggestionContent}>
          {item.albumArt ? (
            <Animated.Image
              source={{ uri: item.albumArt }}
              style={styles.albumThumb}
              entering={FadeIn.duration(200)}
            />
          ) : (
            <View style={[styles.albumThumb, styles.albumThumbPlaceholder]}>
              <Feather name="disc" size={20} color={Colors.dark.textSecondary} />
            </View>
          )}
          
          <View style={styles.suggestionText}>
            <ThemedText type="body" numberOfLines={1} style={styles.songTitle}>
              {item.title}
            </ThemedText>
            <ThemedText type="caption" numberOfLines={1} style={styles.artistName}>
              {item.artist}
              {item.album ? ` • ${item.album}` : ''}
            </ThemedText>
          </View>
          
          <View style={styles.confidenceContainer}>
            <View 
              style={[
                styles.confidenceBadge,
                item.confidence >= 0.8 ? styles.confidenceHigh :
                item.confidence >= 0.5 ? styles.confidenceMedium :
                styles.confidenceLow
              ]}
            >
              <ThemedText type="small" style={styles.confidenceText}>
                {Math.round(item.confidence * 100)}%
              </ThemedText>
            </View>
            {item.isrc ? (
              <Feather name="check-circle" size={14} color={Colors.dark.success} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.searchTypeRow}>
        {searchTypeButtons.map((btn) => (
          <Pressable
            key={btn.type}
            style={[
              styles.searchTypeButton,
              searchType === btn.type && styles.searchTypeButtonActive,
            ]}
            onPress={() => {
              setSearchType(btn.type);
              if (query.length >= 2) {
                performSearch(query);
              }
            }}
          >
            <Feather 
              name={btn.icon as keyof typeof Feather.glyphMap} 
              size={14} 
              color={searchType === btn.type ? Colors.dark.primary : Colors.dark.textSecondary} 
            />
            <ThemedText 
              type="small" 
              style={[
                styles.searchTypeLabel,
                searchType === btn.type && styles.searchTypeLabelActive,
              ]}
            >
              {btn.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      
      <View style={styles.inputContainer}>
        <Feather 
          name="search" 
          size={20} 
          color={isSearching ? Colors.dark.primary : Colors.dark.textSecondary} 
        />
        
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        
        {isSearching ? (
          <ActivityIndicator size="small" color={Colors.dark.primary} />
        ) : query.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Feather name="x-circle" size={20} color={Colors.dark.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showSuggestions && (suggestions.length > 0 || isSearching || error) ? (
        <Animated.View 
          style={styles.suggestionsContainer}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={20} color={Colors.dark.warning} />
              <ThemedText type="caption" style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : isSearching && suggestions.length === 0 ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color={Colors.dark.primary} />
              <ThemedText type="caption" style={styles.searchingText}>
                Finding matches...
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={renderSuggestion}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                !isSearching ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText type="caption" style={styles.emptyText}>
                      No matches found. Try a different search.
                    </ThemedText>
                  </View>
                ) : null
              }
            />
          )}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    justifyContent: 'center',
  },
  searchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  searchTypeButtonActive: {
    backgroundColor: Colors.dark.primaryMuted,
  },
  searchTypeLabel: {
    color: Colors.dark.textSecondary,
  },
  searchTypeLabelActive: {
    color: Colors.dark.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    paddingVertical: Spacing.xs,
  },
  suggestionsContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    maxHeight: 300,
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  suggestionItemPressed: {
    backgroundColor: Colors.dark.backgroundElevated,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  albumThumb: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  albumThumbPlaceholder: {
    backgroundColor: Colors.dark.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  songTitle: {
    color: Colors.dark.text,
  },
  artistName: {
    color: Colors.dark.textSecondary,
  },
  confidenceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  confidenceHigh: {
    backgroundColor: Colors.dark.successMuted,
  },
  confidenceMedium: {
    backgroundColor: Colors.dark.warningMuted,
  },
  confidenceLow: {
    backgroundColor: Colors.dark.backgroundElevated,
  },
  confidenceText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  searchingText: {
    color: Colors.dark.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.dark.warning,
  },
  emptyContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
});
