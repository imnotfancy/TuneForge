import crypto from 'crypto';
import { z } from 'zod';

/**
 * Generate ACRCloud signature for audio identification API
 */
export const generateSignature = (
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

/**
 * Zod schema for text search requests
 */
export const textSearchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['title', 'lyrics', 'description']).default('title'),
});
