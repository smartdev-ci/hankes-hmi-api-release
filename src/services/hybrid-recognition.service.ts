import { config } from '../config';
import {
  AudioCaptureService,
  FingerprintRepository,
  MusicRecognitionService,
  TrackService,
} from '../database/services';
import { DiffusionService } from '../database/services/diffusion.service';
import acrcloudService, { ACRCloudMetadata } from './acrcloud.service';
import fingerprintService, { FingerprintResult } from './fingerprint.service';
import recognitionCacheService, { CachedRecognition } from './recognition-cache.service';

interface ProcessCaptureInput {
  captureId: string;
  etablissementId: string;
  userId: string;
  audioBuffer: Buffer;
  filename: string;
  capturedAt: Date;
  duree: number;
}

export type HybridRecognitionStatus =
  | 'identified'
  | 'no_match'
  | 'low_confidence'
  | 'duplicate';

export interface HybridRecognitionResult {
  status: HybridRecognitionStatus;
  message: string;
  capture: any;
  recognition?: any;
  diffusion?: any;
  fingerprint?: Pick<FingerprintResult, 'algorithm' | 'fingerprintHash'>;
  provider?: 'cache' | 'database' | 'acrcloud';
  duplicate?: boolean;
  existingCaptureId?: string;
  rejected?: boolean;
  reason?: string;
}

export class HybridRecognitionService {
  async processCapture(input: ProcessCaptureInput): Promise<HybridRecognitionResult> {
    const fingerprint = await fingerprintService.generate(input.audioBuffer, input.filename);

    const localMatch = await FingerprintRepository.findRecognitionByHash(fingerprint.fingerprintHash);
    if (localMatch) {
      return this.persistLocalMatch(input, fingerprint, localMatch.source, localMatch.recognition);
    }

    const metadata = await acrcloudService.identify(input.audioBuffer, input.filename);
    if (!metadata) {
      const capture = await AudioCaptureService.markAsFailed(input.captureId);
      return {
        status: 'no_match',
        message: 'Traitement termine sans correspondance',
        capture,
        fingerprint: this.publicFingerprint(fingerprint),
        provider: 'acrcloud',
      };
    }

    if (metadata.confidence < config.audio.minConfidence) {
      const capture = await AudioCaptureService.markAsFailed(input.captureId);
      return {
        status: 'low_confidence',
        message: `Confiance trop faible (${(metadata.confidence * 100).toFixed(0)}%)`,
        capture,
        fingerprint: this.publicFingerprint(fingerprint),
        provider: 'acrcloud',
        rejected: true,
        reason: 'low_confidence',
      };
    }

    const duplicate = await AudioCaptureService.checkDuplicate(
      input.etablissementId,
      metadata.title,
      metadata.artist,
      metadata.isrc || null,
      config.audio.duplicateWindowMinutes
    );

    if (duplicate.isDuplicate) {
      const capture = await AudioCaptureService.markAsFailed(input.captureId);
      return {
        status: 'duplicate',
        message: 'Musique deja identifiee recemment',
        capture,
        fingerprint: this.publicFingerprint(fingerprint),
        provider: 'acrcloud',
        duplicate: true,
        existingCaptureId: duplicate.existingCaptureId,
        reason: 'duplicate',
      };
    }

    return this.persistAcrCloudMatch(input, fingerprint, metadata);
  }

