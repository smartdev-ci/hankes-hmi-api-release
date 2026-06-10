import Redis from 'ioredis';
import { config } from '../config';

export interface CachedRecognition {
  id: string;
  trackId: string | null;
  titre: string;
  artiste: string;
  album: string | null;
  isrc: string | null;
  label: string | null;
  genre: string | null;
  annee: number | null;
  confidence: number;
  source: string;
  metadata: any | null;
}

export class RecognitionCacheService {
  private readonly redis: Redis | null;

  constructor() {
    if (!config.recognitionCache.enabled) {
      this.redis = null;
      return;
    }

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 500,
    });

    this.redis.on('error', (error) => {
      return;
    });
  }

  async getByFingerprintHash(fingerprintHash: string): Promise<CachedRecognition | null> {
    if (!this.redis) return null;

    try {
      await this.ensureConnected();
      const raw = await this.redis.get(this.fingerprintKey(fingerprintHash));
      return raw ? JSON.parse(raw) as CachedRecognition : null;
    } catch (error: any) {
      console.warn('[RecognitionCache] Cache read skipped:', error.message);
      return null;
    }
  }

  async setByFingerprintHash(
    fingerprintHash: string,
    recognition: CachedRecognition,
    ttlSeconds: number = config.recognitionCache.ttlSeconds
  ): Promise<void> {
    if (!this.redis) return;

    try {
      await this.ensureConnected();
      await this.redis.set(
        this.fingerprintKey(fingerprintHash),
        JSON.stringify(recognition),
        'EX',
        ttlSeconds
      );
    } catch (error: any) {
      console.warn('[RecognitionCache] Cache write skipped:', error.message);
    }
  }

  private fingerprintKey(fingerprintHash: string): string {
    return `fingerprint:${fingerprintHash}`;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.redis || this.redis.status === 'ready') return;
    if (this.redis.status === 'connecting' || this.redis.status === 'connect') return;
    await this.redis.connect();
  }
}

export const recognitionCacheService = new RecognitionCacheService();
export default recognitionCacheService;
