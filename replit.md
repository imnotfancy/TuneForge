# TuneForge - AI Music Analyzer & Remixer

## Overview
TuneForge is a full-stack mobile app that allows users to record or upload audio clips for music recognition, metadata enrichment, and creative stem separation/remixing. Features a modular provider system allowing users to mix-and-match their preferred services for recognition, stem separation, and MIDI generation.

## Current State
- **Phase**: Backend Integration + Enhanced UX
- **Stack**: Expo React Native (SDK 54) + Node.js/Express Backend
- **Status**: Mobile app with onboarding, multiple input methods, and history gallery

## Architecture

### Frontend (Expo React Native)
- Stack-based navigation with the following screens:
  - `AudioInputScreen` - Main landing screen with:
    - Mode toggle (Record/Search/History)
    - Audio recording with Play/Hum toggle
    - Text-based song search with LLM suggestions
    - Song history gallery
    - Onboarding overlay for first-time users
    - Deep learning analyzing animation
  - `RecognitionResultsScreen` - Display job status and track metadata
  - `RemixProcessingScreen` - Stem separation progress and playback
  - `ExportScreen` - Download and share stems/MIDI (Modal)
  - `SettingsScreen` - API keys and preferences (Modal)

### Backend (Node.js/Express)
- **Port**: 3001
- **Database**: PostgreSQL with Drizzle ORM
- **Job Queue**: BullMQ for async processing
- **File Storage**: Local storage with expiration cleanup

### API Endpoints
```
GET  /api/health              - Health check
GET  /api/jobs                - List recent jobs
POST /api/jobs                - Create job from URL/ISRC
POST /api/jobs/upload         - Upload audio and create job
GET  /api/jobs/:id            - Get job status and metadata
GET  /api/jobs/:id/stems/:type - Download stem file
GET  /api/jobs/:id/download   - Get download info
POST /api/search/text         - LLM-powered text search for songs
POST /api/search/humming      - ACRCloud humming recognition
GET  /api/search/isrc/:isrc   - Lookup track by ISRC code
```

### Database Schema
- `jobs` - Track processing jobs with status, metadata, progress
- `assets` - Stem files and MIDI outputs
- `provider_configs` - API key storage and rate limiting

### Key Features
1. **Audio Recording** - 15-30 second capture with waveform visualization
2. **File Upload** - Support for MP3/WAV/FLAC/M4A files
3. **Music Recognition** - Songlink/Odesli for cross-platform track matching
4. **FLAC Acquisition** - Tidal/Deezer/Qobuz provider fallback
5. **Stem Separation** - 5 stems: Vocals, Drums, Bass, Melodies, Instrumental
6. **MIDI Generation** - For Vocals, Bass, and Melodies stems
7. **Export** - Individual stems or ZIP download, native share sheet

### File Structure
```
/server
  /src
    - index.ts (Express server entry)
    /routes
      - jobs.ts (Job API endpoints)
    /models
      - db.ts (Drizzle database connection)
      - schema.ts (Database schema)
    /services
      - songlink.ts (Track identification)
      /providers
        - index.ts (FLAC acquisition providers)
        - tidal.ts, deezer.ts, qobuz.ts
    /workers
      - jobProcessor.ts (Background job processing)

/services
  - api.ts (Frontend API client)

/screens
  - AudioInputScreen.tsx
  - RecognitionResultsScreen.tsx
  - RemixProcessingScreen.tsx
  - ExportScreen.tsx
  - SettingsScreen.tsx

/components
  - RecordButton.tsx, WaveformVisualizer.tsx, UploadButton.tsx
  - Timer.tsx, AlbumArtHero.tsx, MetadataCard.tsx
  - ConfidenceBadge.tsx, StemCard.tsx, ProgressBar.tsx
  - ExportItem.tsx, SettingsSection.tsx, LoadingOverlay.tsx
  - HeaderTitle.tsx, ErrorBoundary.tsx, ThemedText.tsx
  - ThemedView.tsx, ScreenScrollView.tsx, Button.tsx
  - SongSearchInput.tsx (LLM-powered search with suggestions)
  - AnalyzingAnimation.tsx (Neural network visualization)
  - SongHistoryGallery.tsx (Recent songs grid)
  - OnboardingOverlay.tsx (First-time user experience)

/hooks
  - useTheme.ts, useColorScheme.ts, useScreenInsets.ts
  - useAudioPlayer.tsx (Multi-track audio with solo/mute)

/constants
  - theme.ts (colors, spacing, typography, shadows)
```

