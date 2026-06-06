import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { config } from '../config';

const execFileAsync = promisify(execFile);

export interface FingerprintResult {
  fingerprint: string;
  fingerprintHash: string;
  algorithm: 'chromaprint' | 'sha256_fallback';
}

export class FingerprintService {
  async generate(audioBuffer: Buffer, filename: string = 'audio.wav'): Promise<FingerprintResult> {
    try {
      return await this.generateWithChromaprint(audioBuffer, filename);
    } catch (error: any) {
      if (!config.fingerprint.allowHashFallback) {
        throw new Error(`Fingerprint generation failed: ${error?.message || error}`);
      }

      return this.generateHashFallback(audioBuffer);
    }
  }

  hashFingerprint(fingerprint: string): string {
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  private async generateWithChromaprint(
    audioBuffer: Buffer,
    filename: string
  ): Promise<FingerprintResult> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hmis-audio-'));
    const safeFilename = path.basename(filename || 'audio.wav').replace(/[^\w.-]/g, '_');
    const inputPath = path.join(tempDir, safeFilename || 'audio.wav');

    try {
      await fs.writeFile(inputPath, audioBuffer);

      const { stdout } = await execFileAsync(
        config.fingerprint.fpcalcPath,
        ['-json', inputPath],
        { timeout: config.fingerprint.timeoutMs }
      );

      const parsed = JSON.parse(stdout);
      if (!parsed.fingerprint || typeof parsed.fingerprint !== 'string') {
        throw new Error('Chromaprint did not return a fingerprint');
      }

      return {
        fingerprint: parsed.fingerprint,
        fingerprintHash: this.hashFingerprint(parsed.fingerprint),
        algorithm: 'chromaprint',
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private generateHashFallback(audioBuffer: Buffer): FingerprintResult {
    const fingerprint = crypto.createHash('sha256').update(audioBuffer).digest('hex');

    return {
      fingerprint,
      fingerprintHash: this.hashFingerprint(fingerprint),
      algorithm: 'sha256_fallback',
    };
  }
}

export const fingerprintService = new FingerprintService();
export default fingerprintService;
