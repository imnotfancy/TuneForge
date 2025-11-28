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
  const stateRef = useRef<MultiTrackPlayerState>({
    playingTracks: new Set(),
    mutedTracks: new Set(),
    soloTrack: null,
    isLoading: new Set(),
  });
  const [state, setState] = useState<MultiTrackPlayerState>(stateRef.current);

  const updateState = useCallback((updater: (prev: MultiTrackPlayerState) => MultiTrackPlayerState) => {
    setState(prev => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      soundsRef.current.forEach(sound => sound.unloadAsync());
      soundsRef.current.clear();
    };
  }, []);

  const createStatusListener = useCallback((trackId: string) => {
    return (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      
      if (status.didJustFinish || !status.isPlaying) {
        updateState(prev => {
          const next = new Set(prev.playingTracks);
          if (status.didJustFinish || !status.isPlaying) {
            next.delete(trackId);
          }
          return { ...prev, playingTracks: next };
        });
      } else if (status.isPlaying) {
        updateState(prev => {
          const next = new Set(prev.playingTracks);
          next.add(trackId);
          return { ...prev, playingTracks: next };
        });
      }
    };
  }, [updateState]);

  const applyMuteState = useCallback((sound: Audio.Sound, trackId: string) => {
    const currentState = stateRef.current;
    if (currentState.soloTrack !== null) {
      sound.setIsMutedAsync(trackId !== currentState.soloTrack);
    } else {
      sound.setIsMutedAsync(currentState.mutedTracks.has(trackId));
    }
  }, []);

  const togglePlay = useCallback(async (trackId: string, uri?: string) => {
    const existingSound = soundsRef.current.get(trackId);
    const currentlyPlaying = stateRef.current.playingTracks.has(trackId);
    
    if (currentlyPlaying) {
      if (existingSound) {
        await existingSound.pauseAsync();
      }
    } else {
      if (existingSound) {
        await existingSound.setPositionAsync(0);
        await existingSound.playAsync();
      } else if (uri) {
        updateState(prev => {
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
            { shouldPlay: true },
            createStatusListener(trackId)
          );
          soundsRef.current.set(trackId, sound);
          
          applyMuteState(sound, trackId);
          
          updateState(prev => {
            const playing = new Set(prev.playingTracks);
            playing.add(trackId);
            const loading = new Set(prev.isLoading);
            loading.delete(trackId);
            return { ...prev, playingTracks: playing, isLoading: loading };
          });
        } catch (error) {
          console.error("Failed to load audio:", error);
          updateState(prev => {
            const loading = new Set(prev.isLoading);
            loading.delete(trackId);
            return { ...prev, isLoading: loading };
          });
        }
      }
    }
  }, [createStatusListener, applyMuteState, updateState]);

  const toggleMute = useCallback((trackId: string) => {
    const currentlyMuted = stateRef.current.mutedTracks.has(trackId);
    const newMutedState = !currentlyMuted;
    
    updateState(prev => {
      const next = new Set(prev.mutedTracks);
      if (newMutedState) {
        next.add(trackId);
      } else {
        next.delete(trackId);
      }
      return { ...prev, mutedTracks: next };
    });
    
    const sound = soundsRef.current.get(trackId);
    if (sound && stateRef.current.soloTrack === null) {
      sound.setIsMutedAsync(newMutedState);
    }
  }, [updateState]);

  const toggleSolo = useCallback((trackId: string) => {
    const currentSolo = stateRef.current.soloTrack;
    const newSoloTrack = currentSolo === trackId ? null : trackId;
    
    updateState(prev => ({
      ...prev,
      soloTrack: newSoloTrack,
    }));
    
    soundsRef.current.forEach((sound, id) => {
      if (newSoloTrack === null) {
        sound.setIsMutedAsync(stateRef.current.mutedTracks.has(id));
      } else {
        sound.setIsMutedAsync(id !== newSoloTrack);
      }
    });
  }, [updateState]);

  const stopAll = useCallback(async () => {
    await Promise.all(
      Array.from(soundsRef.current.values()).map(sound => sound.stopAsync())
    );
    updateState(prev => ({ ...prev, playingTracks: new Set() }));
  }, [updateState]);

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