  private async persistLocalMatch(
    input: ProcessCaptureInput,
    fingerprint: FingerprintResult,
    provider: 'cache' | 'database',
    matchedRecognition: CachedRecognition
  ): Promise<HybridRecognitionResult> {
    const duplicate = await AudioCaptureService.checkDuplicate(
      input.etablissementId,
      matchedRecognition.titre,
      matchedRecognition.artiste,
      matchedRecognition.isrc,
      config.audio.duplicateWindowMinutes
    );

    if (duplicate.isDuplicate) {
      const capture = await AudioCaptureService.markAsFailed(input.captureId);
      return {
        status: 'duplicate',
        message: 'Musique deja identifiee recemment',
        capture,
        fingerprint: this.publicFingerprint(fingerprint),
        provider,
        duplicate: true,
        existingCaptureId: duplicate.existingCaptureId,
        reason: 'duplicate',
      };
    }

    const track = matchedRecognition.trackId
      ? await TrackService.findById(matchedRecognition.trackId)
      : await TrackService.upsertFromRecognition({
          titre: matchedRecognition.titre,
          artiste: matchedRecognition.artiste,
          album: matchedRecognition.album,
          isrc: matchedRecognition.isrc,
          genre: matchedRecognition.genre,
          annee: matchedRecognition.annee,
        });

    const recognition = await MusicRecognitionService.createFromExisting(
      input.captureId,
      {
        trackId: track?.id || matchedRecognition.trackId,
        titre: matchedRecognition.titre,
        artiste: matchedRecognition.artiste,
        album: matchedRecognition.album,
        isrc: matchedRecognition.isrc,
        label: matchedRecognition.label,
        genre: matchedRecognition.genre,
        annee: matchedRecognition.annee,
        confidence: matchedRecognition.confidence,
        source: matchedRecognition.source,
        metadata: matchedRecognition.metadata,
      },
      provider === 'cache' ? 'local_cache' : 'local_fingerprint'
    );

    await this.persistFingerprint(fingerprint, recognition.id, recognition.trackId);
    await recognitionCacheService.setByFingerprintHash(
      fingerprint.fingerprintHash,
      FingerprintRepository.toCachedRecognition(recognition)
    );

    const diffusion = await this.createDiffusion(input, recognition);
    const capture = await AudioCaptureService.markAsProcessed(input.captureId);

    return {
      status: 'identified',
      message: 'Musique identifiee localement et diffusion enregistree avec succes',
      capture,
      recognition,
      diffusion,
      fingerprint: this.publicFingerprint(fingerprint),
      provider,
    };
  }

  private async persistAcrCloudMatch(
    input: ProcessCaptureInput,
    fingerprint: FingerprintResult,
    metadata: ACRCloudMetadata
  ): Promise<HybridRecognitionResult> {
    const releaseDate = metadata.releaseDate ? new Date(metadata.releaseDate) : null;
    const annee = releaseDate && !Number.isNaN(releaseDate.getTime())
      ? releaseDate.getFullYear()
      : null;
    const genre = metadata.genres?.join(', ') || null;

    const track = await TrackService.upsertFromRecognition({
      titre: metadata.title,
      artiste: metadata.artist,
      isrc: metadata.isrc || null,
      genre,
      annee,
    });

    const recognition = await MusicRecognitionService.create({
      captureId: input.captureId,
      trackId: track.id,
      titre: metadata.title,
      artiste: metadata.artist,
      isrc: metadata.isrc || null,
      label: metadata.label || null,
      annee,
      genre,
      confidence: metadata.confidence,
      source: 'acrcloud',
      metadata: {
        ...metadata,
        fingerprintAlgorithm: fingerprint.algorithm,
      } as any,
    });

    await this.persistFingerprint(fingerprint, recognition.id, track.id);
    await recognitionCacheService.setByFingerprintHash(
      fingerprint.fingerprintHash,
      FingerprintRepository.toCachedRecognition(recognition)
    );

    const diffusion = await this.createDiffusion(input, recognition);
    const capture = await AudioCaptureService.markAsProcessed(input.captureId);

    return {
      status: 'identified',
      message: 'Musique identifiee via ACRCloud, sauvegardee localement et diffusion enregistree',
      capture,
      recognition,
      diffusion,
      fingerprint: this.publicFingerprint(fingerprint),
      provider: 'acrcloud',
    };
  }

  private async createDiffusion(input: ProcessCaptureInput, recognition: any) {
    return DiffusionService.create({
      etablissementId: input.etablissementId,
      musicId: recognition.id,
      titre: recognition.titre,
      artiste: recognition.artiste,
      playedAt: input.capturedAt,
      duree: input.duree,
      source: 'capture',
      userId: input.userId,
      captureId: input.captureId,
    });
  }

  private async persistFingerprint(
    fingerprint: FingerprintResult,
    recognitionId: string,
    trackId?: string | null
  ): Promise<void> {
    await FingerprintRepository.create({
      fingerprint: fingerprint.fingerprint,
      fingerprintHash: fingerprint.fingerprintHash,
      algorithm: fingerprint.algorithm,
      recognitionId,
      trackId: trackId || null,
    });
  }

  private publicFingerprint(fingerprint: FingerprintResult) {
    return {
      algorithm: fingerprint.algorithm,
      fingerprintHash: fingerprint.fingerprintHash,
    };
  }
}

export const hybridRecognitionService = new HybridRecognitionService();
export default hybridRecognitionService;
