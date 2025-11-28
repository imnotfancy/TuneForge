import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

import { db } from '../models/db.js';
import { jobs, assets, NewJob } from '../models/schema.js';
import { processJob } from '../workers/jobProcessor.js';

const router = Router();

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

const createJobSchema = z.object({
  sourceType: z.enum(['spotify_url', 'audio_url', 'isrc']),
  sourceValue: z.string().min(1),
  title: z.string().optional(),
  artist: z.string().optional(),
  album: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const allJobs = await db.query.jobs.findMany({
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      limit,
    });
    
    return res.json({
      jobs: allJobs.map(job => ({
        id: job.id,
        status: job.status,
        title: job.title,
        artist: job.artist,
        album: job.album,
        albumArt: job.albumArt,
        progress: job.progress,
        progressMessage: job.progressMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({ error: 'Failed to get jobs' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createJobSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
    }
    
    const { sourceType, sourceValue, title, artist, album } = validation.data;
    
    const newJob: NewJob = {
      sourceType,
      sourceValue,
      title,
      artist,
      album,
      status: 'pending',
    };
    
    const [job] = await db.insert(jobs).values(newJob).returning();
    
    processJob(job.id).catch(err => {
      console.error(`Background job processing failed for ${job.id}:`, err);
    });
    
    return res.status(201).json({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ error: 'Failed to create job' });
  }
});

router.post('/upload', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const newJob: NewJob = {
      sourceType: 'file_upload',
      sourceValue: req.file.path,
      title: req.body.title,
      artist: req.body.artist,
      album: req.body.album,
      status: 'pending',
    };
    
    const [job] = await db.insert(jobs).values(newJob).returning();
    
    processJob(job.id).catch(err => {
      console.error(`Background job processing failed for ${job.id}:`, err);
    });
    
    return res.status(201).json({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('Upload job error:', error);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, req.params.id),
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const jobAssets = await db.query.assets.findMany({
      where: eq(assets.jobId, job.id),
    });
    
    const stemsList = jobAssets
      .filter(a => a.type === 'stem')
      .map(a => ({
        id: a.id,
        type: a.stemType,
        hasMidi: a.hasMidi,
        fileSize: a.fileSize,
      }));
    
    return res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      
      metadata: {
        title: job.title,
        artist: job.artist,
        album: job.album,
        albumArt: job.albumArt,
        duration: job.duration,
        isrc: job.isrc,
      },
      
      audioSource: {
        format: job.masterAudioFormat,
        service: job.masterAudioService,
      },
      
      stems: stemsList,
      
      error: job.errorMessage,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    console.error('Get job error:', error);
    return res.status(500).json({ error: 'Failed to get job' });
  }
});

router.get('/:id/stems/:stemType', async (req: Request, res: Response) => {
  try {
    const { id, stemType } = req.params;
    const { format } = req.query;
    
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed yet' });
    }
    
    const jobAssets = await db.query.assets.findMany({
      where: eq(assets.jobId, id),
    });
    
    const asset = jobAssets.find(a => a.stemType === stemType);
    
    if (!asset) {
      return res.status(404).json({ error: 'Stem not found' });
    }
    
    const filePath = format === 'midi' && asset.midiPath ? asset.midiPath : asset.filePath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const mimeType = format === 'midi' ? 'audio/midi' : 'audio/wav';
    const filename = `${job.title || 'track'}_${stemType}.${format === 'midi' ? 'mid' : 'wav'}`;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Download stem error:', error);
    return res.status(500).json({ error: 'Failed to download stem' });
  }
});

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed yet' });
    }
    
    const jobAssets = await db.query.assets.findMany({
      where: eq(assets.jobId, id),
    });
    
    const files = jobAssets.map(a => ({
      type: a.stemType,
      audioPath: a.filePath,
      midiPath: a.hasMidi ? a.midiPath : null,
    }));
    
    return res.json({
      title: job.title,
      artist: job.artist,
      files,
    });
  } catch (error) {
    console.error('Download all error:', error);
    return res.status(500).json({ error: 'Failed to get download info' });
  }
});

export default router;
