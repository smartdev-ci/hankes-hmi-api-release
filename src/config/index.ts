import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'hmis-dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Database (PostgreSQL)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'hmis_db',
    user: process.env.DB_USER || 'hmis_user',
    password: process.env.DB_PASSWORD || 'hmis_password',
  },
  
  // Redis (for OTP and sessions)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Audio recognition pipeline
  audio: {
    maxFileSizeBytes: parseInt(process.env.AUDIO_MAX_FILE_SIZE_BYTES || `${10 * 1024 * 1024}`),
    minConfidence: parseFloat(process.env.AUDIO_MIN_CONFIDENCE || '0.6'),
    duplicateWindowMinutes: parseInt(process.env.AUDIO_DUPLICATE_WINDOW_MINUTES || '10'),
  },

  fingerprint: {
    fpcalcPath: process.env.FPCALC_PATH || 'fpcalc',
    timeoutMs: parseInt(process.env.FINGERPRINT_TIMEOUT_MS || '5000'),
    allowHashFallback: process.env.FINGERPRINT_ALLOW_HASH_FALLBACK !== 'false',
  },

  recognitionCache: {
    enabled: process.env.MUSIC_RECOGNITION_CACHE_ENABLED !== 'false',
    ttlSeconds: parseInt(process.env.MUSIC_RECOGNITION_CACHE_TTL_SECONDS || `${24 * 60 * 60}`),
  },
  
  // Twilio (OTP SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  
  // ACRCloud (Music Recognition - Primary)
  acrcloud: {
    apiKey: process.env.ACRCLOUD_API_KEY || '',
    apiSecret: process.env.ACRCLOUD_API_SECRET || '',
    host: process.env.ACRCLOUD_HOST || 'identify-eu-west-1.acrcloud.com',
  },
  
  // AudD (Music Recognition - Fallback)
  audd: {
    apiToken: process.env.AUDD_API_TOKEN || '',
  },
  
  // AWS S3 (File Storage)
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'hmis-uploads',
    region: process.env.AWS_REGION || 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  
  // Email (AWS SES)
  ses: {
    region: process.env.AWS_REGION || 'eu-west-1',
    fromEmail: process.env.SES_FROM_EMAIL || 'noreply@hmis-project.ci',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};

export default config;
