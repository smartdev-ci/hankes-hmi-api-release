/**
 * Service de gestion des reconnaissances musicales
 * Opérations CRUD sur la table music_recognitions via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface MusicRecognition {
  id: string;
  captureId: string;
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
  createdAt: Date;
}

interface MusicRecognitionInsert {
  captureId: string;
  trackId?: string | null;
  titre: string;
  artiste: string;
  album?: string | null;
  isrc?: string | null;
  label?: string | null;
  genre?: string | null;
  annee?: number | null;
  confidence: number;
  source: string;
  metadata?: any | null;
}

interface MusicRecognitionUpdate {
  trackId?: string | null;
  titre?: string;
  artiste?: string;
  album?: string | null;
  isrc?: string | null;
  label?: string | null;
  genre?: string | null;
  annee?: number | null;
  confidence?: number;
  source?: string;
  metadata?: any | null;
}

export class MusicRecognitionService {
  static async findAll(): Promise<MusicRecognition[]> {
    try {
      const data = await prisma.musicRecognition.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des reconnaissances');
    }
  }

  static async findById(id: string): Promise<MusicRecognition | null> {
    try {
      const data = await prisma.musicRecognition.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de la reconnaissance ${id}`);
    }
  }

  static async findByCaptureId(captureId: string): Promise<MusicRecognition | null> {
    try {
      const data = await prisma.musicRecognition.findUnique({
        where: { captureId },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de la reconnaissance pour la capture ${captureId}`);
    }
  }

  static async create(data: MusicRecognitionInsert): Promise<MusicRecognition> {
    try {
      const result = await prisma.musicRecognition.create({
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new DatabaseError('Une reconnaissance existe déjà pour cette capture');
      }
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création de la reconnaissance');
    }
  }

  static async createFromExisting(
    captureId: string,
    recognition: Omit<MusicRecognitionInsert, 'captureId'>,
    source: string
  ): Promise<MusicRecognition> {
    return this.create({
      ...recognition,
      captureId,
      source,
      metadata: {
        ...(recognition.metadata || {}),
        localRecognition: true,
        originalSource: recognition.source,
      },
    });
  }

  static async update(id: string, data: MusicRecognitionUpdate): Promise<MusicRecognition> {
    try {
      const result = await prisma.musicRecognition.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Reconnaissance ${id} non trouvée`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour de la reconnaissance ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.musicRecognition.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de la reconnaissance ${id}`);
    }
  }

  static async findByArtiste(artiste: string): Promise<MusicRecognition[]> {
    try {
      const data = await prisma.musicRecognition.findMany({
        where: {
          artiste: {
            contains: artiste,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des reconnaissances pour l'artiste ${artiste}`);
    }
  }

  static async findByTitre(titre: string): Promise<MusicRecognition[]> {
    try {
      const data = await prisma.musicRecognition.findMany({
        where: {
          titre: {
            contains: titre,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des reconnaissances pour le titre ${titre}`);
    }
  }

  /**
   * Retourne la première reconnaissance correspondant à l'ISRC donné.
   * On utilise findFirst (et non findUnique) car isrc n'est plus une contrainte unique
   * dans le schéma — un même ISRC peut apparaître sur plusieurs captures.
   */
  static async findByIsrc(isrc: string): Promise<MusicRecognition | null> {
    try {
      const data = await prisma.musicRecognition.findFirst({
        where: { isrc },
        orderBy: { createdAt: 'desc' },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche de la reconnaissance avec ISRC ${isrc}`);
    }
  }

  /**
   * Retourne toutes les reconnaissances correspondant à l'ISRC donné.
   */
  static async findAllByIsrc(isrc: string): Promise<MusicRecognition[]> {
    try {
      const data = await prisma.musicRecognition.findMany({
        where: { isrc },
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des reconnaissances avec ISRC ${isrc}`);
    }
  }

  static async count(): Promise<number> {
    try {
      const count = await prisma.musicRecognition.count();
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des reconnaissances');
    }
  }

  static async getTopArtistes(limit: number = 10): Promise<Array<{ artiste: string; count: number }>> {
    try {
      const data = await prisma.musicRecognition.findMany({
        select: { artiste: true },
        orderBy: { createdAt: 'desc' },
      });

      const stats = new Map<string, number>();
      data.forEach((recog) => {
        const count = stats.get(recog.artiste) || 0;
        stats.set(recog.artiste, count + 1);
      });

      return Array.from(stats.entries())
        .map(([artiste, count]) => ({ artiste, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la génération du top artistes');
    }
  }
}
