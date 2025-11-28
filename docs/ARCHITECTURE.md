# TuneForge Architecture

## System Overview

TuneForge is a full-stack application consisting of an Expo React Native mobile app and a Node.js/Express backend. The system processes music through a pipeline that identifies tracks, acquires high-quality audio, separates stems, and generates MIDI files.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Mobile App (Expo)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Audio Input  │  │   Search     │  │    Results/Remix         │  │
│  │  - Record    │  │  - Text      │  │    - Stem Player         │  │
│  │  - Upload    │  │  - Humming   │  │    - MIDI Export         │  │
│  │  - History   │  │  - History   │  │    - Share               │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js/Express)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ API Routes   │  │ Job Queue    │  │   Job Processor          │  │
│  │  - /search   │  │  (BullMQ)    │  │   - Identify             │  │
│  │  - /jobs     │  │              │  │   - Acquire              │  │
│  │              │  │              │  │   - Separate             │  │
│  │              │  │              │  │   - Generate MIDI        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
         │                   │                      │
         ▼                   ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐
│  PostgreSQL  │    │    Redis     │    │    External Services     │
│   Database   │    │   (Queue)    │    │  - iTunes Search API     │
│              │    │              │    │  - Odesli/song.link      │
│              │    │              │    │  - Tidal/Deezer/Qobuz    │
│              │    │              │    │  - ACRCloud              │
│              │    │              │    │  - LALAL.AI/Fadr         │
└──────────────┘    └──────────────┘    └──────────────────────────┘
```

## Frontend Architecture

### Navigation Structure

```
RootNavigator
├── MainStack
│   ├── AudioInputScreen (Home)
│   ├── RecognitionResultsScreen
│   └── RemixProcessingScreen
└── Modals
    ├── ExportScreen
    └── SettingsScreen
```

### Component Hierarchy

```
App
├── ErrorBoundary
├── GestureHandlerRootView
└── NavigationContainer
    └── RootNavigator
        └── Screens
            ├── AudioInputScreen
            │   ├── HeaderTitle
            │   ├── ModeToggle (Record/Search/History)
            │   ├── RecordButton / SongSearchInput / SongHistoryGallery
            │   ├── AnalyzingAnimation
            │   └── OnboardingOverlay
            ├── RecognitionResultsScreen
            │   ├── AlbumArtHero
            │   ├── MetadataCard
            │   └── ConfidenceBadge
            └── RemixProcessingScreen
                ├── ProgressBar
                └── StemCard[]
```

### State Management

The app uses React's built-in state management:
- `useState` for component-local state
- `AsyncStorage` for persisted preferences
- API responses cached in component state

### API Client

```typescript
// services/api.ts
const tuneForgeAPI = {
  searchText(query: string): Promise<SearchResult[]>
  searchByHumming(audioUri: string): Promise<SearchResult[]>
  createJobFromSong(song: SongSuggestion): Promise<{ id: string }>
  uploadAudio(audioUri: string): Promise<{ id: string }>
  getJobStatus(jobId: string): Promise<JobStatus>
  getRecentJobs(): Promise<Job[]>
}
```

## Backend Architecture

### Layer Structure

```
┌─────────────────────────────────────────┐
│              API Routes                  │
│   /api/search, /api/jobs                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              Services                    │
│   songlink.ts, itunes.ts, spotify.ts,   │
│   songstats.ts, providers/              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              Job Processor               │
│   jobProcessor.ts (in-process async)    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              Models                      │
│   schema.ts, db.ts (Drizzle + Postgres) │
└─────────────────────────────────────────┘
```

**Note**: Job processing runs in-process using async/await. BullMQ/Redis is optional for scaling.

### Database Schema

```sql
-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status job_status NOT NULL DEFAULT 'pending',
  source_type source_type NOT NULL,
  source_value TEXT NOT NULL,
  isrc TEXT,
  spotify_id TEXT,
  title TEXT,
  artist TEXT,
  album TEXT,
  album_art TEXT,
  duration INTEGER,
  songlink_data JSONB,
  master_audio_path TEXT,
  master_audio_format TEXT,
  master_audio_service TEXT,
  progress INTEGER DEFAULT 0,
  progress_message TEXT,
  error_message TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  stem_type stem_type,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  has_midi BOOLEAN DEFAULT FALSE,
  midi_path TEXT,
  provider TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Job Processing Pipeline

