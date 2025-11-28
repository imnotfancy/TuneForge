# TuneForge - AI Music Analyzer & Remixer

## Overview
TuneForge is a full-stack mobile app that allows users to record or upload audio clips for music recognition, metadata enrichment, and creative stem separation/remixing. Features a modular provider system allowing users to mix-and-match their preferred services for recognition, stem separation, and MIDI generation.

## Current State
- **Phase**: Backend Integration
- **Stack**: Expo React Native (SDK 54) + Node.js/Express Backend
- **Status**: Mobile app integrated with backend API for job processing

## Architecture

### Frontend (Expo React Native)
- Stack-based navigation with the following screens:
  - `AudioInputScreen` - Main landing screen with recording/upload
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
GET  /api/health          - Health check
GET  /api/jobs            - List recent jobs
POST /api/jobs            - Create job from URL/ISRC
POST /api/jobs/upload     - Upload audio and create job
GET  /api/jobs/:id        - Get job status and metadata
GET  /api/jobs/:id/stems/:type   - Download stem file
GET  /api/jobs/:id/download      - Get download info
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
1. User uploads audio → Creates job in `pending` status
2. Job moves through: `identifying` → `acquiring` → `separating` → `generating_midi`
3. Each stage updates progress (0-100) and progressMessage
4. Completed jobs have stems available for download
5. Assets expire after configurable time (default 24 hours)

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
```

## Recent Changes
- Integrated mobile app with backend API
- Job-based async processing with status polling
- Real-time progress updates in RecognitionResultsScreen
- RemixProcessingScreen polls job status for stem results
- API client with retry logic and error handling
- ProgressBar component supports optional status text

## User Preferences
- Dark mode only (music production aesthetic)
- Privacy-focused: Local processing where possible
- No user accounts in prototype phase
- Haptic feedback on key interactions

## Next Steps
1. Add provider API integrations (ACRCloud, LALAL.AI, Fadr)
2. Implement actual stem separation processing
3. Add MIDI generation logic
4. Implement file download on mobile
5. Add local caching with AsyncStorage
6. Polish error handling and retry logic
