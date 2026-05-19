/**
 * Service de gestion des captures audio
 * Opérations CRUD sur la table audio_captures via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface AudioCapture {
  id: string;
  etablissementId: string;
  userId: string;
  audioUrl: string;
  duree: number;
  format: string;
  taille: number;
  statut: 'pending' | 'processing' | 'identified' | 'failed';
  deviceId: string | null;
  capturedAt: Date;
  syncedAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
}

interface AudioCaptureInsert {
  etablissementId: string;
  userId: string;
  audioUrl: string;
  duree: number;
  format: string;
  taille: number;
  statut?: 'pending' | 'processing' | 'identified' | 'failed';
  deviceId?: string | null;
  capturedAt: Date;
  syncedAt?: Date | null;
  processedAt?: Date | null;
}

interface AudioCaptureUpdate {
  etablissementId?: string;
  userId?: string;
  audioUrl?: string;
  duree?: number;
  format?: string;
  taille?: number;
  statut?: 'pending' | 'processing' | 'identified' | 'failed';
  deviceId?: string | null;
  capturedAt?: Date;
  syncedAt?: Date | null;
  processedAt?: Date | null;
}

export class AudioCaptureService {
  static async findAll(): Promise<AudioCapture[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        orderBy: { capturedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des captures audio');
    }
  }

  static async findById(id: string): Promise<AudioCapture | null> {
    try {
      const data = await prisma.audioCapture.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de la capture ${id}`);
    }
  }

  static async create(data: AudioCaptureInsert): Promise<AudioCapture> {
    try {
      const result = await prisma.audioCapture.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création de la capture audio');
    }
  }

  static async update(id: string, data: AudioCaptureUpdate): Promise<AudioCapture> {
    try {
      const result = await prisma.audioCapture.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Capture audio ${id} non trouvée`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour de la capture ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.audioCapture.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de la capture ${id}`);
    }
  }

  static async findByEtablissement(etablissementId: string): Promise<AudioCapture[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: { etablissementId },
        orderBy: { capturedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération des captures pour l'établissement ${etablissementId}`);
    }
  }

  static async findByUser(userId: string): Promise<AudioCapture[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: { userId },
        orderBy: { capturedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération des captures pour l'utilisateur ${userId}`);
    }
  }

  static async findByStatut(statut: AudioCapture['statut']): Promise<AudioCapture[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: { statut },
        orderBy: { capturedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération des captures avec le statut ${statut}`);
    }
  }

  static async markAsProcessed(id: string): Promise<AudioCapture> {
    return this.update(id, {
      statut: 'identified',
      processedAt: new Date(),
    });
  }

  static async markAsFailed(id: string): Promise<AudioCapture> {
    return this.update(id, {
      statut: 'failed',
      processedAt: new Date(),
    });
  }

  static async countPending(): Promise<number> {
    try {
      const count = await prisma.audioCapture.count({
        where: { statut: 'pending' },
      });
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des captures en attente');
    }
  }

  static async getRecentForProcessing(limit: number = 10): Promise<AudioCapture[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: { statut: 'pending' },
        orderBy: { capturedAt: 'asc' },
        take: limit,
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des captures pour traitement');
    }
  }
}
