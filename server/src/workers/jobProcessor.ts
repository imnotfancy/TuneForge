import { eq } from 'drizzle-orm';
import { db } from '../models/db.js';
import { jobs, assets, Job } from '../models/schema.js';
import { identifyTrack, lookupBySpotifyId, lookupByAppleMusicId, extractTrackInfo } from '../services/songlink.js';
import { providerManager } from '../services/providers/index.js';
import { stemManager } from '../services/stems.js';
import { midiManager } from '../services/midi.js';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const ASSET_EXPIRY_HOURS = 24;

interface ProcessingStep {
  name: string;
  progress: number;
  execute: (job: Job) => Promise<Partial<Job>>;
}

async function updateJobStatus(
  jobId: string, 
  status: Job['status'], 
  progress: number, 
  message: string,
  additionalData?: Partial<Job>
): Promise<void> {
  await db.update(jobs)
    .set({
      status,
      progress,
      progressMessage: message,
      updatedAt: new Date(),
      ...additionalData,
    })
    .where(eq(jobs.id, jobId));
}

async function identifyStep(job: Job): Promise<Partial<Job>> {
  if (job.title && job.artist) {
    if (job.isrc && job.songlinkData) {
      return {};
    }
    
    let response = null;
    
    if (job.sourceType === 'spotify_id') {
      response = await lookupBySpotifyId(job.sourceValue);
    } else if (job.sourceType === 'apple_music_id') {
      response = await lookupByAppleMusicId(job.sourceValue);
    }
    
    if (response) {
      const trackInfo = extractTrackInfo(response);
      return {
        isrc: trackInfo.isrc,
        spotifyId: trackInfo.spotifyId || job.spotifyId,
        songlinkData: {
          platforms: trackInfo.platforms,
          platformUrls: trackInfo.platformUrls,
          deezerId: trackInfo.deezerId,
          tidalId: trackInfo.tidalId,
          qobuzId: trackInfo.qobuzId,
        } as any,
      };
    }
    
    return {};
  }
  
  let trackInfo = null;
  
  if (job.sourceType === 'spotify_url' || job.sourceType === 'audio_url') {
    trackInfo = await identifyTrack(job.sourceValue);
  } else if (job.sourceType === 'isrc') {
    trackInfo = await identifyTrack(job.sourceValue);
  } else if (job.sourceType === 'spotify_id') {
    const response = await lookupBySpotifyId(job.sourceValue);
    if (response) {
      trackInfo = extractTrackInfo(response);
    }
  } else if (job.sourceType === 'apple_music_id') {
    const response = await lookupByAppleMusicId(job.sourceValue);
    if (response) {
      trackInfo = extractTrackInfo(response);
    }
  }
  
  if (!trackInfo) {
    throw new Error('Could not identify track');
  }
  
  return {
    isrc: trackInfo.isrc,
    title: trackInfo.title,
    artist: trackInfo.artist,
    album: trackInfo.album,
    albumArt: trackInfo.albumArt,
    spotifyId: trackInfo.spotifyId,
    songlinkData: {
      platforms: trackInfo.platforms,
      platformUrls: trackInfo.platformUrls,
      deezerId: trackInfo.deezerId,
      tidalId: trackInfo.tidalId,
      qobuzId: trackInfo.qobuzId,
    } as any,
  };
}

async function acquireAudioStep(job: Job): Promise<Partial<Job>> {
  if (job.masterAudioPath && fs.existsSync(job.masterAudioPath)) {
    return {};
  }
  
  if (job.sourceType === 'file_upload' && job.sourceValue) {
    if (fs.existsSync(job.sourceValue)) {
      return {
        masterAudioPath: job.sourceValue,
        masterAudioFormat: path.extname(job.sourceValue).slice(1).toUpperCase(),
        masterAudioService: 'upload',
      };
    }
    throw new Error('Uploaded file not found');
  }
  
  const outputDir = path.join(STORAGE_DIR, 'audio', job.id);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'master.flac');
  
  const songlinkData = job.songlinkData as Record<string, any> | null;
  const platformIds = {
    deezerId: songlinkData?.deezerId as string | undefined,
    tidalId: songlinkData?.tidalId as string | undefined,
    qobuzId: songlinkData?.qobuzId as string | undefined,
  };
  
  if (platformIds.deezerId || platformIds.tidalId || platformIds.qobuzId) {
    console.log('Attempting download by platform IDs:', platformIds);
    const result = await providerManager.downloadByPlatformIds(platformIds, outputPath);
    
    if (result.success) {
      return {
        masterAudioPath: result.filePath,
        masterAudioFormat: result.format,
        masterAudioService: result.provider,
      };
    }
    console.log('Platform ID download failed:', result.error);
  }
  
  if (job.isrc) {
    console.log('Attempting download by ISRC:', job.isrc);
    const result = await providerManager.downloadByIsrc(job.isrc, outputPath);
    
    if (result.success) {
      return {
        masterAudioPath: result.filePath,
        masterAudioFormat: result.format,
        masterAudioService: result.provider,
      };
    }
    console.log('ISRC download failed:', result.error);
  }
  
  throw new Error('Audio not available - no FLAC provider configured. Configure Tidal, Deezer, or Qobuz API keys in Settings.');
}

