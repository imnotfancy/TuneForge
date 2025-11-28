import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const router = Router();

interface SongSuggestion {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  isrc?: string;
  confidence: number;
  source: 'llm' | 'acrcloud' | 'musicbrainz';
  spotifyId?: string;
  appleMusicId?: string;
}

interface SearchProgress {
  stage: 'searching' | 'matching' | 'verifying' | 'complete';
  message: string;
  suggestions: SongSuggestion[];
}

const textSearchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['title', 'lyrics', 'description']).default('title'),
});

const generateSignature = (
  accessKey: string,
  accessSecret: string,
  httpMethod: string,
  httpUri: string,
  dataType: string,
  signatureVersion: string,
  timestamp: string
): string => {
  const stringToSign = `${httpMethod}\n${httpUri}\n${accessKey}\n${dataType}\n${signatureVersion}\n${timestamp}`;
  return crypto.createHmac('sha1', accessSecret).update(stringToSign).digest('base64');
};

router.post('/text', async (req: Request, res: Response) => {
  try {
    const validation = textSearchSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
    }
    
    const { query, type } = validation.data;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      return res.status(503).json({
        error: 'OpenAI API key not configured',
        message: 'Please configure OPENAI_API_KEY in settings',
      });
    }
    
    const systemPrompt = `You are a music identification assistant. Given a user's song description, lyrics fragment, or title, identify the most likely matching songs.

For each song you identify, provide:
- title: The exact song title
- artist: The primary artist name
- album: The album name if known
- isrc: The ISRC code if you know it (format: XXYYY1234567)
- confidence: Your confidence level from 0.0 to 1.0
- reason: Brief explanation of why this matches

Return a JSON array of up to 5 matches, ordered by confidence (highest first).
Only include songs you're reasonably confident about (>0.3 confidence).

Example response format:
{
  "matches": [
    {
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "isrc": "GBUM71029604",
      "confidence": 0.95,
      "reason": "Exact title match with famous rock ballad"
    }
  ]
}`;

    const userPrompt = type === 'lyrics' 
      ? `Identify songs containing these lyrics or similar: "${query}"`
      : type === 'description'
      ? `Identify songs matching this description: "${query}"`
      : `Identify songs with a title similar to: "${query}"`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const parsed = JSON.parse(content);
    const matches = parsed.matches || [];

    const suggestions: SongSuggestion[] = matches.map((match: {
      title: string;
      artist: string;
      album?: string;
      isrc?: string;
      confidence: number;
    }, index: number) => ({
      id: `llm-${Date.now()}-${index}`,
      title: match.title,
      artist: match.artist,
      album: match.album,
      isrc: match.isrc,
      confidence: Math.min(1, Math.max(0, match.confidence)),
      source: 'llm' as const,
    }));

    for (const suggestion of suggestions) {
      if (suggestion.isrc) {
        try {
          const songLinkResponse = await axios.get(
            `https://api.song.link/v1-alpha.1/links?isrc=${suggestion.isrc}`,
            { timeout: 5000 }
          );
          
          const data = songLinkResponse.data;
          if (data.linksByPlatform?.spotify?.entityUniqueId) {
            suggestion.spotifyId = data.linksByPlatform.spotify.entityUniqueId.replace('SPOTIFY_SONG::', '');
          }
          
          const entities = data.entitiesByUniqueId || {};
          const firstEntity = Object.values(entities)[0] as { thumbnailUrl?: string } | undefined;
          if (firstEntity?.thumbnailUrl) {
            suggestion.albumArt = firstEntity.thumbnailUrl;
          }
        } catch (err) {
          console.log(`Could not enrich ISRC ${suggestion.isrc}:`, err);
        }
      }
    }

    return res.json({
      query,
      type,
      suggestions,
      searchId: `search-${Date.now()}`,
    });
  } catch (error) {
    console.error('Text search error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return res.status(503).json({ error: 'Invalid OpenAI API key' });
      }
      if (error.response?.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded, please try again' });
      }
    }
    
    return res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/humming', async (req: Request, res: Response) => {
  try {
    const accessKey = process.env.ACRCLOUD_ACCESS_KEY;
    const accessSecret = process.env.ACRCLOUD_ACCESS_SECRET;
    const host = process.env.ACRCLOUD_HOST || 'identify-eu-west-1.acrcloud.com';
    
    if (!accessKey || !accessSecret) {
      return res.status(503).json({
        error: 'ACRCloud not configured',
        message: 'Please configure ACRCloud API keys in settings',
      });
    }
    
    const { audioPath, audioBuffer } = req.body;
    
    if (!audioPath && !audioBuffer) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    const httpMethod = 'POST';
    const httpUri = '/v1/identify';
    const dataType = 'audio';
    const signatureVersion = '1';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const signature = generateSignature(
      accessKey,
      accessSecret,
      httpMethod,
      httpUri,
      dataType,
      signatureVersion,
      timestamp
    );

    const formData = new FormData();
    
    if (audioPath && fs.existsSync(audioPath)) {
      formData.append('sample', fs.createReadStream(audioPath));
    } else if (audioBuffer) {
      const buffer = Buffer.from(audioBuffer, 'base64');
      formData.append('sample', buffer, { filename: 'audio.wav' });
    }
    
    formData.append('access_key', accessKey);
    formData.append('data_type', dataType);
    formData.append('signature_version', signatureVersion);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp);

    const response = await axios.post(
      `https://${host}/v1/identify`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 15000,
      }
    );

    const result = response.data;
    
    if (result.status?.code !== 0) {
      if (result.status?.code === 1001) {
        return res.json({ suggestions: [], message: 'No match found' });
      }
      return res.status(400).json({ 
        error: 'Recognition failed',
        message: result.status?.msg || 'Unknown error',
      });
    }

    const hummingMatches = result.metadata?.humming || result.metadata?.music || [];
    
    const suggestions: SongSuggestion[] = hummingMatches.map((match: {
      title?: string;
      artists?: { name: string }[];
      album?: { name: string };
      score?: string;
      external_ids?: {
        isrc?: string;
        spotify?: { track?: string };
      };
      external_metadata?: {
        spotify?: { album?: { images?: { url: string }[] } };
      };
    }, index: number) => ({
      id: `acr-${Date.now()}-${index}`,
      title: match.title || 'Unknown',
      artist: match.artists?.[0]?.name || 'Unknown',
      album: match.album?.name,
      isrc: match.external_ids?.isrc,
      confidence: parseFloat(match.score || '0'),
      source: 'acrcloud' as const,
      spotifyId: match.external_ids?.spotify?.track,
      albumArt: match.external_metadata?.spotify?.album?.images?.[0]?.url,
    }));

    return res.json({
      suggestions,
      searchId: `humming-${Date.now()}`,
    });
  } catch (error) {
    console.error('Humming search error:', error);
    return res.status(500).json({ error: 'Humming recognition failed' });
  }
});

