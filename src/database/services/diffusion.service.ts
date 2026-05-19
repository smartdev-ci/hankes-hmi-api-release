/**
 * Service de gestion des diffusions
 * Opérations CRUD sur la table diffusions via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface Diffusion {
  id: string;
  etablissementId: string;
  musicId: string;
  titre: string;
  artiste: string;
  playedAt: Date;
  duree: number;
  source: 'capture' | 'manual' | 'playlist';
  userId: string | null;
  createdAt: Date;
}

interface DiffusionInsert {
  etablissementId: string;
  musicId: string;
  titre: string;
  artiste: string;
  playedAt: Date;
  duree: number;
  source: 'capture' | 'manual' | 'playlist';
  userId?: string | null;
}

interface DiffusionUpdate {
  etablissementId?: string;
  musicId?: string;
  titre?: string;
  artiste?: string;
  playedAt?: Date;
  duree?: number;
  source?: 'capture' | 'manual' | 'playlist';
  userId?: string | null;
}

export class DiffusionService {
  static async findAll(): Promise<Diffusion[]> {
    try {
      const data = await prisma.diffusion.findMany({
        orderBy: { playedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des diffusions');
    }
  }

  static async findById(id: string): Promise<Diffusion | null> {
    try {
      const data = await prisma.diffusion.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de la diffusion ${id}`);
    }
  }

  static async create(data: DiffusionInsert): Promise<Diffusion> {
    try {
      const result = await prisma.diffusion.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création de la diffusion');
    }
  }

  static async update(id: string, data: DiffusionUpdate): Promise<Diffusion> {
    try {
      const result = await prisma.diffusion.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Diffusion ${id} non trouvée`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour de la diffusion ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.diffusion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de la diffusion ${id}`);
    }
  }

  static async findByEtablissement(etablissementId: string): Promise<Diffusion[]> {
    try {
      const data = await prisma.diffusion.findMany({
        where: { etablissementId },
        orderBy: { playedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération des diffusions pour l'établissement ${etablissementId}`);
    }
  }

  static async findByDateRange(
    etablissementId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Diffusion[]> {
    try {
      const data = await prisma.diffusion.findMany({
        where: {
          etablissementId,
          playedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { playedAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des diffusions par période');
    }
  }

  static async count(): Promise<number> {
    try {
      const count = await prisma.diffusion.count();
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des diffusions');
    }
  }
}
