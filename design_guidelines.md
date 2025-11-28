# TuneForge - Design Guidelines

## Architecture Decisions

### Authentication
**No Authentication Required** (PoC/Private App)
- Single-user, privacy-focused app with local processing
- No user accounts or cloud sync in this prototype
- Include a **Settings screen** with:
  - App preferences (theme toggle, audio quality settings)
  - API configuration (ACRCloud, AcoustID, Fadr credentials)
  - Cache management (clear recognition history, clear processed stems)
  - About section with version info

### Navigation
**Root Navigation: Stack-Only**
- Linear workflow optimized for quick music analysis sessions (<1 minute)
- No tab navigation needed - users follow a clear path from input → recognition → remixing
- Modal screens for settings and export options
- Flow: Audio Input Screen → Recognition Results → Remix Processing → Export/Preview

### Screen Specifications

#### 1. Audio Input Screen (Landing)
**Purpose**: Capture or upload audio for music recognition

**Layout**:
- Header: Transparent, with Settings icon (top-right)
- Main content: Centered vertically
  - App branding/logo at top
  - Large "Record" button (primary action, 200x200pt circular)
  - "Upload File" button below (secondary style)
  - Real-time waveform visualization during recording (15-30s timer display)
- Safe area insets: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**:
- Circular record button with animated red ring during recording
- File picker button with icon (music note)
- Canvas-based waveform visualization
- Timer countdown during recording (00:15 format)
- Recording controls: Cancel, Stop/Submit

**Interactions**:
- Record button: Long-press feedback with scale animation
- Auto-advance to Recognition screen after audio captured
- Haptic feedback on recording start/stop

---

#### 2. Recognition Results Screen
**Purpose**: Display identified track metadata and provide remixing option

**Layout**:
- Header: Default navigation with back button (left), "Share" button (right)
- Main content: Scrollable
  - Album art hero image (full-width, 300pt height with gradient overlay)
  - Track title (large, bold)
  - Artist name (medium)
  - Confidence score badge (if <90%, show "Uncertain Match")
  - Metadata cards: Album, Year, Genre (if available)
  - External links section: Spotify, YouTube icons (if URLs available)
  - "Process Stems" CTA button (fixed at bottom)
- Safe area insets: top = headerHeight + Spacing.xl, bottom = insets.bottom + Spacing.xl + 60pt (for fixed button)

**Components**:
- Album art with loading shimmer effect
- Loading spinner during recognition
- Metadata cards with icon labels
- Error state: "No Match Found" with manual search prompt
- Fallback indicator: Small badge showing "AcoustID Match" if fallback used
- Floating "Process Stems" button with drop shadow

**Interactions**:
- Pull-to-refresh to retry recognition
- Tap album art to view full-screen
- External link icons open in-app browser or native apps
- Process button shows alert: "This will upload the full track to Fadr for processing. Continue?"

---

#### 3. Remix Processing Screen
**Purpose**: Display stem separation progress and provide playback controls

**Layout**:
- Header: Default navigation with "Cancel" (left), "Export" (right, disabled until complete)
- Main content: Scrollable list
  - Progress bar with percentage (0-100%)
  - Status message: "Separating stems..." / "Generating MIDI..." / "Complete!"
  - Stem preview cards (5 items: Vocals, Drums, Bass, Melodies, Instrumental)
  - Each card shows: Stem icon, name, duration, waveform thumbnail
  - Playback controls per stem: Play/Pause, Solo, Mute toggles
  - MIDI indicator badge on applicable stems (Vocals, Bass, Melodies)
- Safe area insets: top = headerHeight + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**:
- Animated progress bar (gradient fill)
- Stem cards with embedded audio player
- Toggle switches for mute/solo (iOS-style)
- Waveform thumbnails (static visualization)
- Loading skeleton for incomplete stems
- Mini audio player transport controls

**Interactions**:
- Cards expand on tap to show full waveform
- Solo toggle: Mutes all other stems
- Playback syncs across all stems when playing together
- Cancel button shows confirmation: "Stop processing and discard results?"

---

#### 4. Export/Share Screen (Modal)
**Purpose**: Download and share processed stems/MIDI files

**Layout**:
- Full-screen modal with close button (top-left)
- Header: "Export Options"
- Main content: Scrollable grid
  - "Download All as ZIP" button (primary)
  - Grid of individual stem cards (2 columns)
  - Each card: Stem name, file size, download icon
  - MIDI files grouped in separate section below stems
- Safe area insets: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**:
- 2-column grid layout
- Download progress indicators per item
- Native share sheet trigger button
- Success toast: "Saved to Files" or "Shared successfully"

