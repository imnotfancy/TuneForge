# TuneForge

**AI-Powered Music Analyzer & Remixer**

TuneForge is a full-stack mobile application that enables users to identify songs, extract high-quality audio stems, and generate MIDI files for creative remixing. Built with Expo React Native and Node.js, it features a modular provider system for music recognition, FLAC acquisition, stem separation, and MIDI generation.

## Current Status

> **Development Phase**: Core infrastructure complete. Provider integrations require API keys.

### Implemented
- Multi-source song search (iTunes, Spotify, MusicBrainz, OpenAI-powered)
- Humming/singing recognition via ACRCloud
- Cross-platform track ID resolution via Odesli/song.link
- Job processing pipeline with status tracking
- Audio file upload with format validation
- Database schema for jobs, assets, and provider configs

### Requires Configuration
- FLAC acquisition (Tidal/Deezer/Qobuz API credentials needed)
- Stem separation (LALAL.AI/Fadr API credentials needed)
- MIDI generation (Fadr/Basic Pitch integration pending)

## Features

- **Multiple Input Methods**
  - Audio recording with waveform visualization
  - Text-based song search with real-time suggestions
  - Humming/singing recognition (requires ACRCloud)
  - File upload (MP3, WAV, FLAC, M4A, AAC, OGG)

- **Cross-Platform Track Matching**
  - iTunes Search API for song discovery
  - Odesli/song.link for cross-platform ID enrichment
  - Automatic ISRC, Spotify, Apple Music, Tidal, Deezer, Qobuz ID lookup

- **Audio Processing Pipeline** *(requires provider API keys)*
  - FLAC acquisition from streaming services (Tidal, Deezer, Qobuz)
  - 5-stem separation (Vocals, Drums, Bass, Melodies, Instrumental)
  - MIDI generation for melodic stems

- **User Experience**
  - Intuitive onboarding for first-time users
  - Song history gallery with stem/MIDI indicators
  - Deep learning visualization animations
  - Dark mode optimized for music production

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Expo React Native App                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AudioInput  │  │ Recognition │  │ RemixProcessing     │  │
│  │ Screen      │  │ Results     │  │ Screen              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js/Express Backend                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Search API  │  │ Jobs API    │  │ Job Processor       │  │
│  │ /api/search │  │ /api/jobs   │  │ (Background Worker) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ PostgreSQL│       │ Odesli/   │       │ Provider  │
    │ Database  │       │ song.link │       │ APIs      │
    └───────────┘       └───────────┘       └───────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile App | Expo React Native (SDK 54) |
| Navigation | React Navigation 7+ |
| Backend | Node.js + Express |
| Database | PostgreSQL + Drizzle ORM |
| Job Processing | In-process async (BullMQ optional) |
| Track ID | iTunes, Spotify, MusicBrainz, Odesli |
| FLAC Source | Tidal, Deezer, Qobuz APIs *(requires keys)* |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for job queue)
- Expo Go app (for mobile testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/imnotfancy/TuneForge.git
   cd TuneForge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Required
   DATABASE_URL=postgresql://user:password@host:5432/tuneforge
   
   # Optional - for enhanced features
   REDIS_URL=redis://localhost:6379
   OPENAI_API_KEY=sk-...           # Text search suggestions
   ACRCLOUD_ACCESS_KEY=...         # Humming recognition
   ACRCLOUD_ACCESS_SECRET=...
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

6. **Test on mobile**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)

## API Reference

### Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/text` | Text-based song search |
| POST | `/api/search/humming` | Humming/singing recognition |
| GET | `/api/search/isrc/:isrc` | Lookup by ISRC code |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List recent jobs |
| POST | `/api/jobs` | Create new job |
| POST | `/api/jobs/upload` | Upload audio file |
| GET | `/api/jobs/:id` | Get job status |
| GET | `/api/jobs/:id/stems/:type` | Download stem |

