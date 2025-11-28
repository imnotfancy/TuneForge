import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface MidiResult {
  stemType: string;
  midiPath: string;
  fileSize?: number;
}

export interface MidiGenerationResult {
  success: boolean;
  midiFiles?: MidiResult[];
  error?: string;
  provider?: string;
}

export interface MidiProvider {
  name: string;
  isConfigured(): boolean;
  generateMidi(audioPath: string, outputDir: string, stemType: string): Promise<MidiGenerationResult>;
}

export class BasicPitchProvider implements MidiProvider {
  name = 'basic-pitch';
  private apiUrl = 'https://basicpitch.spotify.com/api';
  
  isConfigured(): boolean {
    return true;
  }
  
  async generateMidi(audioPath: string, outputDir: string, stemType: string): Promise<MidiGenerationResult> {
    try {
      const formData = new FormData();
      formData.append('audio_file', fs.createReadStream(audioPath));
      
      const response = await axios.post(`${this.apiUrl}/predict`, formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
      });
      
      const outputPath = path.join(outputDir, `${stemType}.mid`);
      fs.writeFileSync(outputPath, response.data);
      
      return {
        success: true,
        midiFiles: [{
          stemType,
          midiPath: outputPath,
          fileSize: response.data.length,
        }],
        provider: this.name,
      };
    } catch (error) {
      console.error('Basic Pitch MIDI generation failed:', error);
      return { success: false, error: 'MIDI generation failed' };
    }
  }
}

export class FadrMidiProvider implements MidiProvider {
  name = 'fadr-midi';
  private apiKey: string | null = null;
  private apiUrl = 'https://api.fadr.com/v1';
  
  configure(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  isConfigured(): boolean {
    return this.apiKey !== null;
  }
  
  async generateMidi(audioPath: string, outputDir: string, stemType: string): Promise<MidiGenerationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Fadr MIDI not configured' };
    }
    
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('generate_midi', 'true');
      formData.append('separate_stems', 'false');
      
      const response = await axios.post(`${this.apiUrl}/midi`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      const jobId = response.data.job_id;
      
      let status = 'processing';
      let result: any;
      
      while (status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${this.apiUrl}/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
        
        status = statusResponse.data.status;
        result = statusResponse.data;
      }
      
      if (status !== 'completed' || !result.midi_url) {
        return { success: false, error: `MIDI generation failed with status: ${status}` };
      }
      
      const midiResponse = await axios.get(result.midi_url, {
        responseType: 'arraybuffer',
      });
      
      const outputPath = path.join(outputDir, `${stemType}.mid`);
      fs.writeFileSync(outputPath, midiResponse.data);
      
      return {
        success: true,
        midiFiles: [{
          stemType,
          midiPath: outputPath,
          fileSize: midiResponse.data.length,
        }],
        provider: this.name,
      };
    } catch (error) {
      console.error('Fadr MIDI generation failed:', error);
      return { success: false, error: 'MIDI generation failed' };
    }
  }
}

export class MidiGenerationManager {
  private providers: MidiProvider[] = [];
  
  constructor() {
    this.providers = [
      new BasicPitchProvider(),
      new FadrMidiProvider(),
    ];
  }
  
  configureProvider(name: string, apiKey: string): void {
    const provider = this.providers.find(p => p.name === name);
    if (provider && 'configure' in provider) {
      (provider as any).configure(apiKey);
    }
  }
  
  async generateMidi(audioPath: string, outputDir: string, stemType: string, preferredProvider?: string): Promise<MidiGenerationResult> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (preferredProvider) {
      const provider = this.providers.find(p => p.name === preferredProvider && p.isConfigured());
      if (provider) {
        return provider.generateMidi(audioPath, outputDir, stemType);
      }
    }
    
    for (const provider of this.providers) {
      if (provider.isConfigured()) {
        const result = await provider.generateMidi(audioPath, outputDir, stemType);
        if (result.success) {
          return result;
        }
      }
    }
    
    return { success: false, error: 'No configured MIDI provider available' };
  }
  
  async generateMidiForStems(stems: Array<{ type: string; path: string }>, outputDir: string): Promise<MidiGenerationResult> {
    const midiFiles: MidiResult[] = [];
    const stemTypesWithMidi = ['vocals', 'melody', 'bass'];
    
    for (const stem of stems) {
      if (!stemTypesWithMidi.includes(stem.type)) continue;
      
      const result = await this.generateMidi(stem.path, outputDir, stem.type);
      if (result.success && result.midiFiles) {
        midiFiles.push(...result.midiFiles);
      }
    }
    
    return {
      success: midiFiles.length > 0,
      midiFiles,
    };
  }
}

export const midiManager = new MidiGenerationManager();