```
1. CREATE JOB
   └── Insert job record with source_type and source_value
   
2. IDENTIFY STEP
   ├── spotify_id → Odesli lookup → Get platform IDs
   ├── apple_music_id → Odesli lookup → Get platform IDs
   ├── isrc → Odesli lookup → Get metadata
   └── spotify_url → Odesli lookup → Extract track info
   
3. ACQUIRE STEP
   ├── Try Tidal ID → Download FLAC
   ├── Try Deezer ID → Download FLAC
   ├── Try Qobuz ID → Download FLAC
   └── Fallback: ISRC search
   
4. SEPARATE STEP
   └── Provider (LALAL.AI/Fadr/UVR5) → 5 stems
   
5. MIDI GENERATION STEP
   └── Provider (Fadr/Basic Pitch) → MIDI for melodic stems
   
6. COMPLETE
   └── Set expiry, update status
```

### Provider System

```typescript
// Provider interface
interface StreamingProvider {
  name: string;
  priority: number;
  isConfigured(): boolean;
  configure(credentials: ProviderCredentials): void;
  searchByIsrc(isrc: string): Promise<string | null>;
  downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult>;
}

// Provider Manager
class ProviderManager {
  providers: StreamingProvider[] = [
    new TidalProvider(),   // Priority 1
    new DeezerProvider(),  // Priority 2
    new QobuzProvider(),   // Priority 3
  ];
  
  async downloadByPlatformIds(ids, outputPath): Promise<DownloadResult>
  async downloadByIsrc(isrc, outputPath): Promise<DownloadResult>
}
```

## Data Flow & Context Generation

TuneForge uses a multi-stage context enrichment pipeline that progressively builds metadata from minimal input.

### Context Generation Overview

The system transforms minimal user input (a song name, Spotify ID, or humming) into rich track context:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Context Generation Pipeline                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   INPUT                    ENRICHMENT                 OUTPUT          │
│   ─────                    ──────────                 ──────          │
│                                                                       │
│   "bohemian rhapsody"  ─┬→ iTunes Search ────→ Track metadata         │
│                         │                       (title, artist,       │
│                         │                        album, artwork)      │
│                         │                                             │
│                         └→ Odesli/song.link ─→ Platform IDs           │
│                                                (spotifyId, tidalId,   │
│                                                 deezerId, qobuzId,    │
│                                                 appleMusicId, ISRC)   │
│                                                                       │
│   Spotify ID           ─→ Odesli lookup ────→ Full songlinkData      │
│   "7tFiyTwD..."           • Extract all platform-specific IDs         │
│                           • Resolve ISRC code                         │
│                           • Get canonical metadata                    │
│                                                                       │
│   ISRC Code            ─→ Odesli ISRC API ──→ Reverse lookup          │
│   "GBUM71029604"          • Spotify URL construction                  │
│                           • Platform URL resolution                   │
│                                                                       │
│   Humming Audio        ─→ ACRCloud API ────→ Fingerprint match        │
│   (base64 audio)          • Title, artist                             │
│                           • Confidence score                          │
│                           • ISRC (when available)                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Search Context Flow

```
User Input: "bohemian rhapsody queen"
       │
       ▼
┌─────────────────────────────────────────┐
│      iTunes Search API                   │
│  ───────────────────────                 │
│  Returns: trackId, title, artist,        │
│           album, artworkUrl, previewUrl  │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      Odesli Enrichment (parallel)        │
│  ─────────────────────────────           │
│  For first 5 results:                    │
│  • Build Apple Music URL from trackId    │
│  • Query song.link API                   │
│  • Extract platform-specific IDs:        │
│    - spotifyId: "7tFiyTwD0nx5a1eklYtX2J" │
│    - tidalId: "36737274"                 │
│    - deezerId: "568115892"               │
│    - isrc: "GBUM71029604"                │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      Enriched Search Result              │
│  ─────────────────────────               │
│  {                                       │
│    id: "itunes-1440650711",              │
│    title: "Bohemian Rhapsody",           │
│    artist: "Queen",                      │
│    album: "A Night at the Opera",        │
│    albumArt: "https://...",              │
│    spotifyId: "7tFiyTwD...",             │
│    appleMusicId: "1440650711",           │
│    isrc: "GBUM71029604",                 │
│    confidence: 0.95                      │
│  }                                       │
└─────────────────────────────────────────┘
```

### Job Processing Context Flow

When a job is created, the system generates additional context for audio acquisition:

