import { prisma } from '../index';
import { DatabaseError } from '../errors';
import {
  CachedRecognition,
  recognitionCacheService,
} from '../../services/recognition-cache.service';

export interface FingerprintInsert {
  fingerprint: string;
  fingerprintHash: string;
  algorithm: string;
  recognitionId: string;
  trackId?: string | null;
}

export interface LocalRecognitionMatch {
  source: 'cache' | 'database';
  recognition: CachedRecognition;
}

export class FingerprintRepository {
  static async findRecognitionByHash(fingerprintHash: string): Promise<LocalRecognitionMatch | null> {
    const cached = await recognitionCacheService.getByFingerprintHash(fingerprintHash);
    if (cached) {
      return { source: 'cache', recognition: cached };
    }

    try {
      const fingerprint = await prisma.fingerprint.findFirst({
        where: { fingerprintHash },
        include: {
          recognition: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!fingerprint?.recognition) return null;

      const recognition = this.toCachedRecognition(fingerprint.recognition);
      await recognitionCacheService.setByFingerprintHash(fingerprintHash, recognition);

      return { source: 'database', recognition };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la recherche locale par empreinte');
    }
  }

  static async create(data: FingerprintInsert) {
    try {
      const result = await prisma.fingerprint.create({
        data: {
          fingerprint: data.fingerprint,
          fingerprintHash: data.fingerprintHash,
          algorithm: data.algorithm,
          recognitionId: data.recognitionId,
          trackId: data.trackId || null,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la sauvegarde de l empreinte locale');
    }
  }

  static toCachedRecognition(recognition: {
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
  }): CachedRecognition {
    return {
      id: recognition.id,
      trackId: recognition.trackId,
      titre: recognition.titre,
      artiste: recognition.artiste,
      album: recognition.album,
      isrc: recognition.isrc,
      label: recognition.label,
      genre: recognition.genre,
      annee: recognition.annee,
      confidence: recognition.confidence,
      source: recognition.source,
      metadata: recognition.metadata,
    };
  }
}
