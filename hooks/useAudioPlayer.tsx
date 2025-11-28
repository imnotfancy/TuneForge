import { useState, useRef, useCallback, useEffect } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Platform } from "react-native";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  error: string | null;
}

interface UseAudioPlayerReturn {
  state: AudioPlayerState;
  play: (uri: string) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  togglePlayPause: (uri: string) => Promise<void>;
  currentUri: string | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    duration: 0,
    position: 0,
    error: null,
  });

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setState(prev => ({ ...prev, error: status.error ?? null, isPlaying: false, isLoading: false }));
      }
      return;
    }

    setState(prev => ({
      ...prev,
      isPlaying: status.isPlaying,
      isLoading: false,
      duration: status.durationMillis || 0,
      position: status.positionMillis || 0,
      error: null,
    }));

    if (status.didJustFinish) {
      setState(prev => ({ ...prev, isPlaying: false, position: 0 }));
    }
  }, []);

  const play = useCallback(async (uri: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current && currentUri !== uri) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
        setCurrentUri(uri);
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to play audio";
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      console.error("Audio playback error:", error);
    }
  }, [currentUri, onPlaybackStatusUpdate]);

  const pause = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
    } catch (error) {
      console.error("Pause error:", error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      }
    } catch (error) {
      console.error("Stop error:", error);
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(position);
      }
    } catch (error) {
      console.error("Seek error:", error);
    }
  }, []);

  const togglePlayPause = useCallback(async (uri: string) => {
    if (state.isPlaying && currentUri === uri) {
      await pause();
    } else {
      await play(uri);
    }
  }, [state.isPlaying, currentUri, pause, play]);

  return {
    state,
    play,
    pause,
    stop,
    seekTo,
    togglePlayPause,
    currentUri,
  };
}

interface MultiTrackPlayerState {
  playingTracks: Set<string>;
  mutedTracks: Set<string>;
  soloTrack: string | null;
  isLoading: Set<string>;
}

interface UseMultiTrackPlayerReturn {
  state: MultiTrackPlayerState;
  togglePlay: (trackId: string, uri?: string) => Promise<void>;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  stopAll: () => Promise<void>;
  isTrackPlaying: (trackId: string) => boolean;
  isTrackMuted: (trackId: string) => boolean;
  isTrackSolo: (trackId: string) => boolean;
}

export function useMultiTrackPlayer(): UseMultiTrackPlayerReturn {
  const soundsRef = useRef<Map<string, Audio.Sound>>(new Map());
  const [state, setState] = useState<MultiTrackPlayerState>({
    playingTracks: new Set(),
    mutedTracks: new Set(),
    soloTrack: null,
    isLoading: new Set(),
  });

  useEffect(() => {
    return () => {
      soundsRef.current.forEach(sound => sound.unloadAsync());
      soundsRef.current.clear();
    };
  }, []);

  const togglePlay = useCallback(async (trackId: string, uri?: string) => {
    const existingSound = soundsRef.current.get(trackId);
    
    if (state.playingTracks.has(trackId)) {
      if (existingSound) {
        await existingSound.pauseAsync();
      }
      setState(prev => {
        const next = new Set(prev.playingTracks);
        next.delete(trackId);
        return { ...prev, playingTracks: next };
      });
    } else {
      if (existingSound) {
        await existingSound.playAsync();
        setState(prev => {
          const next = new Set(prev.playingTracks);
          next.add(trackId);
          return { ...prev, playingTracks: next };
        });
      } else if (uri) {
        setState(prev => {
          const next = new Set(prev.isLoading);
          next.add(trackId);
          return { ...prev, isLoading: next };
        });
        
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
          
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
          );
          soundsRef.current.set(trackId, sound);
          
          setState(prev => {
            const playing = new Set(prev.playingTracks);
            playing.add(trackId);
            const loading = new Set(prev.isLoading);
            loading.delete(trackId);
            return { ...prev, playingTracks: playing, isLoading: loading };
          });
        } catch (error) {
          console.error("Failed to load audio:", error);
          setState(prev => {
            const loading = new Set(prev.isLoading);
            loading.delete(trackId);
            return { ...prev, isLoading: loading };
          });
        }
      }
    }
  }, [state.playingTracks]);

  const toggleMute = useCallback((trackId: string) => {
    setState(prev => {
      const next = new Set(prev.mutedTracks);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return { ...prev, mutedTracks: next };
    });
    
    const sound = soundsRef.current.get(trackId);
    if (sound) {
      sound.setIsMutedAsync(state.mutedTracks.has(trackId) ? false : true);
    }
  }, [state.mutedTracks]);

  const toggleSolo = useCallback((trackId: string) => {
    setState(prev => ({
      ...prev,
      soloTrack: prev.soloTrack === trackId ? null : trackId,
    }));
    
    const newSoloTrack = state.soloTrack === trackId ? null : trackId;
    soundsRef.current.forEach((sound, id) => {
      if (newSoloTrack === null) {
        sound.setIsMutedAsync(state.mutedTracks.has(id));
      } else {
        sound.setIsMutedAsync(id !== newSoloTrack);
      }
    });
  }, [state.soloTrack, state.mutedTracks]);

  const stopAll = useCallback(async () => {
    await Promise.all(
      Array.from(soundsRef.current.values()).map(sound => sound.stopAsync())
    );
    setState(prev => ({ ...prev, playingTracks: new Set() }));
  }, []);

  const isTrackPlaying = useCallback((trackId: string) => 
    state.playingTracks.has(trackId), [state.playingTracks]);
  
  const isTrackMuted = useCallback((trackId: string) => 
    state.mutedTracks.has(trackId), [state.mutedTracks]);
  
  const isTrackSolo = useCallback((trackId: string) => 
    state.soloTrack === trackId, [state.soloTrack]);

  return {
    state,
    togglePlay,
    toggleMute,
    toggleSolo,
    stopAll,
    isTrackPlaying,
    isTrackMuted,
    isTrackSolo,
  };
}
