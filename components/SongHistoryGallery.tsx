import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import tuneForgeAPI from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

interface StemInfo {
  id: string;
  type: string;
  stemType: string | null;
  hasMidi: boolean | null;
}

interface HistoryItem {
  id: string;
  status: string;
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  progress: number;
  progressMessage?: string;
  createdAt: string;
  updatedAt: string;
  stems?: StemInfo[];
}

interface SongHistoryGalleryProps {
  onSelectSong: (jobId: string) => void;
  onNewSong?: () => void;
  maxItems?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SongHistoryGallery({ 
  onSelectSong, 
  onNewSong,
  maxItems = 10 
}: SongHistoryGalleryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchHistory = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }
    
    try {
      const jobs = await tuneForgeAPI.getRecentJobs(maxItems);
      
      if (!isMountedRef.current) return;
      
      setItems(Array.isArray(jobs) ? jobs : []);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Failed to fetch history:", err);
      setItems([]);
      setError("Couldn't load history");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [maxItems]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHistory();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchHistory]);

  const handleRefresh = useCallback(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  const handleSelectItem = useCallback((item: HistoryItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectSong(item.id);
  }, [onSelectSong]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.dark.success;
      case 'failed': return Colors.dark.error;
      case 'pending':
      case 'identifying':
      case 'acquiring':
      case 'separating':
      case 'generating_midi':
        return Colors.dark.warning;
      default: return Colors.dark.textSecondary;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'failed': return 'x-circle';
      case 'pending': return 'clock';
      default: return 'loader';
    }
  };

  const renderItem = ({ item, index }: { item: HistoryItem; index: number }) => (
    <HistoryCard 
      item={item} 
      index={index}
      onPress={() => handleSelectItem(item)}
      formatTimeAgo={formatTimeAgo}
      getStatusColor={getStatusColor}
      getStatusIcon={getStatusIcon}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h3" style={styles.headerTitle}>
        Recent
      </ThemedText>
      {onNewSong ? (
        <Pressable 
          style={styles.newButton}
          onPress={onNewSong}
        >
          <Feather name="plus" size={16} color={Colors.dark.primary} />
          <ThemedText type="small" style={styles.newButtonText}>
            New
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Feather name="alert-circle" size={32} color={Colors.dark.textSecondary} />
          <ThemedText type="body" style={styles.emptyText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => fetchHistory()}>
            <ThemedText type="small" style={styles.retryText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <Animated.View 
          style={styles.emptyContainer}
          entering={FadeIn.duration(300)}
        >
          <View style={styles.emptyIconContainer}>
            <Feather name="music" size={40} color={Colors.dark.textDisabled} />
          </View>
          <ThemedText type="body" style={styles.emptyText}>
            No songs analyzed yet
          </ThemedText>
          <ThemedText type="caption" style={styles.emptySubtext}>
            Record, upload, or search for a song to get started
          </ThemedText>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
            colors={[Colors.dark.primary]}
          />
        }
      />
    </View>
  );
}

function HistoryCard({ 
  item, 
  index, 
  onPress,
  formatTimeAgo,
  getStatusColor,
  getStatusIcon,
}: { 
  item: HistoryItem; 
  index: number;
  onPress: () => void;
  formatTimeAgo: (date: string) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => keyof typeof Feather.glyphMap;
}) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const isProcessing = ['pending', 'identifying', 'acquiring', 'separating', 'generating_midi'].includes(item.status);
  const stemCount = item.stems?.length ?? 0;
  const midiCount = item.stems?.filter(s => s.hasMidi)?.length ?? 0;

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={SlideInRight.delay(index * 50).springify()}
    >
      <View style={styles.cardImageContainer}>
        {item.albumArt ? (
          <Image
            source={{ uri: item.albumArt }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Feather name="disc" size={32} color={Colors.dark.textDisabled} />
          </View>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '30' }]}>
          <Feather 
            name={getStatusIcon(item.status)} 
            size={12} 
            color={getStatusColor(item.status)} 
          />
        </View>

        {stemCount > 0 ? (
          <View style={styles.stemsBadge}>
            <Feather name="layers" size={10} color={Colors.dark.text} />
            <ThemedText type="small" style={styles.stemsBadgeText}>
              {stemCount}
            </ThemedText>
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.progressOverlay}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${item.progress}%` }
                ]} 
              />
            </View>
          </View>
        ) : null}
      </View>
      
      <View style={styles.cardContent}>
        <ThemedText type="body" numberOfLines={1} style={styles.cardTitle}>
          {item.title || "Unknown Track"}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1} style={styles.cardArtist}>
          {item.artist || "Unknown Artist"}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText type="small" style={styles.cardTime}>
            {formatTimeAgo(item.createdAt)}
          </ThemedText>
          {midiCount > 0 ? (
            <View style={styles.midiBadge}>
              <Feather name="music" size={10} color={Colors.dark.secondary} />
              <ThemedText type="small" style={styles.midiBadgeText}>
                MIDI
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.dark.text,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.dark.primaryMuted,
    borderRadius: BorderRadius.pill,
  },
  newButtonText: {
    color: Colors.dark.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    gap: Spacing.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  emptySubtext: {
    color: Colors.dark.textDisabled,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.dark.primary,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
  row: {
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: Spacing.md,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.dark.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.dark.backgroundElevated,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.primary,
  },
  cardContent: {
    padding: Spacing.sm,
    gap: 2,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontWeight: "600",
  },
  cardArtist: {
    color: Colors.dark.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardTime: {
    color: Colors.dark.textDisabled,
  },
  stemsBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: BorderRadius.sm,
  },
  stemsBadgeText: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: "600",
  },
  midiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: Colors.dark.secondary + "20",
    borderRadius: BorderRadius.sm,
  },
  midiBadgeText: {
    color: Colors.dark.secondary,
    fontSize: 9,
    fontWeight: "600",
  },
});
