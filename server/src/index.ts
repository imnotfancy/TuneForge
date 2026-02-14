import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs.js';
import searchRouter from './routes/search.js';
import { cleanupExpiredAssets } from './workers/jobProcessor.js';

const app = express();
const PORT = process.env.PORT || 3001;

const getAllowedOrigins = (): string | string[] | boolean => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  }
  
  if (process.env.NODE_ENV === 'production') {
    const replitUrl = process.env.REPL_SLUG && process.env.REPL_OWNER
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : null;
    
    const allowedOrigins = [
      'https://*.replit.dev',
      'https://*.repl.co',
    ];
    
    if (replitUrl) {
      allowedOrigins.push(replitUrl);
    }
    
    return allowedOrigins;
  }
  
  return ['http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000'];
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (typeof allowedOrigins === 'boolean') {
      callback(null, allowedOrigins);
      return;
    }
    
    const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
    
    const isAllowed = origins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return pattern.test(origin);
      }
      return allowed === origin;
    });
    
    callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api/jobs', jobsRouter);
app.use('/api/search', searchRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

setInterval(() => {
  cleanupExpiredAssets().catch(err => {
    console.error('Cleanup failed:', err);
  });
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`TuneForge Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
