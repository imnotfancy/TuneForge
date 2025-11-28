import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'identifying',
  'acquiring',
  'separating',
  'generating_midi',
  'completed',
  'failed'
]);

export const sourceTypeEnum = pgEnum('source_type', [
  'spotify_url',
  'audio_url',
  'file_upload',
  'isrc',
  'spotify_id',
  'apple_music_id'
]);

export const stemTypeEnum = pgEnum('stem_type', [
  'vocals',
  'drums',
  'bass',
  'melody',
  'instrumental',
  'other'
]);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: jobStatusEnum('status').notNull().default('pending'),
  sourceType: sourceTypeEnum('source_type').notNull(),
  sourceValue: text('source_value').notNull(),
  
  isrc: text('isrc'),
  spotifyId: text('spotify_id'),
  title: text('title'),
  artist: text('artist'),
  album: text('album'),
  albumArt: text('album_art'),
  duration: integer('duration'),
  
  songlinkData: jsonb('songlink_data'),
  
  masterAudioPath: text('master_audio_path'),
  masterAudioFormat: text('master_audio_format'),
  masterAudioService: text('master_audio_service'),
  
  progress: integer('progress').default(0),
  progressMessage: text('progress_message'),
  
  errorMessage: text('error_message'),
  
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  
  type: text('type').notNull(),
  stemType: stemTypeEnum('stem_type'),
  
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  
  hasMidi: boolean('has_midi').default(false),
  midiPath: text('midi_path'),
  
  provider: text('provider'),
  
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const providerConfigs = pgTable('provider_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  serviceName: text('service_name').notNull().unique(),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  
  priority: integer('priority').default(0),
  isEnabled: boolean('is_enabled').default(true),
  
  rateLimit: integer('rate_limit'),
  rateLimitWindow: integer('rate_limit_window'),
  currentUsage: integer('current_usage').default(0),
  usageResetAt: timestamp('usage_reset_at'),
  
  config: jsonb('config'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type ProviderConfig = typeof providerConfigs.$inferSelect;