**Interactions**:
- Individual stem download: Shows native file save dialog
- Share button: Opens iOS/Android share sheet with selected files
- Download all: Shows progress modal with cancel option

---

#### 5. Settings Screen (Modal/Stack)
**Purpose**: Configure API keys and app preferences

**Layout**:
- Standard navigation header with "Settings" title
- Scrollable form grouped in sections:
  - **API Configuration**: ACRCloud, AcoustID, Fadr (text inputs with secure entry)
  - **Audio Quality**: Dropdown for recording quality (Low/Medium/High)
  - **Storage**: "Clear Recognition Cache", "Clear Processed Stems" buttons
  - **About**: Version number, privacy policy link
- Safe area insets: top = headerHeight + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Components**:
- Grouped form sections with dividers
- Secure text inputs for API keys (show/hide toggle)
- Destructive action buttons (red text)
- Links open in-app web view

---

## Design System

### Color Palette
**Primary Colors**:
- Background: `#000000` (Pure Black)
- Surface: `#1C1C1E` (Dark Gray)
- Surface Elevated: `#2C2C2E` (Medium Gray)

**Accent Colors**:
- Primary Accent: `#FF375F` (Vibrant Red) - Record button, progress bars
- Secondary Accent: `#30D158` (Green) - Success states, playback indicators
- Warning: `#FF9F0A` (Orange) - Low confidence matches

**Text Colors**:
- Primary Text: `#FFFFFF` (White)
- Secondary Text: `#98989D` (Light Gray)
- Disabled Text: `#48484A` (Medium Gray)

**Semantic Colors**:
- Error: `#FF453A`
- Success: `#30D158`
- Info: `#64D2FF`

### Typography
**Font Family**: SF Pro (iOS), Roboto (Android) - System defaults

**Type Scale**:
- Hero (Track Title): 32pt, Bold, Line Height 38pt
- Title (Section Headers): 24pt, Semibold, Line Height 30pt
- Body Large (Artist Name): 18pt, Medium, Line Height 24pt
- Body (Metadata): 16pt, Regular, Line Height 22pt
- Caption (Timestamps, Info): 14pt, Regular, Line Height 18pt
- Small (Badges): 12pt, Medium, Line Height 16pt

### Spacing
- xs: 4pt
- sm: 8pt
- md: 16pt
- lg: 24pt
- xl: 32pt
- xxl: 48pt

### Visual Design

**Touchable Feedback**:
- All buttons: Scale down to 0.95 on press
- Toggle switches: Standard iOS/Android platform styles
- List items: Background opacity change to 0.8

**Shadows** (Floating Buttons Only):
- shadowOffset: { width: 0, height: 2 }
- shadowOpacity: 0.10
- shadowRadius: 2
- Elevation (Android): 2

**Border Radius**:
- Cards: 16pt
- Buttons (Primary): 12pt
- Buttons (Secondary): 8pt
- Input Fields: 8pt
- Album Art: 12pt

**Icons**:
- Use Feather icons from @expo/vector-icons
- Icon sizes: 20pt (small), 24pt (medium), 32pt (large)
- Key icons needed:
  - Mic (recording)
  - Upload (file picker)
  - Settings (gear)
  - Play/Pause
  - Volume/Mute
  - Download
  - Share
  - External link
  - Close (X)

**NO Emojis** - Use icons exclusively

### Critical Assets

**Required Generated Assets**:
1. **Waveform Visualizations**: 
   - Real-time recording waveform (animated bars, red gradient)
   - Static stem waveforms (grayscale, simplified)
   - Generate with canvas/SVG - no image files needed

2. **Placeholder Album Art**:
   - Generic music disc icon for "No match" states
   - 1:1 aspect ratio, 300x300pt minimum
   - Dark gradient background with centered music note icon

3. **App Icon/Logo**:
   - Circular icon with abstract sound wave or vinyl record design
   - Red/white color scheme matching accent colors
   - Simple, recognizable at small sizes

**NO Additional Assets Needed**:
- Use system icons for navigation and actions
- Album art fetched from API responses
- Stem icons use standard Feather music/audio icons (mic, headphones, music, disc, radio)

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast ratio: 4.5:1 for all text
- VoiceOver/TalkBack labels on all interactive elements:
  - "Record audio, 15 second timer"
  - "Play vocals stem"
  - "Mute drums"
- Haptic feedback on critical actions (record start/stop, export complete)
- Loading states must include accessible status announcements
- Support for dynamic type (iOS)