async function separateStemsStep(job: Job): Promise<Partial<Job>> {
  if (!job.masterAudioPath) {
    throw new Error('No master audio available for stem separation');
  }
  
  const outputDir = path.join(STORAGE_DIR, 'stems', job.id);
  const result = await stemManager.separateStems(job.masterAudioPath, outputDir);
  
  if (!result.success || !result.stems) {
    throw new Error(result.error || 'Stem separation failed');
  }
  
  const expiresAt = new Date(Date.now() + ASSET_EXPIRY_HOURS * 60 * 60 * 1000);
  
  for (const stem of result.stems) {
    await db.insert(assets).values({
      jobId: job.id,
      type: 'stem',
      stemType: stem.type,
      filePath: stem.filePath,
      fileSize: stem.fileSize,
      mimeType: 'audio/wav',
      provider: result.provider,
      expiresAt,
    });
  }
  
  return {};
}

async function generateMidiStep(job: Job): Promise<Partial<Job>> {
  const jobAssets = await db.query.assets.findMany({
    where: eq(assets.jobId, job.id),
  });
  
  const stems = jobAssets
    .filter(a => a.type === 'stem' && a.stemType)
    .map(a => ({ type: a.stemType!, path: a.filePath }));
  
  if (stems.length === 0) {
    return {};
  }
  
  const outputDir = path.join(STORAGE_DIR, 'midi', job.id);
  const result = await midiManager.generateMidiForStems(stems, outputDir);
  
  if (result.success && result.midiFiles) {
    for (const midi of result.midiFiles) {
      const stemAsset = jobAssets.find(a => a.stemType === midi.stemType);
      if (stemAsset) {
        await db.update(assets)
          .set({
            hasMidi: true,
            midiPath: midi.midiPath,
          })
          .where(eq(assets.id, stemAsset.id));
      }
    }
  }
  
  return {};
}

const processingSteps: ProcessingStep[] = [
  { name: 'identifying', progress: 10, execute: identifyStep },
  { name: 'acquiring', progress: 30, execute: acquireAudioStep },
  { name: 'separating', progress: 60, execute: separateStemsStep },
  { name: 'generating_midi', progress: 90, execute: generateMidiStep },
];

export async function processJob(jobId: string): Promise<void> {
  let job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });
  
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  try {
    for (const step of processingSteps) {
      await updateJobStatus(
        jobId, 
        step.name as Job['status'], 
        step.progress, 
        `${step.name.charAt(0).toUpperCase() + step.name.slice(1).replace('_', ' ')}...`
      );
      
      const updates = await step.execute(job);
      
      if (Object.keys(updates).length > 0) {
        await db.update(jobs)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(jobs.id, jobId));
        
        job = { ...job, ...updates } as Job;
      }
    }
    
    const expiresAt = new Date(Date.now() + ASSET_EXPIRY_HOURS * 60 * 60 * 1000);
    
    await updateJobStatus(jobId, 'completed', 100, 'Processing complete!', {
      expiresAt,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Job ${jobId} failed:`, error);
    
    await updateJobStatus(jobId, 'failed', 0, errorMessage, {
      errorMessage,
    });
  }
}

export async function cleanupExpiredAssets(): Promise<void> {
  const allJobs = await db.query.jobs.findMany();
  const now = new Date();
  const expiredJobs = allJobs.filter(job => job.expiresAt && job.expiresAt < now);
  
  for (const job of expiredJobs) {
    const jobStorageDir = path.join(STORAGE_DIR, 'audio', job.id);
    const stemsDir = path.join(STORAGE_DIR, 'stems', job.id);
    const midiDir = path.join(STORAGE_DIR, 'midi', job.id);
    
    for (const dir of [jobStorageDir, stemsDir, midiDir]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    
    await db.delete(jobs).where(eq(jobs.id, job.id));
  }
  
  console.log(`Cleaned up ${expiredJobs.length} expired jobs`);
}
