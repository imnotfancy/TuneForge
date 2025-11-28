export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  config?: Record<string, unknown>;
}

export interface AudioQuality {
  format: 'FLAC' | 'ALAC' | 'AAC' | 'MP3';
  bitDepth?: number;
  sampleRate?: number;
  bitrate?: number;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  format?: string;
  quality?: AudioQuality;
  error?: string;
}

export interface StreamingProvider {
  name: string;
  priority: number;
  
  isConfigured(): boolean;
  configure(credentials: ProviderCredentials): void;
  
  searchByIsrc(isrc: string): Promise<string | null>;
  getTrackInfo(trackId: string): Promise<TrackMetadata | null>;
  downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult>;
  
  checkAvailability(trackId: string): Promise<boolean>;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: number;
  isrc?: string;
  quality?: AudioQuality;
}

export abstract class BaseProvider implements StreamingProvider {
  abstract name: string;
  abstract priority: number;
  
  protected credentials: ProviderCredentials | null = null;
  
  isConfigured(): boolean {
    return this.credentials !== null;
  }
  
  configure(credentials: ProviderCredentials): void {
    this.credentials = credentials;
  }
  
  abstract searchByIsrc(isrc: string): Promise<string | null>;
  abstract getTrackInfo(trackId: string): Promise<TrackMetadata | null>;
  abstract downloadTrack(trackId: string, outputPath: string): Promise<DownloadResult>;
  abstract checkAvailability(trackId: string): Promise<boolean>;
}
