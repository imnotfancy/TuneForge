import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface StemResult {
  type: 'vocals' | 'drums' | 'bass' | 'melody' | 'instrumental' | 'other';
  filePath: string;
  fileSize?: number;
}

export interface StemSeparationResult {
  success: boolean;
  stems?: StemResult[];
  error?: string;
  provider?: string;
}

export interface StemProvider {
  name: string;
  isConfigured(): boolean;
  separateStems(audioPath: string, outputDir: string): Promise<StemSeparationResult>;
}

export class LalalAIProvider implements StemProvider {
  name = 'lalal.ai';
  private apiKey: string | null = null;
  private apiUrl = 'https://www.lalal.ai/api';
  
  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  isConfigured(): boolean {
    return this.apiKey !== null;
  }
  
  async separateStems(audioPath: string, outputDir: string): Promise<StemSeparationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'LALAL.AI not configured' };
    }
    
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('filter_type', '2'); // Phoenix filter for best quality
      formData.append('stem', 'all');
      
      const uploadResponse = await axios.post(`${this.apiUrl}/upload/`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `license ${this.apiKey}`,
        },
      });
      
      const fileId = uploadResponse.data.id;
      
      await axios.post(`${this.apiUrl}/split/`, {
        id: fileId,
      }, {
        headers: {
          'Authorization': `license ${this.apiKey}`,
        },
      });
      
      let status = 'processing';
      let result: any;
      
      while (status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${this.apiUrl}/check/`, {
          params: { id: fileId },
          headers: {
            'Authorization': `license ${this.apiKey}`,
          },
        });
        
        status = statusResponse.data.status;
        result = statusResponse.data;
      }
      
      if (status !== 'done') {
        return { success: false, error: `Processing failed with status: ${status}` };
      }
      
      const stems: StemResult[] = [];
      
      if (result.stems) {
        for (const [stemType, stemData] of Object.entries(result.stems) as [string, any][]) {
          const outputPath = path.join(outputDir, `${stemType}.wav`);
          
          const stemResponse = await axios.get(stemData.url, {
            responseType: 'arraybuffer',
          });
          
          fs.writeFileSync(outputPath, stemResponse.data);
          
          stems.push({
            type: stemType as StemResult['type'],
            filePath: outputPath,
            fileSize: stemResponse.data.length,
          });
        }
      }
      
      return {
        success: true,
        stems,
        provider: this.name,
      };
    } catch (error) {
      console.error('LALAL.AI separation failed:', error);
      return { success: false, error: 'Stem separation failed' };
    }
  }
}

export class FadrProvider implements StemProvider {
  name = 'fadr';
  private apiKey: string | null = null;
  private apiUrl = 'https://api.fadr.com/v1';
  
  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  isConfigured(): boolean {
    return this.apiKey !== null;
  }
  
  async separateStems(audioPath: string, outputDir: string): Promise<StemSeparationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Fadr not configured' };
    }
    
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('separate_stems', 'true');
      formData.append('generate_midi', 'true');
      
      const response = await axios.post(`${this.apiUrl}/process`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      const jobId = response.data.job_id;
      
      let status = 'processing';
      let result: any;
      
      while (status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await axios.get(`${this.apiUrl}/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        
        status = statusResponse.data.status;
        result = statusResponse.data;
      }
      
      if (status !== 'completed') {
        return { success: false, error: `Processing failed with status: ${status}` };
      }
      
      const stems: StemResult[] = [];
      
      if (result.stems) {
        for (const stemData of result.stems) {
          const outputPath = path.join(outputDir, `${stemData.type}.wav`);
          
          const stemResponse = await axios.get(stemData.url, {
            responseType: 'arraybuffer',
          });
          
          fs.writeFileSync(outputPath, stemResponse.data);
          
          stems.push({
            type: stemData.type,
            filePath: outputPath,
            fileSize: stemResponse.data.length,
          });
        }
      }
      
      return {
        success: true,
        stems,
        provider: this.name,
      };
    } catch (error) {
      console.error('Fadr separation failed:', error);
      return { success: false, error: 'Stem separation failed' };
    }
  }
}

export class StemSeparationManager {
  private providers: StemProvider[] = [];
  
  constructor() {
    this.providers = [
      new LalalAIProvider(),
      new FadrProvider(),
    ];
  }
  
  configureProvider(name: string, apiKey: string): void {
    const provider = this.providers.find(p => p.name === name);
    if (provider && 'configure' in provider) {
      (provider as any).configure(apiKey);
    }
  }
  
  async separateStems(audioPath: string, outputDir: string, preferredProvider?: string): Promise<StemSeparationResult> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (preferredProvider) {
      const provider = this.providers.find(p => p.name === preferredProvider && p.isConfigured());
      if (provider) {
        return provider.separateStems(audioPath, outputDir);
      }
    }
    
    for (const provider of this.providers) {
      if (provider.isConfigured()) {
        const result = await provider.separateStems(audioPath, outputDir);
        if (result.success) {
          return result;
        }
      }
    }
    
    return { success: false, error: 'No configured stem separation provider available' };
  }
}

export const stemManager = new StemSeparationManager();
