import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  const data = await response.json() as { items?: any[] };
  connectionSettings = data.items?.[0];
  
  const refreshToken = connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings.settings?.oauth?.credentials?.expires_in;
  
  if (!connectionSettings || (!accessToken || !clientId || !refreshToken)) {
    throw new Error('Spotify not connected');
  }
  
  return { accessToken, clientId, refreshToken, expiresIn };
}

export async function getSpotifyClient() {
  const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

export interface SpotifySearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  isrc?: string;
  spotifyId: string;
  previewUrl?: string;
  duration?: number;
  popularity?: number;
}

export async function searchTracks(query: string, limit: number = 10): Promise<SpotifySearchResult[]> {
  try {
    const spotify = await getSpotifyClient();
    const searchLimit = Math.min(50, Math.max(1, limit)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50;
    const results = await spotify.search(query, ['track'], undefined, searchLimit);
    
    if (!results.tracks?.items) {
      return [];
    }
    
    return results.tracks.items.map(track => ({
      id: `spotify-${track.id}`,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url,
      isrc: track.external_ids?.isrc,
      spotifyId: track.id,
      previewUrl: track.preview_url || undefined,
      duration: track.duration_ms,
      popularity: track.popularity,
    }));
  } catch (error) {
    console.error('Spotify search error:', error);
    throw error;
  }
}

export async function getTrackByIsrc(isrc: string): Promise<SpotifySearchResult | null> {
  try {
    const spotify = await getSpotifyClient();
    const results = await spotify.search(`isrc:${isrc}`, ['track'], undefined, 1);
    
    if (!results.tracks?.items?.[0]) {
      return null;
    }
    
    const track = results.tracks.items[0];
    return {
      id: `spotify-${track.id}`,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url,
      isrc: track.external_ids?.isrc,
      spotifyId: track.id,
      previewUrl: track.preview_url || undefined,
      duration: track.duration_ms,
      popularity: track.popularity,
    };
  } catch (error) {
    console.error('Spotify ISRC lookup error:', error);
    return null;
  }
}

export async function getTrackById(spotifyId: string): Promise<SpotifySearchResult | null> {
  try {
    const spotify = await getSpotifyClient();
    const track = await spotify.tracks.get(spotifyId);
    
    if (!track) {
      return null;
    }
    
    return {
      id: `spotify-${track.id}`,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url,
      isrc: track.external_ids?.isrc,
      spotifyId: track.id,
      previewUrl: track.preview_url || undefined,
      duration: track.duration_ms,
      popularity: track.popularity,
    };
  } catch (error) {
    console.error('Spotify track lookup error:', error);
    return null;
  }
}
