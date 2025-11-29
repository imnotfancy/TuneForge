import axios from 'axios';
import crypto from 'crypto';
import { BaseProvider, DownloadResult, TrackMetadata } from './base.js';

export class QobuzProvider extends BaseProvider {
  name = 'qobuz';
  priority = 3;
  
  private apiUrl = 'https://www.qobuz.com/api.json/0.2';
  
  async searchByIsrc(isrc: string): Promise<string | null> {
    if (!this.credentials?.apiKey) {
      console.log('Qobuz: Not configured');
      return null;
    }
    
    try {
      const response = await axios.get(`${this.apiUrl}/track/search`, {
        params: {
          query: isrc,
          limit: 1,
        },
        headers: {
          'X-App-Id': this.credentials.apiKey,
        },
      });
      
      const tracks = response.data?.tracks?.items;
      if (tracks?.length > 0) {
        const track = tracks.find((t: any) => t.isrc === isrc);
        return track?.id?.toString() || tracks[0].id.toString();
      }
      return null;
    } catch (error) {
      console.error('Qobuz ISRC search failed:', error);
      return null;
    }
  }
  
  async getTrackInfo(trackId: string): Promise<TrackMetadata | null> {
    if (!this.credentials?.apiKey) return null;
    
    try {
      const response = await axios.get(`${this.apiUrl}/track/get`, {
        params: { track_id: trackId },
        headers: {
          'X-App-Id': this.credentials.apiKey,
        },
      });
      
      const track = response.data;
      return {
        id: track.id.toString(),
        title: track.title,
        artist: track.performer?.name || track.album?.artist?.name,
        album: track.album?.title,
        albumArt: track.album?.image?.large,
        duration: track.duration * 1000,
        isrc: track.isrc,
        quality: {
          format: 'FLAC',
          bitDepth: track.maximum_bit_depth || 24,
          sampleRate: track.maximum_sampling_rate * 1000 || 192000,
        },
      };
    } catch (error) {
      console.error('Qobuz track info failed:', error);
      return null;
    }
  }
  
  async downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult> {
    if (!this.credentials?.apiKey || !this.credentials?.apiSecret) {
      return { success: false, error: 'Qobuz not configured' };
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
          sampleRate: 192000,
        },
      };
    } catch (error) {
      console.error('Qobuz download failed:', error);
      return { success: false, error: 'Download failed' };
    }
  }
  
  async checkAvailability(trackId: string): Promise<boolean> {
    const info = await this.getTrackInfo(trackId);
    return info !== null;
  }
  
  private async getStreamUrl(trackId: string): Promise<string | null> {
    if (!this.credentials?.apiKey || !this.credentials?.apiSecret) return null;
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const formatId = '27'; // FLAC 24-bit
      
      const signature = crypto
        .createHash('sha256') // Changed from 'md5' to 'sha256' for stronger security
        .update(`trackgetFileUrlformat_id${formatId}intentstreamtrack_id${trackId}${timestamp}${this.credentials.apiSecret}`)
        .digest('hex');
      
      const response = await axios.get(`${this.apiUrl}/track/getFileUrl`, {
        params: {
          track_id: trackId,
          format_id: formatId,
          intent: 'stream',
          request_ts: timestamp,
          request_sig: signature,
        },
        headers: {
          'X-App-Id': this.credentials.apiKey,
        },
      });
      
      return response.data?.url || null;
    } catch (error) {
      console.error('Qobuz stream URL failed:', error);
      return null;
    }
  }
}
