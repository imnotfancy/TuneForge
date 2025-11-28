import axios from 'axios';

export interface ItunesSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  previewUrl?: string;
  trackId: number;
  artistId: number;
  collectionId?: number;
  releaseDate?: string;
  genre?: string;
  durationMs?: number;
}

export interface OdesliLinks {
  spotifyId?: string;
  appleMusicId?: string;
  youtubeId?: string;
  tidalId?: string;
  amazonMusicId?: string;
  deezerId?: string;
  isrc?: string;
  albumArt?: string;
}

const ITUNES_API_BASE = 'https://itunes.apple.com/search';
const ODESLI_API_BASE = 'https://api.song.link/v1-alpha.1/links';

export async function searchTracks(query: string, limit: number = 10): Promise<ItunesSearchResult[]> {
  try {
    const response = await axios.get(ITUNES_API_BASE, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: Math.min(50, Math.max(1, limit)),
        country: 'US',
      },
      timeout: 10000,
    });

    const results = response.data.results || [];
    
    return results.map((track: any) => ({
      id: `itunes-${track.trackId}`,
      title: track.trackName || 'Unknown',
      artist: track.artistName || 'Unknown',
      album: track.collectionName,
      albumArt: track.artworkUrl100?.replace('100x100', '600x600') || track.artworkUrl60?.replace('60x60', '600x600'),
      previewUrl: track.previewUrl,
      trackId: track.trackId,
      artistId: track.artistId,
      collectionId: track.collectionId,
      releaseDate: track.releaseDate,
      genre: track.primaryGenreName,
      durationMs: track.trackTimeMillis,
    }));
  } catch (error) {
    console.error('iTunes search error:', error);
    return [];
  }
}

export async function getTrackById(trackId: number): Promise<ItunesSearchResult | null> {
  try {
    const response = await axios.get(ITUNES_API_BASE, {
      params: {
        id: trackId,
        entity: 'song',
        country: 'US',
      },
      timeout: 10000,
    });

    const results = response.data.results || [];
    if (results.length === 0) return null;

    const track = results[0];
    return {
      id: `itunes-${track.trackId}`,
      title: track.trackName || 'Unknown',
      artist: track.artistName || 'Unknown',
      album: track.collectionName,
      albumArt: track.artworkUrl100?.replace('100x100', '600x600'),
      previewUrl: track.previewUrl,
      trackId: track.trackId,
      artistId: track.artistId,
      collectionId: track.collectionId,
      releaseDate: track.releaseDate,
      genre: track.primaryGenreName,
      durationMs: track.trackTimeMillis,
    };
  } catch (error) {
    console.error('iTunes lookup error:', error);
    return null;
  }
}

export async function enrichWithOdesli(url: string): Promise<OdesliLinks | null> {
  try {
    const response = await axios.get(ODESLI_API_BASE, {
      params: { url },
      timeout: 8000,
    });

    const data = response.data;
    const links: OdesliLinks = {};
    
    if (data.linksByPlatform?.spotify?.entityUniqueId) {
      links.spotifyId = data.linksByPlatform.spotify.entityUniqueId.replace('SPOTIFY_SONG::', '');
    }
    if (data.linksByPlatform?.appleMusic?.entityUniqueId) {
      links.appleMusicId = data.linksByPlatform.appleMusic.entityUniqueId.replace('APPLE_MUSIC_SONG::', '');
    }
    if (data.linksByPlatform?.youtube?.entityUniqueId) {
      links.youtubeId = data.linksByPlatform.youtube.entityUniqueId.replace('YOUTUBE_VIDEO::', '');
    }
    if (data.linksByPlatform?.tidal?.entityUniqueId) {
      links.tidalId = data.linksByPlatform.tidal.entityUniqueId.replace('TIDAL_SONG::', '');
    }
    if (data.linksByPlatform?.amazonMusic?.entityUniqueId) {
      links.amazonMusicId = data.linksByPlatform.amazonMusic.entityUniqueId;
    }
    if (data.linksByPlatform?.deezer?.entityUniqueId) {
      links.deezerId = data.linksByPlatform.deezer.entityUniqueId.replace('DEEZER_SONG::', '');
    }
    
    const entities = data.entitiesByUniqueId || {};
    for (const entity of Object.values(entities) as any[]) {
      if (entity?.apiProvider === 'spotify' && !links.albumArt && entity.thumbnailUrl) {
        links.albumArt = entity.thumbnailUrl;
      }
      if (!links.isrc) {
        links.isrc = entity?.isrc;
      }
    }

    return links;
  } catch (error) {
    console.error('Odesli enrichment error:', error);
    return null;
  }
}

export async function enrichWithOdesliByIsrc(isrc: string): Promise<OdesliLinks | null> {
  try {
    const response = await axios.get(ODESLI_API_BASE, {
      params: { isrc },
      timeout: 8000,
    });

    const data = response.data;
    const links: OdesliLinks = { isrc };
    
    if (data.linksByPlatform?.spotify?.entityUniqueId) {
      links.spotifyId = data.linksByPlatform.spotify.entityUniqueId.replace('SPOTIFY_SONG::', '');
    }
    if (data.linksByPlatform?.appleMusic?.entityUniqueId) {
      links.appleMusicId = data.linksByPlatform.appleMusic.entityUniqueId.replace('APPLE_MUSIC_SONG::', '');
    }
    
    const entities = data.entitiesByUniqueId || {};
    for (const entity of Object.values(entities) as any[]) {
      if (entity?.thumbnailUrl && !links.albumArt) {
        links.albumArt = entity.thumbnailUrl;
      }
    }

    return links;
  } catch (error) {
    console.error('Odesli ISRC enrichment error:', error);
    return null;
  }
}

export async function searchWithEnrichment(query: string, limit: number = 10): Promise<(ItunesSearchResult & Partial<OdesliLinks>)[]> {
  const tracks = await searchTracks(query, limit);
  
  if (tracks.length === 0) {
    return [];
  }

  const enrichedTracks = await Promise.all(
    tracks.slice(0, Math.min(5, tracks.length)).map(async (track) => {
      const itunesUrl = `https://music.apple.com/us/album/${track.collectionId}?i=${track.trackId}`;
      
      try {
        const links = await enrichWithOdesli(itunesUrl);
        return {
          ...track,
          spotifyId: links?.spotifyId,
          appleMusicId: links?.appleMusicId || String(track.trackId),
          isrc: links?.isrc,
          albumArt: links?.albumArt || track.albumArt,
        };
      } catch {
        return track;
      }
    })
  );

  return [...enrichedTracks, ...tracks.slice(5)];
}
