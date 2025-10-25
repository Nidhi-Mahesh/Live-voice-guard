import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Voice Templates table - stores enrolled user voice profiles
export const voiceTemplates = sqliteTable('voice_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  voiceEmbedding: text('voice_embedding').notNull(),
  challengePhrase: text('challenge_phrase').notNull(),
  enrollmentAudioUrl: text('enrollment_audio_url'),
  deviceId: text('device_id').notNull(),
  enrollmentDate: integer('enrollment_date').notNull(),
  sampleCount: integer('sample_count').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
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
  finalDecision: text('final_decision').notNull(),
  deviceId: text('device_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  audioDuration: real('audio_duration').notNull(),
  snrScore: real('snr_score'),
  audioQuality: text('audio_quality').notNull(),
  spoofingIndicators: text('spoofing_indicators'),
  failureReason: text('failure_reason'),
  createdAt: integer('created_at').notNull(),
});

// Device Registry table - tracks device trust and usage patterns
export const deviceRegistry = sqliteTable('device_registry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().unique(),
  userId: text('user_id'),
  deviceFingerprint: text('device_fingerprint').notNull(),
  trustScore: real('trust_score').notNull().default(50),
  firstSeen: integer('first_seen').notNull(),
  lastSeen: integer('last_seen').notNull(),
  successfulAuths: integer('successful_auths').notNull().default(0),
  failedAuths: integer('failed_auths').notNull().default(0),
  isBlocked: integer('is_blocked', { mode: 'boolean' }).notNull().default(false),
  blockReason: text('block_reason'),
  deviceInfo: text('device_info'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});