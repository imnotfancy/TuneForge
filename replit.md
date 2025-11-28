# TuneForge - AI Music Analyzer & Remixer

## Overview
TuneForge is a mobile app that allows users to record or upload audio clips for music recognition, metadata enrichment, and creative stem separation/remixing. The app uses ACRCloud (primary) and AcoustID (fallback) for music identification, and Fadr API for stem separation and MIDI generation.

## Current State
- **Phase**: Frontend Prototype (Design-First)
- **Stack**: Expo React Native (SDK 54)
- **Status**: UI prototype complete with mock data flow

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

## API Integration (Planned for Backend Phase)

### ACRCloud (Primary Recognition)
- Endpoint: POST `/v1/identify`
- Auth: API Key + Access Key with HMAC-SHA1 signing
- Free tier: 1,000 queries/day

### AcoustID (Fallback Recognition)
- Endpoint: POST `/v2/lookup`
- Auth: API Key
- Free: Unlimited non-commercial use

### Fadr API (Stem Separation)
- Upload → Create Asset → Create Task → Poll Status → Download
- Auth: Bearer Token (Fadr Plus subscription required)
- Outputs: 5 stems + MIDI files + key/tempo detection

## User Preferences
- Dark mode only (music production aesthetic)
- Privacy-focused: Local processing where possible
- No user accounts in prototype phase
- Haptic feedback on key interactions

## Recent Changes
- Initial frontend prototype created
- All screens and components implemented
- Mock data flow for testing
- App icon and branding assets generated

## Next Steps (Backend Phase)
1. Implement ACRCloud API integration
2. Add AcoustID fallback logic
3. Integrate Fadr API for stem separation
4. Add actual audio playback for stems
5. Implement file download/export functionality
6. Add local caching with AsyncStorage
