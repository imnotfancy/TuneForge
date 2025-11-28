# TuneForge Provider Configuration

## Overview

TuneForge uses a modular provider system that allows you to configure different services for each stage of the audio processing pipeline. This document explains how to set up and configure each provider.

## Provider Categories

1. **Track Identification** - Identify songs from audio or metadata
2. **FLAC Acquisition** - Download high-quality audio files
3. **Stem Separation** - Split audio into individual stems
4. **MIDI Generation** - Convert audio to MIDI

---

## Track Identification Providers

### iTunes Search API

**Description**: Free API for searching Apple's music catalog.

**Setup**: No API key required.

**Usage**:
```typescript
import { searchTracks } from './services/itunes';

const results = await searchTracks('Bohemian Rhapsody', 10);
```

**Rate Limits**: ~20 requests per minute

---

### Odesli/song.link

**Description**: Cross-platform music link resolution. Converts between Spotify, Apple Music, Tidal, Deezer, and other platform IDs.

**Setup**: No API key required for basic usage.

**Usage**:
```typescript
import { lookupBySpotifyId, extractTrackInfo } from './services/songlink';

const response = await lookupBySpotifyId('7tFiyTwD0nx5a1eklYtX2J');
const trackInfo = extractTrackInfo(response);
// trackInfo.deezerId = "568115892"
// trackInfo.tidalId = "36737274"
```

**Rate Limits**: 
- 10 requests per minute
- Recommended 7-second delay between requests

---

### ACRCloud (Humming Recognition)

**Description**: Industry-leading audio recognition for humming, singing, and audio fingerprinting.

**Setup**:
1. Create account at [ACRCloud Console](https://console.acrcloud.com/)
2. Create a project with "Humming Search" enabled
3. Get Access Key and Access Secret

**Environment Variables**:
```bash
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret
```

**Rate Limits**: 
- Free tier: 1,000 requests/day
- Paid plans available for higher volume

---

## FLAC Acquisition Providers

These providers download high-quality FLAC audio files from streaming services.

### Tidal

**Description**: Hi-Res FLAC up to 24-bit/192kHz, MQA support.

**Priority**: 1 (highest)

**Setup**:
1. Obtain Tidal API credentials
2. Configure in Settings or environment

**Environment Variables**:
```bash
TIDAL_CLIENT_ID=your_client_id
TIDAL_CLIENT_SECRET=your_client_secret
```

**Audio Quality**: Up to 24-bit/192kHz FLAC

---

### Deezer

**Description**: CD-quality FLAC (16-bit/44.1kHz).

**Priority**: 2

**Setup**:
1. Obtain Deezer API credentials
2. Configure in Settings or environment

**Environment Variables**:
```bash
DEEZER_ARL=your_arl_token
```

**Audio Quality**: 16-bit/44.1kHz FLAC

---

### Qobuz

**Description**: Hi-Res FLAC up to 24-bit/192kHz.

**Priority**: 3

**Setup**:
1. Obtain Qobuz API credentials
2. Configure in Settings or environment

**Environment Variables**:
```bash
QOBUZ_APP_ID=your_app_id
QOBUZ_APP_SECRET=your_app_secret
```

**Audio Quality**: Up to 24-bit/192kHz FLAC

---

## Stem Separation Providers

### LALAL.AI

**Description**: Best-in-class vocal isolation using AI.

**Stems Available**:
- Vocals
- Instrumental
- Drums
- Bass
- Piano
- Electric Guitar
- Acoustic Guitar
- Synthesizer

**Setup**:
1. Create account at [LALAL.AI](https://www.lalal.ai/)
2. Get API key from dashboard

**Environment Variables**:
```bash
LALAL_API_KEY=your_api_key
```

**Pricing**: Pay-per-minute, packages available

---

### Fadr

**Description**: Full stem separation suite with MIDI extraction.

**Stems Available**:
- Vocals
- Drums
- Bass
- Melody
- Instruments

**Setup**:
1. Create account at [Fadr](https://fadr.com/)
2. Get API credentials

**Environment Variables**:
```bash
FADR_API_KEY=your_api_key
```

**Features**: Also provides MIDI generation

---

### UVR5 (Ultimate Vocal Remover)

**Description**: Open-source, local processing. No API required.

**Stems Available**:
- Vocals
- Instrumental
- Drums
- Bass
- Other

**Setup**:
1. UVR5 must be installed locally
2. Configure path in settings

**Environment Variables**:
```bash
UVR5_PATH=/path/to/uvr5
UVR5_MODEL=MDX23C
```

**Advantages**: 
- Free
- No rate limits
- Privacy (local processing)

---

## MIDI Generation Providers

### Fadr MIDI

**Description**: High-quality MIDI extraction for melodies, chords, and drums.

**MIDI Types**:
- Melody (single notes)
- Chords
- Bass line
- Drum pattern

**Setup**: Same as Fadr stem separation

---

### Basic Pitch (Spotify)

**Description**: Open-source polyphonic MIDI transcription.

**Setup**:
```bash
pip install basic-pitch
```

**Usage**:
```python
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

model_output, midi_data, note_events = predict(audio_path)
midi_data.write('output.mid')
```

**Advantages**:
- Free and open-source
- Local processing
- Good for melodic content

---

## Provider Priority System

The system attempts providers in priority order and falls back to the next if one fails:

```
1. Primary Provider (e.g., Tidal)
   └── Success? → Use result
   └── Fail? → Try next
   
2. Secondary Provider (e.g., Deezer)
   └── Success? → Use result
   └── Fail? → Try next
   
3. Tertiary Provider (e.g., Qobuz)
   └── Success? → Use result
   └── Fail? → Error with message
```

## Configuration via Settings

Users can configure providers through the Settings screen:

1. Open Settings (gear icon)
2. Navigate to "Providers" section
3. Enter API keys for each service
4. Save settings

Settings are stored securely and persist between sessions.

## Error Handling

Each provider returns standardized error responses:

```typescript
interface DownloadResult {
  success: boolean;
  filePath?: string;
  format?: string;
  error?: string;
}
```

Common errors:
- `Provider not configured` - Missing API key
- `Track not found` - Song not available on platform
- `Rate limit exceeded` - Too many requests
- `Authentication failed` - Invalid credentials
