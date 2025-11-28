import { StreamingProvider, DownloadResult, TrackMetadata, ProviderCredentials } from './base.js';
import { TidalProvider } from './tidal.js';
import { DeezerProvider } from './deezer.js';
import { QobuzProvider } from './qobuz.js';

export class ProviderManager {
  private providers: StreamingProvider[] = [];
  
  constructor() {
    this.providers = [
      new TidalProvider(),
      new DeezerProvider(),
      new QobuzProvider(),
    ];
    
    this.providers.sort((a, b) => a.priority - b.priority);
  }
  
  configureProvider(name: string, credentials: ProviderCredentials): void {
    const provider = this.providers.find(p => p.name === name);
    if (provider) {
      provider.configure(credentials);
    }
  }
  
  getConfiguredProviders(): string[] {
    return this.providers
      .filter(p => p.isConfigured())
      .map(p => p.name);
  }
  
  async searchByIsrc(isrc: string): Promise<{ provider: string; trackId: string } | null> {
    for (const provider of this.providers) {
      if (!provider.isConfigured()) continue;
      
      console.log(`Searching ${provider.name} for ISRC: ${isrc}`);
      const trackId = await provider.searchByIsrc(isrc);
      
      if (trackId) {
        console.log(`Found on ${provider.name}: ${trackId}`);
        return { provider: provider.name, trackId };
      }
    }
    
    for (const provider of this.providers) {
      if (provider.isConfigured()) continue;
      
      console.log(`Trying unconfigured ${provider.name} for ISRC: ${isrc}`);
      const trackId = await provider.searchByIsrc(isrc);
      
      if (trackId) {
        console.log(`Found on ${provider.name}: ${trackId}`);
        return { provider: provider.name, trackId };
      }
    }
    
    return null;
  }
  
  async getTrackInfo(provider: string, trackId: string): Promise<TrackMetadata | null> {
    const p = this.providers.find(prov => prov.name === provider);
    if (!p) return null;
    return p.getTrackInfo(trackId);
  }
  
  async downloadTrack(provider: string, trackId: string, outputPath: string): Promise<DownloadResult> {
    const p = this.providers.find(prov => prov.name === provider);
    if (!p) {
      return { success: false, error: `Provider ${provider} not found` };
    }
    
    if (!p.isConfigured()) {
      return { success: false, error: `Provider ${provider} not configured` };
    }
    
    return p.downloadTrack(trackId, outputPath);
  }
  
  async downloadByIsrc(isrc: string, outputPath: string): Promise<DownloadResult & { provider?: string }> {
    const searchResult = await this.searchByIsrc(isrc);
    if (!searchResult) {
      return { success: false, error: 'Track not found on any provider' };
    }
    
    const result = await this.downloadTrack(searchResult.provider, searchResult.trackId, outputPath);
    return { ...result, provider: searchResult.provider };
  }
}

export const providerManager = new ProviderManager();

export { TidalProvider, DeezerProvider, QobuzProvider };
export * from './base.js';
