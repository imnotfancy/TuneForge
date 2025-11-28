# Changelog

All notable changes to TuneForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- SpotiFLAC-inspired ISRC/platform ID lookup using Odesli
- Extended database schema with `spotify_id` and `apple_music_id` source types
- `createJobFromSong` API with fallback logic (ISRC → Spotify → Apple Music)
- Job processor enriches tracks with Tidal/Deezer/Qobuz IDs via Odesli
- Audio acquisition attempts download by platform ID before ISRC fallback
- Provider manager `downloadByPlatformIds` method for direct platform downloads

### Documentation
- Comprehensive README.md with current status section (implemented vs. requires configuration)
- Context Generation Pipeline documentation explaining data enrichment flow
- API documentation (docs/API.md) with context generation overview
- Architecture documentation (docs/ARCHITECTURE.md) with detailed data flow diagrams
- Provider configuration guide (docs/PROVIDERS.md)
- Development guide (docs/DEVELOPMENT.md)
- `songlinkData` schema documentation for cross-platform ID storage

### Changed
- Job processing flow now prioritizes platform IDs over ISRC for audio acquisition
- Improved error messages for missing provider configuration
- Updated replit.md with current architecture and processing flow

## [0.2.0] - 2025-11-27

### Added
- Intuitive onboarding overlay for first-time users with 5-step carousel
- Text-based song search using iTunes Search API with Odesli enrichment
- Humming/singing recognition via ACRCloud API
- SongHistoryGallery component showing recently analyzed songs
- AnalyzingAnimation with deep learning neural network visualization
- Mode toggle (Record/Search/History) on AudioInputScreen
- Play Audio / Hum toggle for different recording modes

### Changed
- Extended theme with primary, primaryMuted, backgroundElevated, border colors
- Improved search ranking to prioritize original artists over cover versions

## [0.1.0] - 2025-11-25

### Added
- Initial Expo React Native app setup (SDK 54)
- Stack-based navigation with React Navigation 7+
- AudioInputScreen with recording and upload capabilities
- RecognitionResultsScreen for job status display
- RemixProcessingScreen for stem separation progress
- ExportScreen modal for download and share
- SettingsScreen modal for API keys configuration
- Node.js/Express backend on port 3001
- PostgreSQL database with Drizzle ORM
- Job processing pipeline (identify → acquire → separate → midi)
- Provider system for FLAC acquisition (Tidal, Deezer, Qobuz)
- Stem separation integration points (LALAL.AI, Fadr, UVR5)
- MIDI generation integration points (Fadr, Basic Pitch)
- Dark mode theme optimized for music production
- Feather icons from @expo/vector-icons

### Technical
- BullMQ for async job processing
- Local file storage with expiration cleanup
- Multi-track audio player with solo/mute
- Waveform visualization component
- Error boundary for crash recovery

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.2.0 | 2025-11-27 | Enhanced UX with search, onboarding |
| 0.1.0 | 2025-11-25 | Initial release |