router.get('/musicbrainz', async (req: Request, res: Response) => {
  try {
    const { query, type } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query required' });
    }

    const searchType = type === 'artist' ? 'artist' : 'recording';
    const response = await axios.get(
      `https://musicbrainz.org/ws/2/${searchType}`,
      {
        params: {
          query: query,
          fmt: 'json',
          limit: 10,
        },
        headers: {
          'User-Agent': 'TuneForge/1.0.0 (tuneforge@example.com)',
        },
        timeout: 10000,
      }
    );

    const recordings = response.data.recordings || [];
    
    const suggestions: SongSuggestion[] = recordings.slice(0, 5).map((rec: {
      id: string;
      title?: string;
      'artist-credit'?: { name?: string }[];
      releases?: { title?: string }[];
      score?: number;
      isrcs?: string[];
    }, index: number) => ({
      id: `mb-${rec.id || index}`,
      title: rec.title || 'Unknown',
      artist: rec['artist-credit']?.[0]?.name || 'Unknown',
      album: rec.releases?.[0]?.title,
      isrc: rec.isrcs?.[0],
      confidence: (rec.score || 0) / 100,
      source: 'musicbrainz' as const,
    }));

    return res.json({ suggestions });
  } catch (error) {
    console.error('MusicBrainz search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
