/**
 * Service de gestion des établissements
 * Opérations CRUD sur la table etablissements via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';

interface Etablissement {
  id: string;
  nom: string;
  type: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
  adresse: string;
  ville: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string;
  email: string | null;
  gerantId: string;
  isActive: boolean;
  isVerified: boolean;
  capacite: number | null;
  licence: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EtablissementInsert {
  nom: string;
  type: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
  adresse: string;
  ville: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  telephone: string;
  email?: string | null;
  gerantId: string;
  isActive?: boolean;
  isVerified?: boolean;
  capacite?: number | null;
  licence?: string | null;
}

interface EtablissementUpdate {
  nom?: string;
  type?: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
  adresse?: string;
  ville?: string;
  region?: string;
  latitude?: number | null;
  longitude?: number | null;
  telephone?: string;
  email?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  capacite?: number | null;
  licence?: string | null;
}

export class EtablissementService {
  static async findAll(): Promise<Etablissement[]> {
    try {
      const data = await prisma.etablissement.findMany({
        orderBy: { nom: 'asc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des établissements');
    }
  }

  static async findById(id: string): Promise<Etablissement | null> {
    try {
      const data = await prisma.etablissement.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de l'établissement ${id}`);
    }
  }

  static async create(data: EtablissementInsert): Promise<Etablissement> {
    try {
      const result = await prisma.etablissement.create({
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Un établissement avec ce gérant existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la création de l\'établissement');
    }
  }

  static async update(id: string, data: EtablissementUpdate): Promise<Etablissement> {
    try {
      const result = await prisma.etablissement.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Établissement ${id} non trouvé`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour de l'établissement ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.etablissement.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de l'établissement ${id}`);
    }
  }

  static async findByVille(ville: string): Promise<Etablissement[]> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { ville },
        orderBy: { nom: 'asc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des établissements à ${ville}`);
    }
  }

  static async findByRegion(region: string): Promise<Etablissement[]> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { region },
        orderBy: { nom: 'asc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des établissements dans ${region}`);
    }
  }

  static async findByType(type: Etablissement['type']): Promise<Etablissement[]> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { type },
        orderBy: { nom: 'asc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des établissements de type ${type}`);
    }
  }

  static async verifyEtablissement(id: string): Promise<Etablissement> {
    return this.update(id, { isVerified: true });
  }

  static async toggleActiveStatus(id: string, isActive: boolean): Promise<Etablissement> {
    return this.update(id, { isActive });
  }

  static async countActive(): Promise<number> {
    try {
      const count = await prisma.etablissement.count({
        where: { isActive: true },
      });
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des établissements actifs');
    }
  }

  static async getStatsByVille(): Promise<Array<{ ville: string; count: number }>> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { isActive: true },
        select: { ville: true },
      });

      const stats = new Map<string, number>();
      data.forEach((etab) => {
        const count = stats.get(etab.ville) || 0;
        stats.set(etab.ville, count + 1);
      });

      return Array.from(stats.entries()).map(([ville, count]) => ({ ville, count }));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la génération des statistiques par ville');
    }
  }
}
