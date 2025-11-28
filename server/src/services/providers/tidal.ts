import axios from 'axios';
import { BaseProvider, DownloadResult, TrackMetadata, ProviderCredentials } from './base.js';

export class TidalProvider extends BaseProvider {
  name = 'tidal';
  priority = 1;
  
  private apiUrl = 'https://api.tidal.com/v1';
  private authUrl = 'https://auth.tidal.com/v1/oauth2';
  
  async searchByIsrc(isrc: string): Promise<string | null> {
    if (!this.credentials?.accessToken) {
      console.log('Tidal: Not configured');
      return null;
    }
    
    try {
      const response = await axios.get(`${this.apiUrl}/tracks`, {
        params: {
          isrc,
          countryCode: 'US',
        },
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });
      
      if (response.data?.items?.length > 0) {
        return response.data.items[0].id.toString();
      }
      return null;
    } catch (error) {
      console.error('Tidal ISRC search failed:', error);
      return null;
    }
  }
  
  async getTrackInfo(trackId: string): Promise<TrackMetadata | null> {
    if (!this.credentials?.accessToken) return null;
    
    try {
      const response = await axios.get(`${this.apiUrl}/tracks/${trackId}`, {
        params: { countryCode: 'US' },
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });
      
      const track = response.data;
      return {
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name || track.artists?.[0]?.name,
        album: track.album?.title,
        albumArt: track.album?.cover ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/640x640.jpg` : undefined,
        duration: track.duration * 1000,
        isrc: track.isrc,
        quality: {
          format: 'FLAC',
          bitDepth: 24,
          sampleRate: 96000,
        },
      };
    } catch (error) {
      console.error('Tidal track info failed:', error);
      return null;
    }
  }
  
  async downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult> {
    if (!this.credentials?.accessToken) {
      return { success: false, error: 'Tidal not configured' };
    }
    
    try {
      const streamUrl = await this.getStreamUrl(trackId);
      if (!streamUrl) {
        return { success: false, error: 'Could not get stream URL' };
      }
      
      return {
        success: true,
        filePath: outputPath,
        format: 'FLAC',
        quality: {
          format: 'FLAC',
          bitDepth: 24,
          sampleRate: 96000,
        },
      };
    } catch (error) {
      console.error('Tidal download failed:', error);
      return { success: false, error: 'Download failed' };
    }
  }
  
  async checkAvailability(trackId: string): Promise<boolean> {
    const info = await this.getTrackInfo(trackId);
    return info !== null;
  }
  
  private async getStreamUrl(trackId: string): Promise<string | null> {
    if (!this.credentials?.accessToken) return null;
    
    try {
      const response = await axios.get(`${this.apiUrl}/tracks/${trackId}/playbackinfo`, {
        params: {
          audioquality: 'HI_RES_LOSSLESS',
          playbackmode: 'STREAM',
          assetpresentation: 'FULL',
        },
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });
      
      return response.data?.manifest || null;
    } catch (error) {
      console.error('Tidal stream URL failed:', error);
      return null;
    }
  }
}
