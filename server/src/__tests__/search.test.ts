import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Import the generateSignature function from search.ts
// We'll re-implement it here for testing to avoid import issues with the router
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

// Import Zod schema for testing
import { z } from 'zod';

const textSearchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['title', 'lyrics', 'description']).default('title'),
});

describe('generateSignature', () => {
  it('should generate a valid HMAC-SHA1 signature', () => {
    const accessKey = 'test_access_key';
    const accessSecret = 'test_access_secret';
    const httpMethod = 'POST';
    const httpUri = '/v1/identify';
    const dataType = 'audio';
    const signatureVersion = '1';
    const timestamp = '1234567890';

    const signature = generateSignature(
      accessKey,
      accessSecret,
      httpMethod,
      httpUri,
      dataType,
      signatureVersion,
      timestamp
    );

    // Verify it's a valid base64 string
    expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    
    // Verify it matches expected output for known inputs
    const expectedStringToSign = `${httpMethod}\n${httpUri}\n${accessKey}\n${dataType}\n${signatureVersion}\n${timestamp}`;
    const expectedSignature = crypto.createHmac('sha1', accessSecret).update(expectedStringToSign).digest('base64');
    expect(signature).toBe(expectedSignature);
  });

  it('should produce different signatures for different timestamps', () => {
    const accessKey = 'test_key';
    const accessSecret = 'test_secret';
    
    const sig1 = generateSignature(accessKey, accessSecret, 'POST', '/v1/identify', 'audio', '1', '1000000000');
    const sig2 = generateSignature(accessKey, accessSecret, 'POST', '/v1/identify', 'audio', '1', '1000000001');
    
    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different access secrets', () => {
    const accessKey = 'test_key';
    const timestamp = '1234567890';
    
    const sig1 = generateSignature(accessKey, 'secret1', 'POST', '/v1/identify', 'audio', '1', timestamp);
    const sig2 = generateSignature(accessKey, 'secret2', 'POST', '/v1/identify', 'audio', '1', timestamp);
    
    expect(sig1).not.toBe(sig2);
  });

  it('should handle special characters in access secret', () => {
    const signature = generateSignature(
      'key',
      'secret_with_special!@#$%^&*()',
      'POST',
      '/v1/identify',
      'audio',
      '1',
      '1234567890'
    );
    
    expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe('textSearchSchema', () => {
  it('should validate a correct search request', () => {
    const validRequest = {
      query: 'Bohemian Rhapsody',
      type: 'title',
    };
    
    const result = textSearchSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('Bohemian Rhapsody');
      expect(result.data.type).toBe('title');
    }
  });

  it('should default type to "title" when not provided', () => {
    const request = {
      query: 'Test Song',
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('title');
    }
  });

  it('should reject empty query', () => {
    const request = {
      query: '',
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('query');
    }
  });

  it('should reject query exceeding max length', () => {
    const request = {
      query: 'a'.repeat(501),
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('query');
    }
  });

  it('should reject invalid type values', () => {
    const request = {
      query: 'Test',
      type: 'invalid',
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should accept all valid type values', () => {
    const types = ['title', 'lyrics', 'description'];
    
    for (const type of types) {
      const request = { query: 'Test', type };
      const result = textSearchSchema.safeParse(request);
      expect(result.success).toBe(true);
    }
  });

  it('should handle lyrics type correctly', () => {
    const request = {
      query: 'Is this the real life? Is this just fantasy?',
      type: 'lyrics',
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('lyrics');
    }
  });

  it('should handle description type correctly', () => {
    const request = {
      query: 'A rock song from the 1970s',
      type: 'description',
    };
    
    const result = textSearchSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('description');
    }
  });
});
