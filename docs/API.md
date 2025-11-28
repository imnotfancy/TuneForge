# TuneForge API Documentation

## Overview

TuneForge provides a RESTful API for music identification, audio processing, and stem separation. The backend runs on port 3001 and communicates with the Expo React Native frontend.

**Key Concept**: The API uses a **context enrichment** approach. Minimal input (song name, Spotify ID, or audio) is progressively enriched with cross-platform metadata via Odesli/song.link, producing rich `songlinkData` that enables FLAC acquisition from multiple streaming providers.

## Base URL

```
Development: http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication. Future versions will implement API key authentication for production use.

---

## Context Generation

All search endpoints enrich results with cross-platform IDs:

| Field | Description | Example |
|-------|-------------|---------|
| `spotifyId` | Spotify track ID | `7tFiyTwD0nx5a1eklYtX2J` |
| `appleMusicId` | Apple Music track ID | `1440650711` |
| `tidalId` | Tidal track ID | `36737274` |
| `deezerId` | Deezer track ID | `568115892` |
| `isrc` | International Standard Recording Code | `GBUM71029604` |

This context is stored in jobs as `songlinkData` JSON for audio acquisition.

---

## Endpoints

### Health Check

#### `GET /health`

Check if the server is running.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T08:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Search Endpoints

### LLM-Powered Text Search

#### `POST /search/text`

Search for songs using OpenAI GPT-4o-mini for intelligent song identification from titles, lyrics, or descriptions.

**Request Body**
```json
{
  "query": "Bohemian Rhapsody Queen",
  "type": "title"
}
```

**Type Options**: `title` (default), `lyrics`, `description`

**Response**
```json
{
  "query": "Bohemian Rhapsody Queen",
  "type": "title",
  "suggestions": [
    {
      "id": "llm-1234567890-0",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "isrc": "GBUM71029604",
      "spotifyId": "7tFiyTwD0nx5a1eklYtX2J",
      "albumArt": "https://...",
      "confidence": 0.95,
      "source": "llm"
    }
  ],
  "searchId": "search-1234567890"
}
```

**Requires**: `OPENAI_API_KEY`

---

### iTunes Search

#### `GET /search/itunes`

Direct iTunes catalog search with Odesli enrichment.

**Query Parameters**
- `query` (required) - Search term
- `limit` (optional) - Max results (default: 10)

**Response**
```json
{
  "suggestions": [...],
  "source": "itunes"
}
```

---

### Humming Recognition

#### `POST /search/humming`

Identify a song from humming or singing audio via ACRCloud.

**Request Body** (JSON, not multipart)
```json
{
  "audioPath": "/path/to/audio.wav",
  "audioBuffer": "base64-encoded-audio-data"
}
```

Provide either `audioPath` (server file path) or `audioBuffer` (base64 audio).

**Response**
```json
{
  "suggestions": [
    {
      "id": "acr-1234567890-0",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "isrc": "GBUM71029604",
      "confidence": 85,
      "source": "acrcloud",
      "spotifyId": "7tFiyTwD...",
      "albumArt": "https://..."
    }
  ],
  "searchId": "humming-1234567890"
}
```

**Requires**: `ACRCLOUD_ACCESS_KEY`, `ACRCLOUD_ACCESS_SECRET`

---

### Unified Search

#### `GET /search/unified`

Multi-source search with intelligent fallback chain.

**Query Parameters**
- `query` (required) - Search term
- `limit` (optional) - Max results (default: 10)

**Fallback Order**:
1. iTunes + Odesli enrichment (primary)
2. Spotify API
3. MusicBrainz with smart ranking

**Response**
```json
{
  "suggestions": [...],
  "source": "itunes"
}
```

---

### Spotify Search

#### `GET /search/spotify`

Direct Spotify catalog search.

**Requires**: Spotify integration configured

---

### Songstats Endpoints

#### `GET /search/songstats/isrc/:isrc`

Lookup track by ISRC via Songstats.

#### `GET /search/songstats/spotify/:spotifyId`

Lookup track by Spotify ID via Songstats.

#### `GET /search/songstats/stats/:isrc`

Get streaming statistics for track.

**Requires**: `RAPIDAPI_KEY`

---

### MusicBrainz Search

#### `GET /search/musicbrainz`

Open database search with artist prioritization.

**Query Parameters**
- `query` (required) - Search term
- `type` (optional) - `recording` or `artist`


**Response**
```json
{
  "isrc": "GBUM71029604",
  "title": "Bohemian Rhapsody",
  "artist": "Queen",
  "platforms": {
    "spotify": "https://open.spotify.com/track/...",
    "appleMusic": "https://music.apple.com/...",
    "tidal": "https://listen.tidal.com/...",
    "deezer": "https://www.deezer.com/..."
  },
  "platformIds": {
    "spotifyId": "7tFiyTwD0nx5a1eklYtX2J",
    "tidalId": "36737274",
    "deezerId": "568115892"
  }
}
```

---

## Job Endpoints

### List Jobs

#### `GET /jobs`

Get a list of recent jobs.

**Query Parameters**
- `limit` (optional) - Number of jobs to return (default: 20)

**Response**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "status": "completed",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "albumArt": "https://...",
      "createdAt": "2025-11-28T08:00:00.000Z"
    }
  ]
}
```