## Design System
- **Theme**: Dark mode optimized for music production
- **Primary Accent**: #FF375F (Vibrant Red)
- **Secondary Accent**: #30D158 (Green for success states)
- **Typography**: System fonts with custom scale
- **Icons**: Feather icons from @expo/vector-icons

## Job Processing Flow
1. User searches/selects song → Creates job with spotify_id/apple_music_id/isrc
2. **Identify**: Odesli lookup enriches with platform IDs (Tidal, Deezer, Qobuz)
3. **Acquire**: Download FLAC using platform IDs (SpotiFLAC-inspired approach)
4. **Separate**: Stem separation via configured provider
5. **Generate MIDI**: MIDI generation for melodic stems
6. Assets expire after configurable time (default 24 hours)

### Source Types
- `spotify_id` - Spotify track ID (e.g., "7tFiyTwD0nx5a1eklYtX2J")
- `apple_music_id` - Apple Music track ID
- `isrc` - International Standard Recording Code
- `file_upload` - Direct audio file upload
- `spotify_url` - Spotify track URL
- `audio_url` - Direct audio URL

### Audio Acquisition Strategy (SpotiFLAC-inspired)
1. Use Odesli to get platform-specific track IDs (Tidal, Deezer, Qobuz)
2. Attempt download from each platform in priority order
3. Fall back to ISRC-based search if platform IDs unavailable
4. Clear error message if no provider configured

## Provider Configuration

### Music Recognition
| Provider | Description | Pricing |
|----------|-------------|---------|
| ACRCloud | Industry-leading accuracy | Free: 1,000/day |
| AcoustID | Open-source, MusicBrainz | Free |

### FLAC Acquisition
| Provider | Priority | Fallback |
|----------|----------|----------|
| Tidal | 1 | Yes |
| Deezer | 2 | Yes |
| Qobuz | 3 | Yes |

### Stem Separation
| Provider | Description | API Required |
|----------|-------------|--------------|
| LALAL.AI | Best vocals | Yes |
| Fadr | Full suite | Yes |
| UVR5 | Local processing | No |

### MIDI Generation
| Provider | Description | API Required |
|----------|-------------|--------------|
| Fadr | Melodies, chords | Yes |
| Basic Pitch | Open-source | No |

## Environment Variables
```
DATABASE_URL       - PostgreSQL connection string
REDIS_URL          - Redis for job queue (optional)
STORAGE_DIR        - File storage directory
PORT               - Backend server port (default 3001)
CORS_ORIGIN        - Allowed origins
OPENAI_API_KEY     - OpenAI API key for text search (optional)
ACRCLOUD_ACCESS_KEY   - ACRCloud access key for humming recognition
ACRCLOUD_ACCESS_SECRET - ACRCloud secret for HMAC signature
```

## Recent Changes
- Implemented SpotiFLAC-inspired ISRC/platform ID lookup using Odesli
- Extended database schema with spotify_id and apple_music_id source types
- Added createJobFromSong API with fallback logic (ISRC → Spotify → Apple Music)
- Job processor now enriches tracks with Tidal/Deezer/Qobuz IDs via Odesli
- Audio acquisition attempts download by platform ID before falling back to ISRC
- Added intuitive onboarding overlay for first-time users with 5-step carousel
- Implemented text-based song search using iTunes Search API with Odesli enrichment
- Added humming/singing recognition via ACRCloud API
- Created SongHistoryGallery showing recently analyzed songs
- Built AnalyzingAnimation with deep learning neural network visualization
- Extended theme with primary, primaryMuted, backgroundElevated, border colors
- Added mode toggle (Record/Search/History) on AudioInputScreen

## User Preferences
- Dark mode only (music production aesthetic)
- Privacy-focused: Local processing where possible
- No user accounts in prototype phase
- Haptic feedback on key interactions

## Next Steps
1. Set up OpenAI and ACRCloud API keys for search features
2. Add provider API integrations (LALAL.AI, Fadr for stem separation)
3. Implement actual stem separation processing
4. Add MIDI generation logic
5. Implement file download on mobile
6. Add local caching with AsyncStorage for offline history
