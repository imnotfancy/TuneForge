# TuneForge - AI Music Analyzer & Remixer

## Overview
TuneForge is a mobile app that allows users to record or upload audio clips for music recognition, metadata enrichment, and creative stem separation/remixing. Features a modular provider system allowing users to mix-and-match their preferred services for recognition, stem separation, and MIDI generation.

## Current State
- **Phase**: Frontend Prototype (Design-First)
- **Stack**: Expo React Native (SDK 54)
- **Status**: UI prototype complete with leveled provider configuration

## Project Architecture

### Navigation Structure (Stack-Only)
- `AudioInputScreen` - Main landing screen with recording/upload
- `RecognitionResultsScreen` - Display identified track metadata
- `RemixProcessingScreen` - Stem separation progress and playback
- `ExportScreen` - Download and share stems/MIDI (Modal)
- `SettingsScreen` - API keys and preferences (Modal)

### Key Features
1. **Audio Recording** - 15-30 second capture with waveform visualization
2. **File Upload** - Support for MP3/WAV files
3. **Music Recognition** - ACRCloud primary, AcoustID fallback
4. **Stem Separation** - 5 stems: Vocals, Drums, Bass, Melodies, Instrumental
5. **MIDI Generation** - For Vocals, Bass, and Melodies stems
6. **Export** - Individual stems or ZIP download, native share sheet

### Design System
- **Theme**: Dark mode optimized for music production
- **Primary Accent**: #FF375F (Vibrant Red)
- **Secondary Accent**: #30D158 (Green for success states)
- **Typography**: System fonts with custom scale
- **Icons**: Feather icons from @expo/vector-icons

### File Structure
```
/navigation
  - RootStackNavigator.tsx (main navigation)
  - screenOptions.ts (shared screen options)

/screens
  - AudioInputScreen.tsx
  - RecognitionResultsScreen.tsx
  - RemixProcessingScreen.tsx
  - ExportScreen.tsx
  - SettingsScreen.tsx

/components
  - RecordButton.tsx
  - WaveformVisualizer.tsx
  - UploadButton.tsx
  - Timer.tsx
  - AlbumArtHero.tsx
  - MetadataCard.tsx
  - ConfidenceBadge.tsx
  - StemCard.tsx
  - ProgressBar.tsx
  - ExportItem.tsx
  - SettingsSection.tsx
  - LoadingOverlay.tsx
  - HeaderTitle.tsx
  - ErrorBoundary.tsx
  - ErrorFallback.tsx
  - ThemedText.tsx
  - ThemedView.tsx
  - ScreenScrollView.tsx
  - ScreenFlatList.tsx
  - ScreenKeyboardAwareScrollView.tsx
  - Button.tsx

/constants
  - theme.ts (colors, spacing, typography, shadows)

/hooks
  - useTheme.ts
  - useColorScheme.ts
  - useScreenInsets.ts
```

## Provider Configuration (Leveled System)

### Level 1 - Music Recognition (Required)
| Provider | Description | Pricing |
|----------|-------------|---------|
| ACRCloud | Industry-leading accuracy, extensive database | Free: 1,000/day |
| AcoustID | Open-source, MusicBrainz database | Free |

### Level 2 - Stem Separation (Optional)
| Provider | Description | Pricing | Requires API |
|----------|-------------|---------|--------------|
| LALAL.AI | Perseus neural network, best vocals | From $10/month | Yes |
| Gaudio Studio | GSEP model, token-based | From $5 | Yes |
| Fadr | Full suite with MIDI, plugins | $10/month | Yes |
| Moises | Great for live instruments | From $4/month | Yes |
| AudioShake (LANDR) | Major label AI | From $20/year | Yes |
| AudioStrip | Web-based, simple | Free tier | Yes |
| UVR5 | Open-source, local processing | Free | No |

### Level 3 - MIDI Generation (Optional)
| Provider | Description | Pricing | Requires API |
|----------|-------------|---------|--------------|
| Fadr | Melodies, chords, drums to MIDI | With subscription | Yes |
| Basic Pitch | Spotify open-source | Free | No |
| Hit'n'Mix RipX | Deep audio editing | $99+ one-time | No |

## User Preferences
- Dark mode only (music production aesthetic)
- Privacy-focused: Local processing where possible
- No user accounts in prototype phase
- Haptic feedback on key interactions

## Recent Changes
- Added leveled provider configuration system
- Expanded stem separation options: LALAL.AI, Gaudio, Fadr, Moises, AudioShake, AudioStrip, UVR5
- Added MIDI generation providers: Fadr, Basic Pitch, Hit'n'Mix RipX
- Provider cards show tier badges (Top Pick, Pro, Free)
- Local providers indicate "Runs locally - no API key needed"
- Dynamic API key fields based on selected providers
- Added FLAC and M4A format support
- API setup tooltips with step-by-step instructions

## Next Steps (Backend Phase)
1. Implement ACRCloud API integration
2. Add AcoustID fallback logic
3. Integrate Fadr API for stem separation
4. Add actual audio playback for stems
5. Implement file download/export functionality
6. Add local caching with AsyncStorage