## Context Generation Pipeline

TuneForge progressively enriches minimal input into rich track metadata:

```
┌────────────────────────────────────────────────────────────────────┐
│  INPUT              →  ENRICHMENT           →  OUTPUT               │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  "song title"       →  iTunes + Odesli      →  Full metadata +      │
│                                                 platform IDs         │
│                                                                      │
│  Spotify ID         →  Odesli lookup        →  Tidal, Deezer,       │
│  "7tFiyTwD..."                                  Qobuz IDs + ISRC    │
│                                                                      │
│  Humming audio      →  ACRCloud API         →  Title, artist,       │
│                                                 confidence score     │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Search** → Query iTunes/Spotify/MusicBrainz
2. **Enrich** → Odesli adds cross-platform IDs (tidalId, deezerId, qobuzId)
3. **Store** → `songlinkData` JSON preserves all platform context
4. **Acquire** → Platform IDs enable direct API access for FLAC downloads

## Job Processing Flow

```
1. Create Job (spotify_id / apple_music_id / isrc / file_upload)
         │
         ▼
2. Identify & Enrich
   └── Odesli lookup → Extract ALL platform IDs:
       • tidalId: "36737274"
       • deezerId: "568115892"
       • qobuzId: "..."
       • isrc: "GBUM71029604"
         │
         ▼
3. Acquire FLAC Audio (SpotiFLAC Strategy)
   └── Try by platform ID: Tidal → Deezer → Qobuz
   └── Fallback: ISRC search on each provider
         │
         ▼
4. Separate Stems *(requires provider API)*
   └── Vocals, Drums, Bass, Melodies, Instrumental
         │
         ▼
5. Generate MIDI *(requires provider API)*
   └── For Vocals, Bass, Melodies stems
         │
         ▼
6. Complete → Assets available for 24 hours
```

## Provider Configuration

### FLAC Acquisition Providers

| Provider | Priority | Description |
|----------|----------|-------------|
| Tidal | 1 | Hi-Res FLAC, MQA |
| Deezer | 2 | CD-quality FLAC |
| Qobuz | 3 | Hi-Res up to 24-bit/192kHz |

### Stem Separation Providers

| Provider | Description |
|----------|-------------|
| LALAL.AI | Best vocal isolation |
| Fadr | Full stem suite |
| UVR5 | Local processing |

### MIDI Generation Providers

| Provider | Description |
|----------|-------------|
| Fadr | Melodies, chords, drums |
| Basic Pitch | Open-source, local |

## Project Structure

```
TuneForge/
├── app/                    # Expo app entry
├── screens/                # Screen components
│   ├── AudioInputScreen.tsx
│   ├── RecognitionResultsScreen.tsx
│   ├── RemixProcessingScreen.tsx
│   ├── ExportScreen.tsx
│   └── SettingsScreen.tsx
├── components/             # Reusable components
│   ├── SongSearchInput.tsx
│   ├── AnalyzingAnimation.tsx
│   ├── SongHistoryGallery.tsx
│   └── OnboardingOverlay.tsx
├── services/               # Frontend API client
│   └── api.ts
├── hooks/                  # Custom React hooks
├── constants/              # Theme, colors, spacing
├── navigation/             # React Navigation setup
├── server/                 # Backend server
│   └── src/
│       ├── index.ts        # Express entry
│       ├── routes/         # API routes
│       ├── models/         # Database schema
│       ├── services/       # External integrations
│       │   ├── songlink.ts
│       │   ├── itunes.ts
│       │   └── providers/  # FLAC providers
│       └── workers/        # Background processing
└── docs/                   # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC) - Inspiration for ISRC/platform ID lookup strategy
- [Odesli/song.link](https://odesli.co/) - Cross-platform music link API
- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) - Song discovery

## License

This project is for educational purposes. Respect copyright laws and terms of service of all integrated platforms.

---

**Built with Replit Agent**
