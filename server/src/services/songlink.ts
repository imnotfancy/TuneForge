import axios from 'axios';

export interface SonglinkResponse {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string;
  entitiesByUniqueId: Record<string, SonglinkEntity>;
  linksByPlatform: Record<string, PlatformLink>;
}

export interface SonglinkEntity {
  id: string;
  type: string;
  title: string;
  artistName: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  apiProvider: string;
  platforms: string[];
}

export interface PlatformLink {
  country: string;
  url: string;
  entityUniqueId: string;
  nativeAppUriMobile?: string;
  nativeAppUriDesktop?: string;
}

export interface TrackInfo {
  isrc?: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: number;
  spotifyId?: string;
  tidalId?: string;
  deezerId?: string;
  qobuzId?: string;
  amazonId?: string;
  platforms: Record<string, string>;
  platformUrls: Record<string, string>;
}

const SONGLINK_API_URL = 'https://api.song.link/v1-alpha.1/links';

export async function lookupByUrl(url: string): Promise<SonglinkResponse> {
  const response = await axios.get<SonglinkResponse>(SONGLINK_API_URL, {
    params: { url },
    timeout: 10000,
  });
  return response.data;
}

export async function lookupByIsrc(isrc: string): Promise<SonglinkResponse | null> {
  try {
    const spotifySearchUrl = `https://open.spotify.com/search/${isrc}`;
    return await lookupByUrl(spotifySearchUrl);
  } catch (error) {
    console.error('ISRC lookup failed:', error);
    return null;
  }
}

export async function lookupBySpotifyId(spotifyId: string): Promise<SonglinkResponse | null> {
  try {
    const spotifyUrl = `https://open.spotify.com/track/${spotifyId}`;
    return await lookupByUrl(spotifyUrl);
  } catch (error) {
    console.error('Spotify ID lookup failed:', error);
    return null;
  }
}

export async function lookupByAppleMusicId(appleMusicId: string): Promise<SonglinkResponse | null> {
  try {
    const appleMusicUrl = `https://music.apple.com/us/song/${appleMusicId}`;
    return await lookupByUrl(appleMusicUrl);
  } catch (error) {
    console.error('Apple Music ID lookup failed:', error);
    return null;
  }
}

export function extractTrackInfo(response: SonglinkResponse): TrackInfo {
  const entities = Object.values(response.entitiesByUniqueId);
  const primaryEntity = entities[0];
  
  const platforms: Record<string, string> = {};
  const platformIds: Record<string, string> = {};
  const platformUrls: Record<string, string> = {};
  
  for (const [platform, link] of Object.entries(response.linksByPlatform)) {
    platforms[platform] = link.url;
    platformUrls[platform] = link.url;
    
    const entity = response.entitiesByUniqueId[link.entityUniqueId];
    if (entity) {
      platformIds[platform] = entity.id;
    }
  }
  
  let isrc: string | undefined;
  for (const entity of entities) {
    if (entity.id && entity.id.match(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/)) {
      isrc = entity.id;
      break;
    }
  }
  
  return {
    isrc,
    title: primaryEntity?.title || 'Unknown',
    artist: primaryEntity?.artistName || 'Unknown Artist',
    albumArt: primaryEntity?.thumbnailUrl,
    spotifyId: platformIds['spotify'],
    tidalId: platformIds['tidal'],
    deezerId: platformIds['deezer'],
    qobuzId: platformIds['qobuz'],
    amazonId: platformIds['amazonMusic'],
    platforms,
    platformUrls,
  };
}

export async function identifyTrack(input: string): Promise<TrackInfo | null> {
  try {
    let response: SonglinkResponse;
    
    if (input.startsWith('http://') || input.startsWith('https://')) {
      response = await lookupByUrl(input);
    } else if (input.match(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/)) {
      const isrcResponse = await lookupByIsrc(input);
      if (!isrcResponse) return null;
      response = isrcResponse;
    } else {
      return null;
    }
    
    return extractTrackInfo(response);
  } catch (error) {
    console.error('Track identification failed:', error);
    return null;
  }
}
