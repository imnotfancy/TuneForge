import axios from 'axios';
import { SongSuggestion } from './api';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';

interface MusicBrainzRecording {
  id: string;
  title: string;
  'artist-credit'?: { name: string; artist?: { id: string; type?: string } }[];
  releases?: { title: string; id: string; date?: string; 'release-group'?: { 'primary-type'?: string } }[];
  score?: number;
  isrcs?: string[];
  'first-release-date'?: string;
}

interface MusicBrainzResponse {
  recordings?: MusicBrainzRecording[];
}

interface CoverArtArchiveResponse {
  images?: { image: string; front: boolean }[];
}

const WELL_KNOWN_ARTISTS = [
  'queen', 'the beatles', 'led zeppelin', 'pink floyd', 'the rolling stones',
  'michael jackson', 'madonna', 'prince', 'david bowie', 'elvis presley',
  'bob dylan', 'nirvana', 'radiohead', 'u2', 'coldplay', 'adele', 'beyonce',
  'taylor swift', 'ed sheeran', 'drake', 'kanye west', 'eminem', 'jay-z',
  'rihanna', 'lady gaga', 'bruno mars', 'the weeknd', 'dua lipa', 'billie eilish',
  'ariana grande', 'justin bieber', 'katy perry', 'maroon 5', 'imagine dragons',
  'foo fighters', 'red hot chili peppers', 'metallica', 'ac/dc', 'guns n roses',
  'aerosmith', 'bon jovi', 'journey', 'fleetwood mac', 'eagles', 'elton john',
  'billy joel', 'bruce springsteen', 'stevie wonder', 'aretha franklin',
  'whitney houston', 'celine dion', 'mariah carey', 'abba', 'bee gees',
];

function isWellKnownArtist(artistName: string): boolean {
  return WELL_KNOWN_ARTISTS.some(known => 
    artistName.toLowerCase().includes(known) || known.includes(artistName.toLowerCase())
  );
}

function isLikelyCover(albumTitle: string): boolean {
  const coverIndicators = [
    'tribute', 'cover', 'karaoke', 'symphony', 'orchestra', 'string quartet',
    'piano version', 'acoustic version', 'instrumental', 'lullaby', 'kids',
    'babies', 'jazz version', 'reggae version', 'punk goes', 'metal version',
    'relaxing', 'meditation', 'sleep', 'workout', 'fitness', 'spa',
  ];
  const lower = albumTitle.toLowerCase();
  return coverIndicators.some(indicator => lower.includes(indicator));
}

function scoreRecording(rec: MusicBrainzRecording): number {
  let score = rec.score || 0;
  const artistName = rec['artist-credit']?.[0]?.name || '';
  const albumTitle = rec.releases?.[0]?.title || '';
  
  if (isWellKnownArtist(artistName)) {
    score += 50;
  }
  
  if (isLikelyCover(albumTitle)) {
    score -= 40;
  }
  
  if (rec.isrcs && rec.isrcs.length > 0) {
    score += 20;
  }
  
  const releaseDate = rec['first-release-date'] || rec.releases?.[0]?.date;
  if (releaseDate) {
    const year = parseInt(releaseDate.substring(0, 4));
    if (year < 2000) {
      score += 10;
    }
  }
  
  const releaseType = rec.releases?.[0]?.['release-group']?.['primary-type'];
  if (releaseType === 'Album') {
    score += 10;
  }
  
  return score;
}

async function getAlbumArt(releaseId: string): Promise<string | undefined> {
  try {
    const response = await axios.get<CoverArtArchiveResponse>(
      `https://coverartarchive.org/release/${releaseId}`,
      { timeout: 3000 }
    );
    const frontImage = response.data.images?.find(img => img.front);
    return frontImage?.image;
  } catch {
    return undefined;
  }
}

export async function searchMusicBrainz(query: string, limit: number = 10): Promise<SongSuggestion[]> {
  try {
    const response = await axios.get<MusicBrainzResponse>(
      `${MUSICBRAINZ_API}/recording`,
      {
        params: {
          query: query,
          fmt: 'json',
          limit: Math.min(limit * 3, 30),
        },
        headers: {
          'User-Agent': 'TuneForge/1.0.0 (tuneforge@example.com)',
        },
        timeout: 10000,
      }
    );

    const recordings = response.data.recordings || [];
    
    const scoredRecordings = recordings.map(rec => ({
      recording: rec,
      adjustedScore: scoreRecording(rec),
    }));
    
    scoredRecordings.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    const seenArtists = new Set<string>();
    const uniqueRecordings: MusicBrainzRecording[] = [];
    
    for (const { recording } of scoredRecordings) {
      const artistKey = `${recording.title.toLowerCase()}-${recording['artist-credit']?.[0]?.name?.toLowerCase()}`;
      if (!seenArtists.has(artistKey)) {
        seenArtists.add(artistKey);
        uniqueRecordings.push(recording);
        if (uniqueRecordings.length >= limit) break;
      }
    }
    
    const suggestions: SongSuggestion[] = await Promise.all(
      uniqueRecordings.map(async (rec, index) => {
        let albumArt: string | undefined;
        const releaseId = rec.releases?.[0]?.id;
        
        if (releaseId && index < 5) {
          albumArt = await getAlbumArt(releaseId);
        }
        
        return {
          id: `mb-${rec.id || index}`,
          title: rec.title || 'Unknown',
          artist: rec['artist-credit']?.[0]?.name || 'Unknown',
          album: rec.releases?.[0]?.title,
          albumArt,
          isrc: rec.isrcs?.[0],
          confidence: Math.min((rec.score || 0) / 100, 1),
          source: 'musicbrainz' as const,
        };
      })
    );

    return suggestions;
  } catch (error) {
    console.error('MusicBrainz search error:', error);
    throw error;
  }
}

export default { searchMusicBrainz };
