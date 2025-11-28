import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return '/api';
  }
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) {
    return `http://${debuggerHost}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface JobStatus {
  id: string;
  status: 'pending' | 'identifying' | 'acquiring' | 'separating' | 'generating_midi' | 'completed' | 'failed';
  progress: number;
  progressMessage?: string;
  
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    albumArt?: string;
    duration?: number;
    isrc?: string;
  };
  
  audioSource?: {
    format?: string;
    service?: string;
  };
  
  stems?: {
    id: string;
    type: string;
    hasMidi: boolean;
    fileSize?: number;
  }[];
  
  error?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  isrc?: string;
  duration?: number;
  confidence?: number;
  sources?: {
    platform: string;
    url: string;
  }[];
}

export interface StemAsset {
  id: string;
  name: string;
  type: 'vocals' | 'drums' | 'bass' | 'melodies' | 'instrumental';
  url: string;
  midiUrl?: string;
  duration: number;
  size: number;
  expiresAt: string;
}

export interface JobResult {
  trackInfo?: TrackInfo;
  stems?: StemAsset[];
  originalAudioUrl?: string;
  flacUrl?: string;
}

export interface CreateJobRequest {
  sourceType: 'spotify_url' | 'audio_url' | 'isrc';
  sourceValue: string;
  title?: string;
  artist?: string;
  album?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

class TuneForgeAPI {
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createJob(data: CreateJobRequest): Promise<{ id: string; status: string; createdAt: string }> {
    try {
      const response = await api.post('/jobs', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadAudioAndCreateJob(
    audioUri: string,
    metadata?: { title?: string; artist?: string; album?: string }
  ): Promise<{ id: string; status: string; createdAt: string }> {
    try {
      const formData = new FormData();
      
      const filename = audioUri.split('/').pop() || 'audio.mp3';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `audio/${match[1]}` : 'audio/mpeg';
      
      formData.append('audio', {
        uri: audioUri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);
      
      if (metadata?.title) {
        formData.append('title', metadata.title);
      }
      if (metadata?.artist) {
        formData.append('artist', metadata.artist);
      }
      if (metadata?.album) {
        formData.append('album', metadata.album);
      }

      const response = await api.post('/jobs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      return response.data.job;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    intervalMs: number = 2000,
    maxAttempts: number = 150
  ): Promise<JobStatus> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }
          
          if (status.status === 'completed') {
            resolve(status);
            return;
          }
          
          if (status.status === 'failed') {
            reject(new Error(status.error || 'Job failed'));
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Job polling timeout exceeded'));
            return;
          }
          
          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }

  async getAssetUrl(assetId: string): Promise<string> {
    try {
      const response = await api.get(`/jobs/assets/${assetId}/url`);
      return response.data.url;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      await api.post(`/jobs/${jobId}/cancel`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRecentJobs(limit: number = 10): Promise<{
    id: string;
    status: string;
    title?: string;
    artist?: string;
    album?: string;
    albumArt?: string;
    progress: number;
    progressMessage?: string;
    createdAt: string;
    updatedAt: string;
  }[]> {
    try {
      const response = await api.get('/jobs', { params: { limit } });
      return response.data.jobs;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  getStemDownloadUrl(jobId: string, stemType: string, format: 'audio' | 'midi' = 'audio'): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/jobs/${jobId}/stems/${stemType}${format === 'midi' ? '?format=midi' : ''}`;
  }

  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string; details?: unknown }>;
      
      if (axiosError.response) {
        return {
          message: axiosError.response.data?.error || 'Server error',
          code: `HTTP_${axiosError.response.status}`,
          details: axiosError.response.data?.details,
        };
      }
      
      if (axiosError.code === 'ECONNABORTED') {
        return {
          message: 'Request timeout - the server took too long to respond',
          code: 'TIMEOUT',
        };
      }
      
      if (axiosError.code === 'ERR_NETWORK') {
        return {
          message: 'Network error - please check your connection',
          code: 'NETWORK_ERROR',
        };
      }
    }
    
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'UNKNOWN',
    };
  }
}

export const tuneForgeAPI = new TuneForgeAPI();
export default tuneForgeAPI;
