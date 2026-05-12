/**
 * Service de gestion des rapports
 */
import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface Rapport {
  id: string;
  type: 'etablissement' | 'periode' | 'artiste' | 'global';
  dateDebut: Date;
  dateFin: Date;
  format: 'pdf' | 'excel' | 'csv';
  statut: 'en_cours' | 'termine' | 'failed';
  fichierUrl: string | null;
  dateGeneration: Date;
  generePar: string;
  etablissementId: string | null;
  metadata: any | null;
  createdAt: Date;
}

interface RapportInsert {
  type: 'etablissement' | 'periode' | 'artiste' | 'global';
  dateDebut: Date;
  dateFin: Date;
  format?: 'pdf' | 'excel' | 'csv';
  statut?: 'en_cours' | 'termine' | 'failed';
  fichierUrl?: string | null;
  generePar: string;
  etablissementId?: string | null;
  metadata?: any | null;
}

interface RapportUpdate {
  type?: 'etablissement' | 'periode' | 'artiste' | 'global';
  dateDebut?: Date;
  dateFin?: Date;
  format?: 'pdf' | 'excel' | 'csv';
  statut?: 'en_cours' | 'termine' | 'failed';
  fichierUrl?: string | null;
  generePar?: string;
  etablissementId?: string | null;
  metadata?: any | null;
}

export class RapportService {
  static async findAll(): Promise<Rapport[]> {
    try {
      const data = await prisma.rapport.findMany({
        orderBy: { dateGeneration: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des rapports');
    }
  }

  static async findById(id: string): Promise<Rapport | null> {
    try {
      const data = await prisma.rapport.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération du rapport ${id}`);
    }
  }

  static async create(data: RapportInsert): Promise<Rapport> {
    try {
      const result = await prisma.rapport.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création du rapport');
    }
  }

  static async update(id: string, data: RapportUpdate): Promise<Rapport> {
    try {
      const result = await prisma.rapport.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Rapport ${id} non trouvé`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour du rapport ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.rapport.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression du rapport ${id}`);
    }
  }
}
