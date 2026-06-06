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

export interface AudioCaptureWithRecognition extends AudioCapture {
  recognition: {
    id: string;
    captureId: string;
    trackId: string | null;
    titre: string;
    artiste: string;
    album: string | null;
    isrc: string | null;
    label: string | null;
    annee: number | null;
    genre: string | null;
    confidence: number;
    source: string;
    metadata: any;
    createdAt: Date;
  } | null;
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

  /**
   * Récupère une capture avec sa reconnaissance associée
   */
  static async findByIdWithRecognition(id: string): Promise<AudioCaptureWithRecognition | null> {
    try {
      const data = await prisma.audioCapture.findUnique({
        where: { id },
        include: {
          recognition: true,
        },
      });
      return (data as AudioCaptureWithRecognition) || null;
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


  /**
   * Récupère les captures récentes d'un établissement avec leur reconnaissance
   * Utilisé pour le dédoublonnage : vérifier si une musique a déjà été identifiée
   * dans une fenêtre temporelle donnée.
   *
   * @param etablissementId - ID de l'établissement
   * @param since - Date de début de la fenêtre temporelle
   * @param limit - Nombre maximum de captures à récupérer (défaut: 50)
   * @returns Liste des captures avec reconnaissance, triées par date décroissante
   */
  static async findRecentWithRecognition(
    etablissementId: string,
    since: Date,
    limit: number = 50
  ): Promise<AudioCaptureWithRecognition[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: {
          etablissementId,
          capturedAt: { gte: since },
          statut: 'identified',
        },
        include: {
          recognition: true,
        },
        orderBy: { capturedAt: 'desc' },
        take: limit,
      });
      return data as AudioCaptureWithRecognition[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        `Erreur lors de la récupération des captures récentes pour l'établissement ${etablissementId}`
      );
    }
  }

  /**
   * Récupère toutes les captures d'un établissement sur une plage horaire
   * avec leur reconnaissance associée. Utilisé pour les statistiques de soirée.
   *
   * @param etablissementId - ID de l'établissement
   * @param start - Date de début de la plage
   * @param end - Date de fin de la plage
   * @returns Liste des captures avec reconnaissance, triées par date croissante
   */
  static async findWithRecognition(
    etablissementId: string,
    start: Date,
    end: Date
  ): Promise<AudioCaptureWithRecognition[]> {
    try {
      const data = await prisma.audioCapture.findMany({
        where: {
          etablissementId,
          capturedAt: { gte: start, lte: end },
          statut: 'identified',
        },
        include: {
          recognition: true,
        },
        orderBy: { capturedAt: 'asc' },
      });
      return data as AudioCaptureWithRecognition[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        `Erreur lors de la récupération des captures pour la plage horaire`
      );
    }
  }

  /**
   * Vérifie si une musique a déjà été capturée récemment pour un établissement.
   * C'est la méthode principale pour le dédoublonnage.
   *
   * Logique de match (par ordre de priorité) :
   * 1. Match par ISRC (le plus fiable, code unique international)
   * 2. Match par titre + artiste normalisés (fallback)
   *
   * @param etablissementId - ID de l'établissement
   * @param titre - Titre de la musique à vérifier
   * @param artiste - Artiste de la musique
   * @param isrc - Code ISRC (optionnel mais prioritaire)
   * @param windowMinutes - Fenêtre temporelle en minutes (défaut: 10)
   * @returns Objet indiquant si c'est un doublon et l'ID de la capture existante
   */
  static async checkDuplicate(
    etablissementId: string,
    titre: string,
    artiste: string,
    isrc: string | null = null,
    windowMinutes: number = 10
  ): Promise<{ isDuplicate: boolean; existingCaptureId?: string }> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
      const recentCaptures = await this.findRecentWithRecognition(
        etablissementId,
        windowStart
      );

      if (!recentCaptures || recentCaptures.length === 0) {
        return { isDuplicate: false };
      }

      const normalizedTitle = this.normalizeString(titre);
      const normalizedArtist = this.normalizeString(artiste);
      const normalizedIsrc = isrc ? this.normalizeString(isrc) : null;

      for (const capture of recentCaptures) {
        const recognition = capture.recognition;
        if (!recognition) continue;

        if (normalizedIsrc && recognition.isrc) {
          const existingIsrc = this.normalizeString(recognition.isrc);
          if (normalizedIsrc === existingIsrc) {
            return { isDuplicate: true, existingCaptureId: capture.id };
          }
        }

        if (normalizedTitle && normalizedArtist) {
          const existingTitle = this.normalizeString(recognition.titre);
          const existingArtist = this.normalizeString(recognition.artiste);

          if (existingTitle === normalizedTitle && existingArtist === normalizedArtist) {
            return { isDuplicate: true, existingCaptureId: capture.id };
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      console.error('[AudioCaptureService] Erreur checkDuplicate:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Récupère les statistiques d'une soirée pour un établissement
   * Retourne la liste des musiques uniques avec leur première heure de passage
   *
   * @param etablissementId - ID de l'établissement
   * @param date - Date de la soirée (par défaut : aujourd'hui)
   * @returns Statistiques de la soirée
   */
  static async getSoireeStats(etablissementId: string, date?: Date) {
    try {
      const targetDate = date || new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const captures = await this.findWithRecognition(etablissementId, dayStart, dayEnd);

      const uniqueTracks = new Map<string, any>();
      let totalCaptures = captures.length;
      let identifiedCaptures = 0;

      for (const capture of captures) {
        const recognition = capture.recognition;
        if (!recognition) continue;
        identifiedCaptures++;

        const key =
          recognition.isrc ||
          `${this.normalizeString(recognition.titre)}|${this.normalizeString(recognition.artiste)}`;

        if (!uniqueTracks.has(key)) {
          uniqueTracks.set(key, {
            titre: recognition.titre,
            artiste: recognition.artiste,
            album: recognition.album,
            isrc: recognition.isrc,
            label: recognition.label,
            genre: recognition.genre,
            annee: recognition.annee,
            confidence: recognition.confidence,
            firstPlayedAt: capture.capturedAt,
            lastPlayedAt: capture.capturedAt,
            playCount: 1,
          });
        } else {
          const track = uniqueTracks.get(key);
          track.playCount++;
          track.lastPlayedAt = capture.capturedAt;
        }
      }

      const tracks = Array.from(uniqueTracks.values()).sort(
        (a, b) => new Date(a.firstPlayedAt).getTime() - new Date(b.firstPlayedAt).getTime()
      );

      return {
        date: targetDate.toISOString().split('T')[0],
        etablissementId,
        periode: {
          start: dayStart.toISOString(),
          end: dayEnd.toISOString(),
        },
        stats: {
          totalCaptures,
          identifiedCaptures,
          uniqueTracks: tracks.length,
          totalPlayTime: tracks.reduce((sum, t) => sum + t.playCount * 15, 0),
        },
        tracks,
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du calcul des statistiques de soirée');
    }
  }


  /**
   * Normalise une chaîne pour comparaison fiable
   * - Minuscules
   * - Suppression de la ponctuation (sauf accents)
   * - Normalisation des espaces
   */
  private static normalizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }
}
