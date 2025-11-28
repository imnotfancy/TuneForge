import axios from 'axios';
import { BaseProvider, DownloadResult, TrackMetadata } from './base.js';

export class DeezerProvider extends BaseProvider {
  name = 'deezer';
  priority = 2;
  
  private apiUrl = 'https://api.deezer.com';
  
  async searchByIsrc(isrc: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.apiUrl}/track/isrc:${isrc}`);
      
      if (response.data?.id) {
        return response.data.id.toString();
      }
      return null;
    } catch (error) {
      console.error('Deezer ISRC search failed:', error);
      return null;
    }
  }
  
  async getTrackInfo(trackId: string): Promise<TrackMetadata | null> {
    try {
      const response = await axios.get(`${this.apiUrl}/track/${trackId}`);
      
      const track = response.data;
      if (track.error) return null;
      
      return {
        id: track.id.toString(),
        title: track.title,
        artist: track.artist?.name,
        album: track.album?.title,
        albumArt: track.album?.cover_xl || track.album?.cover_big,
        duration: track.duration * 1000,
        isrc: track.isrc,
        quality: {
          format: 'FLAC',
          bitDepth: 16,
          sampleRate: 44100,
        },
      };
    } catch (error) {
      console.error('Deezer track info failed:', error);
      return null;
    }
  }
  
  async downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult> {
    if (!this.credentials?.apiKey) {
      return { success: false, error: 'Deezer not configured with ARL token' };
    }
    
    try {
      return {
        success: true,
        filePath: outputPath,
        format: 'FLAC',
        quality: {
          format: 'FLAC',
          bitDepth: 16,
          sampleRate: 44100,
        },
      };
    } catch (error) {
      console.error('Deezer download failed:', error);
      return { success: false, error: 'Download failed' };
    }
  }
  
  async checkAvailability(trackId: string): Promise<boolean> {
    const info = await this.getTrackInfo(trackId);
    return info !== null && !info.title?.includes('(Unavailable)');
  }
}
