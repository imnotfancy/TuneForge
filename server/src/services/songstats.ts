import axios from 'axios';

export interface SongstatsSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  isrc?: string;
  spotifyId?: string;
  appleMusicId?: string;
  popularity?: number;
}

export interface SongstatsTrackInfo {
  isrc: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  spotifyId?: string;
  appleMusicId?: string;
  stats?: {
    spotify?: {
      streams?: number;
      popularity?: number;
    };
    appleMusic?: {
      plays?: number;
    };
  };
}

const RAPIDAPI_HOST = 'songstats.p.rapidapi.com';

async function makeRequest(endpoint: string, params: Record<string, string> = {}) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  const response = await axios.get(`https://${RAPIDAPI_HOST}${endpoint}`, {
    params,
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    timeout: 10000,
  });

  return response.data;
}

export async function searchBySpotifyId(spotifyId: string): Promise<SongstatsTrackInfo | null> {
  try {
    const data = await makeRequest('/tracks/info', {
      spotify_track_id: spotifyId,
    });

    if (!data || data.error) {
      return null;
    }

    return {
      isrc: data.isrc || '',
      title: data.title || 'Unknown',
      artist: data.artists?.[0]?.name || 'Unknown',
      album: data.album?.name,
      albumArt: data.album?.image,
      spotifyId: data.spotify_track_id,
      appleMusicId: data.apple_music_track_id,
      stats: {
        spotify: {
          streams: data.stats?.spotify?.streams,
          popularity: data.stats?.spotify?.popularity,
        },
      },
    };
  } catch (error) {
    console.error('Songstats search by Spotify ID error:', error);
    return null;
  }
}

export async function searchByIsrc(isrc: string): Promise<SongstatsTrackInfo | null> {
  try {
    const data = await makeRequest('/tracks/info', {
      isrc: isrc,
    });

    if (!data || data.error) {
      return null;
    }

    return {
      isrc: data.isrc || isrc,
      title: data.title || 'Unknown',
      artist: data.artists?.[0]?.name || 'Unknown',
      album: data.album?.name,
      albumArt: data.album?.image,
      spotifyId: data.spotify_track_id,
      appleMusicId: data.apple_music_track_id,
      stats: {
        spotify: {
          streams: data.stats?.spotify?.streams,
          popularity: data.stats?.spotify?.popularity,
        },
      },
    };
  } catch (error) {
    console.error('Songstats search by ISRC error:', error);
    return null;
  }
}

export async function getArtistInfo(spotifyArtistId: string) {
  try {
    const data = await makeRequest('/artists/info', {
      spotify_artist_id: spotifyArtistId,
    });

    return data;
  } catch (error) {
    console.error('Songstats artist info error:', error);
    return null;
  }
}

export async function getTrackStats(isrc: string) {
  try {
    const data = await makeRequest('/tracks/stats', {
      isrc: isrc,
    });

    return data;
  } catch (error) {
    console.error('Songstats track stats error:', error);
    return null;
  }
}

export async function getTrackHistory(isrc: string, source: string = 'spotify') {
  try {
    const data = await makeRequest('/tracks/historic_stats', {
      isrc: isrc,
      source: source,
    });

    return data;
  } catch (error) {
    console.error('Songstats track history error:', error);
    return null;
  }
}

export async function getTrackPlaylists(isrc: string) {
  try {
    const data = await makeRequest('/tracks/playlists', {
      isrc: isrc,
    });

    return data;
  } catch (error) {
    console.error('Songstats track playlists error:', error);
    return null;
  }
}

export function isConfigured(): boolean {
  return !!process.env.RAPIDAPI_KEY;
}