### Create Job

#### `POST /jobs`

Create a new processing job.

**Request Body**
```json
{
  "sourceType": "spotify_id",
  "sourceValue": "7tFiyTwD0nx5a1eklYtX2J",
  "title": "Bohemian Rhapsody",
  "artist": "Queen",
  "album": "A Night at the Opera",
  "albumArt": "https://..."
}
```

**Source Types**
| Type | Description | Example Value |
|------|-------------|---------------|
| `spotify_id` | Spotify track ID | `7tFiyTwD0nx5a1eklYtX2J` |
| `apple_music_id` | Apple Music track ID | `1440650711` |
| `isrc` | ISRC code | `GBUM71029604` |
| `spotify_url` | Full Spotify URL | `https://open.spotify.com/track/...` |
| `audio_url` | Direct audio URL | `https://example.com/audio.mp3` |
| `file_upload` | Uploaded file path | (set by upload endpoint) |

**Response**
```json
{
  "id": "dcefb324-3fae-4585-8b58-996feab7e972",
  "status": "pending",
  "createdAt": "2025-11-28T08:00:00.000Z"
}
```

### Upload Audio

#### `POST /jobs/upload`

Upload an audio file and create a job.

**Request**
- Content-Type: `multipart/form-data`
- Field: `audio` (audio file: MP3, WAV, FLAC, M4A)

**Response**
```json
{
  "id": "uuid",
  "status": "pending",
  "createdAt": "2025-11-28T08:00:00.000Z"
}
```

### Get Job Status

#### `GET /jobs/:id`

Get the current status and metadata of a job.

**Response**
```json
{
  "id": "uuid",
  "status": "separating",
  "progress": 60,
  "progressMessage": "Separating stems...",
  "metadata": {
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "album": "A Night at the Opera",
    "albumArt": "https://...",
    "duration": 354000,
    "isrc": "GBUM71029604"
  },
  "audioSource": {
    "format": "FLAC",
    "service": "deezer"
  },
  "stems": [
    {
      "type": "vocals",
      "hasMidi": true,
      "downloadUrl": "/api/jobs/uuid/stems/vocals"
    }
  ],
  "error": null,
  "expiresAt": "2025-11-29T08:00:00.000Z",
  "createdAt": "2025-11-28T08:00:00.000Z"
}
```

**Job Status Values**
| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to process |
| `identifying` | Looking up track metadata |
| `acquiring` | Downloading FLAC audio |
| `separating` | Separating audio into stems |
| `generating_midi` | Creating MIDI files |
| `completed` | All processing done |
| `failed` | Error occurred |

### Download Stem

#### `GET /jobs/:id/stems/:type`

Download a separated stem file.

**Parameters**
- `id` - Job ID
- `type` - Stem type: `vocals`, `drums`, `bass`, `melody`, `instrumental`

**Response**
- Content-Type: `audio/wav`
- Binary audio file

### Get Download Info

#### `GET /jobs/:id/download`

Get download URLs for all stems and MIDI files.

**Response**
```json
{
  "stems": [
    {
      "type": "vocals",
      "url": "/api/jobs/uuid/stems/vocals",
      "hasMidi": true,
      "midiUrl": "/api/jobs/uuid/midi/vocals"
    },
    {
      "type": "drums",
      "url": "/api/jobs/uuid/stems/drums",
      "hasMidi": false
    }
  ],
  "expiresAt": "2025-11-29T08:00:00.000Z"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Job or resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limiting

The Odesli/song.link API has rate limits:
- Maximum 10 requests per minute
- 7-second delay between requests recommended

The backend handles rate limiting automatically with retry logic.

---

## Webhooks (Future)

Future versions will support webhooks for job status updates:

```json
{
  "event": "job.completed",
  "jobId": "uuid",
  "timestamp": "2025-11-28T08:00:00.000Z",
  "data": {
    "stems": ["vocals", "drums", "bass", "melody", "instrumental"],
    "midiGenerated": ["vocals", "bass", "melody"]
  }
}
```