```
Job Created: { sourceType: "spotify_id", sourceValue: "7tFiyTwD..." }
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 1: IDENTIFY                                               │
│   ────────────────                                               │
│                                                                   │
│   Input: Spotify ID "7tFiyTwD0nx5a1eklYtX2J"                     │
│                                                                   │
│   Process:                                                        │
│   1. Construct Spotify URL: open.spotify.com/track/{id}          │
│   2. Call Odesli API with URL                                     │
│   3. Parse response.entitiesByUniqueId for metadata              │
│   4. Parse response.linksByPlatform for platform IDs             │
│                                                                   │
│   Output (stored in job.songlinkData):                           │
│   {                                                               │
│     platforms: {                                                  │
│       spotify: "https://open.spotify.com/track/...",              │
│       tidal: "https://listen.tidal.com/track/36737274",          │
│       deezer: "https://www.deezer.com/track/568115892",          │
│       qobuz: "https://www.qobuz.com/..."                         │
│     },                                                            │
│     tidalId: "36737274",                                         │
│     deezerId: "568115892",                                       │
│     qobuzId: "..."                                               │
│   }                                                               │
│                                                                   │
│   Also extracts: isrc, title, artist, albumArt                   │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 2: ACQUIRE AUDIO                                          │
│   ─────────────────────                                          │
│                                                                   │
│   Uses generated context to attempt FLAC download:               │
│                                                                   │
│   Strategy (SpotiFLAC-inspired):                                 │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │ 1. Try Tidal API with tidalId: "36737274"               │    │
│   │    └── If configured & successful → FLAC                │    │
│   │                                                          │    │
│   │ 2. Try Deezer API with deezerId: "568115892"            │    │
│   │    └── If configured & successful → FLAC                │    │
│   │                                                          │    │
│   │ 3. Try Qobuz API with qobuzId                           │    │
│   │    └── If configured & successful → FLAC                │    │
│   │                                                          │    │
│   │ 4. Fallback: Search by ISRC "GBUM71029604"              │    │
│   │    └── Each provider tries ISRC search                  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   Output: masterAudioPath, masterAudioFormat, masterAudioService │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 3: SEPARATE STEMS                                         │
│   ──────────────────────                                         │
│   Uses master audio to create 5 stems:                           │
│   vocals, drums, bass, melody, instrumental                      │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│   STEP 4: GENERATE MIDI                                          │
│   ─────────────────────                                          │
│   Creates MIDI files for melodic stems:                          │
│   vocals.mid, bass.mid, melody.mid                               │
└─────────────────────────────────────────────────────────────────┘
```

### Unified Search with Fallbacks

The `/api/search/unified` endpoint implements intelligent fallback:

```
Query: "bohemian rhapsody"
       │
       ▼
┌─────────────────────────────────────────┐
│  Primary: iTunes + Odesli Enrichment     │
│  ─────────────────────────────────       │
│  If results found → Return enriched      │
│  If empty → Try fallback                 │
└─────────────────────────────────────────┘
       │ (if empty)
       ▼
┌─────────────────────────────────────────┐
│  Fallback 1: Spotify API                 │
│  ────────────────────────                │
│  Direct Spotify search with popularity   │
│  scoring for confidence calculation      │
└─────────────────────────────────────────┘
       │ (if empty)
       ▼
┌─────────────────────────────────────────┐
│  Fallback 2: MusicBrainz                 │
│  ────────────────────────                │
│  Open database with smart ranking:       │
│  • Known artist boost (+100)             │
│  • Cover version penalty (-80)           │
│  • Title/artist match boost (+30/+20)    │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Post-Processing: Songstats Enrichment   │
│  ─────────────────────────────────       │
│  If RAPIDAPI_KEY configured:             │
│  • Add streaming stats                   │
│  • Additional platform verification      │
└─────────────────────────────────────────┘
```

### songlinkData Schema

The `songlinkData` JSON field stores all cross-platform context:

```typescript
interface SonglinkData {
  // Platform URLs for user linking
  platforms: {
    spotify?: string;      // "https://open.spotify.com/track/..."
    appleMusic?: string;   // "https://music.apple.com/..."
    tidal?: string;        // "https://listen.tidal.com/..."
    deezer?: string;       // "https://www.deezer.com/..."
    qobuz?: string;        // "https://www.qobuz.com/..."
    youtube?: string;      // "https://www.youtube.com/..."
    amazonMusic?: string;  // "https://music.amazon.com/..."
  };
  
  // Platform-specific IDs for API access
  tidalId?: string;        // "36737274"
  deezerId?: string;       // "568115892"  
  qobuzId?: string;        // "12345678"
  
  // All platform URLs (duplicate for compatibility)
  platformUrls: Record<string, string>;
}
```

This context is critical for the FLAC acquisition step, allowing direct API calls to streaming services by their native track IDs rather than relying solely on ISRC searches.

## Security Considerations

### API Keys
- Stored as environment variables/secrets
- Never exposed to frontend
- Rate limiting applied for external APIs

### File Storage
- Local storage with expiration (24 hours default)
- Cleanup job removes expired assets
- No persistent user data stored

### Input Validation
- File type validation for uploads
- Size limits on audio files
- Sanitization of user input

## Scalability

### Current Limitations
- Single-server architecture
- Synchronous job processing
- Local file storage

### Future Improvements
- Redis-based job queue for distributed processing
- Cloud storage (S3/GCS) for assets
- Horizontal scaling with multiple workers
- CDN for asset delivery
- WebSocket for real-time status updates
