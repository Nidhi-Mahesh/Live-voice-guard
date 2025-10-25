import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Voice Templates table - stores enrolled user voice profiles
export const voiceTemplates = sqliteTable('voice_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  voiceEmbedding: text('voice_embedding').notNull(),
  enrollmentDate: integer('enrollment_date').notNull(),
  enrollmentAudioDuration: real('enrollment_audio_duration').notNull(),
  enrollmentAudioQuality: real('enrollment_audio_quality').notNull(),
  sampleCount: integer('sample_count').notNull().default(3),
  deviceId: text('device_id').notNull(),
  challengePhrases: text('challenge_phrases').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Authentication Logs table - tracks all authentication attempts
export const authenticationLogs = sqliteTable('authentication_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  timestamp: integer('timestamp').notNull(),
  svScore: real('sv_score').notNull(),
  cmScore: real('cm_score').notNull(),
  fusionScore: real('fusion_score').notNull(),
  decision: text('decision').notNull(),
  deviceId: text('device_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  audioDuration: real('audio_duration').notNull(),
  audioQualitySnr: real('audio_quality_snr').notNull(),
  channelType: text('channel_type').notNull(),
  backgroundNoiseLevel: real('background_noise_level').notNull(),
  challengePhrase: text('challenge_phrase').notNull(),
  failureReason: text('failure_reason'),
  createdAt: integer('created_at').notNull(),
});

// Device Registry table - tracks device trust and usage patterns
export const deviceRegistry = sqliteTable('device_registry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().unique(),
  userId: text('user_id').notNull(),
  deviceInfo: text('device_info').notNull(),
  trustScore: real('trust_score').notNull().default(100.0),
  firstSeen: integer('first_seen').notNull(),
  lastSeen: integer('last_seen').notNull(),
  totalAuthentications: integer('total_authentications').notNull().default(0),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  isTrusted: integer('is_trusted', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});