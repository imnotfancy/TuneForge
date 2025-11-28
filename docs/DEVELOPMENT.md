# TuneForge Development Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 14+
- Redis (optional, for job queue)
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/imnotfancy/TuneForge.git
cd TuneForge
npm install
```

### 2. Database Setup

The project uses PostgreSQL with Drizzle ORM.

```bash
# Create database
createdb tuneforge

# Set environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/tuneforge"

# Push schema to database
npm run db:push
```

### 3. Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/tuneforge

# Backend
PORT=3001
CORS_ORIGIN=*
STORAGE_DIR=./storage

# Optional - Enhanced Features
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
ACRCLOUD_ACCESS_KEY=...
ACRCLOUD_ACCESS_SECRET=...

# FLAC Providers (at least one recommended)
TIDAL_CLIENT_ID=...
TIDAL_CLIENT_SECRET=...
DEEZER_ARL=...
QOBUZ_APP_ID=...
QOBUZ_APP_SECRET=...

# Stem Separation
LALAL_API_KEY=...
FADR_API_KEY=...
```

### 4. Start Development

```bash
# Start both frontend and backend
npm run dev
```

This starts:
- Expo development server on port 8081
- Backend API server on port 3001

### 5. Test on Mobile

- Open Expo Go on your phone
- Scan the QR code from the terminal
- The app will load on your device

## Project Structure

```
TuneForge/
├── app/                    # Expo Router entry
│   └── _layout.tsx
├── screens/                # Screen components
├── components/             # Reusable UI components
├── services/               # Frontend API client
├── hooks/                  # Custom React hooks
├── constants/              # Theme, colors
├── navigation/             # React Navigation config
├── assets/                 # Images, fonts
├── server/                 # Backend
│   └── src/
│       ├── index.ts        # Express entry
│       ├── routes/         # API endpoints
│       ├── models/         # Database (Drizzle)
│       ├── services/       # External APIs
│       └── workers/        # Background jobs
├── docs/                   # Documentation
└── storage/               # Audio files (gitignored)
```

## Development Workflow

### Frontend Development

```bash
# Start Expo with hot reload
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run in web browser
npx expo start --web
```

### Backend Development

```bash
# Start backend only
npm run server:dev

# Watch mode with auto-restart
npm run server:watch
```

### Database Changes

```bash
# Generate migration after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (development)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

## Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types for objects
- Use explicit return types for functions

```typescript
// Good
interface SongResult {
  id: string;
  title: string;
  artist: string;
}

async function searchSongs(query: string): Promise<SongResult[]> {
  // ...
}

// Avoid
type SongResult = {
  id: string;
  title: string;
  artist: string;
}
```

### React Native

- Use functional components with hooks
- Use StyleSheet.create for styles
- Follow Expo best practices

```typescript
// Good
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
});

// Avoid inline styles for static values
<View style={{ flex: 1, padding: 16 }} />
```

### Component Structure

```typescript
// Standard component structure
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
}

export function MyComponent({ title, onPress }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
});
```

## Testing

### Manual Testing

1. Use Expo Go on physical device for best results
2. Test on both iOS and Android
3. Test in airplane mode for offline behavior

### API Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Search
curl -X POST http://localhost:3001/api/search/text \
  -H "Content-Type: application/json" \
  -d '{"query": "Bohemian Rhapsody"}'

# Create job
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "spotify_id",
    "sourceValue": "7tFiyTwD0nx5a1eklYtX2J",
    "title": "Bohemian Rhapsody",
    "artist": "Queen"
  }'
```

### Database Queries

```bash
# Connect to database
psql $DATABASE_URL

# View recent jobs
SELECT id, status, title, artist FROM jobs ORDER BY created_at DESC LIMIT 10;

# Check job details
SELECT * FROM jobs WHERE id = 'uuid-here';
```

## Debugging

### Frontend

- Use React Native Debugger
- Console logs appear in Expo CLI terminal
- Use `console.log` or `console.warn` for debugging

### Backend

- Logs appear in terminal
- Use `console.log` for debugging
- Check `/tmp/logs/` for workflow logs

### Common Issues

**"Metro bundler not responding"**
```bash
# Clear Metro cache
npx expo start --clear
```

**"Database connection failed"**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**"Provider not configured"**
- Check environment variables are set
- Restart backend after adding new variables

## Building for Production

### Expo Build

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Backend Deployment

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Contributing

1. Create a feature branch
2. Make changes with clear commits
3. Test on both iOS and Android
4. Submit pull request

### Commit Messages

```
feat: Add humming recognition with ACRCloud
fix: Resolve stem download timeout issue
docs: Update API documentation
refactor: Simplify provider manager logic
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Odesli API](https://odesli.co/)
- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)
