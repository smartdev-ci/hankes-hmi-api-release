/**
 * Service de gestion des établissements
 * Opérations CRUD sur la table etablissements via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';

type CreatorRole = 'admin' | 'recenseur';
type ManagedUserRole = 'etablissement';

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
  creePar: string | null;
  roleCreateur: CreatorRole | null;
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
  creePar?: string | null;
  roleCreateur?: CreatorRole | null;
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

interface GerantInput {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  isVerified?: boolean;
  isActive?: boolean;
}

interface CreateWithGerantInput {
  etablissement: Omit<EtablissementInsert, 'gerantId' | 'creePar' | 'roleCreateur'>;
  createurId: string;
  createurRole: CreatorRole;
  gerantId?: string;
  gerant?: GerantInput;
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

  static async createWithGerant(input: CreateWithGerantInput): Promise<any> {
    try {
      if (!['admin', 'recenseur'].includes(input.createurRole)) {
        throw new ValidationError('Seuls les admins et recenseurs peuvent creer des etablissements');
      }

      if (!input.gerantId && !input.gerant) {
        throw new ValidationError('Un gerant existant ou les informations du gerant sont requis');
      }

      return await prisma.$transaction(async (tx) => {
        let gerantId = input.gerantId;

        if (gerantId) {
          const gerant = await tx.user.findUnique({ where: { id: gerantId } });
          if (!gerant) {
            throw new ValidationError('Gerant introuvable');
          }
          if (gerant.role !== 'etablissement') {
            throw new ValidationError('Le gerant doit etre un utilisateur avec le role etablissement');
          }

          const existingEtablissement = await tx.etablissement.findUnique({
            where: { gerantId },
          });
          if (existingEtablissement) {
            throw new ValidationError('Cet utilisateur est deja gerant d un etablissement');
          }
        } else if (input.gerant) {
          const gerant = await tx.user.create({
            data: {
              email: input.gerant.email,
              password: input.gerant.password,
              nom: input.gerant.nom,
              telephone: input.gerant.telephone,
              role: 'etablissement' as ManagedUserRole,
              isVerified: input.gerant.isVerified ?? false,
              isActive: input.gerant.isActive ?? true,
              etablissementId: null,
            },
          });
          gerantId = gerant.id;
        }

        const etablissement = await tx.etablissement.create({
          data: {
            ...input.etablissement,
            gerantId: gerantId!,
            creePar: input.createurId,
            roleCreateur: input.createurRole,
          },
          include: {
            gerant: {
              select: {
                id: true,
                email: true,
                nom: true,
                telephone: true,
                role: true,
              },
            },
            createur: {
              select: {
                id: true,
                email: true,
                nom: true,
                role: true,
              },
            },
          },
        });

        await tx.user.update({
          where: { id: gerantId! },
          data: { etablissementId: etablissement.id },
        });

        return etablissement;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Email, telephone ou gerant deja utilise');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la creation transactionnelle de l etablissement');
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

  /**
   * Récupérer les établissements créés par un utilisateur (admin ou recenseur)
   */
  static async findByCreateur(createurId: string): Promise<Etablissement[]> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { creePar: createurId },
        include: {
          gerant: {
            select: {
              id: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },
          createur: {
            select: {
              id: true,
              nom: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return data as unknown as Etablissement[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération des établissements créés par ${createurId}`);
    }
  }

  static async addUserToEtablissement(
    etablissementId: string,
    userId: string,
    role: string,
    assignePar: string
  ): Promise<any> {
    try {
      const [etablissement, user, assigneur] = await Promise.all([
        prisma.etablissement.findUnique({ where: { id: etablissementId } }),
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user.findUnique({ where: { id: assignePar } }),
      ]);

      if (!etablissement) throw new NotFoundError('Etablissement non trouve');
      if (!user) throw new NotFoundError('Utilisateur non trouve');
      if (!assigneur) throw new NotFoundError('Utilisateur assignateur non trouve');

      if (etablissement.gerantId === userId) {
        throw new ValidationError('Le gerant est deja lie a cet etablissement');
      }

      return await prisma.etablissementUser.create({
        data: {
          etablissementId,
          userId,
          role,
          assignePar,
        },
        include: {
          user: {
            select: {
              id: true,
              nom: true,
              email: true,
              telephone: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Cet utilisateur est deja lie a cet etablissement');
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de l association utilisateur-etablissement');
    }
  }

  static async findUsers(etablissementId: string): Promise<any[]> {
    try {
      return await prisma.etablissementUser.findMany({
        where: { etablissementId },
        include: {
          user: {
            select: {
              id: true,
              nom: true,
              email: true,
              telephone: true,
              role: true,
              isActive: true,
            },
          },
          assigne: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
        orderBy: { assigneAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la recuperation des utilisateurs lies');
    }
  }

  static async removeUser(etablissementId: string, userId: string): Promise<void> {
    try {
      await prisma.etablissementUser.delete({
        where: {
          etablissementId_userId: {
            etablissementId,
            userId,
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Association utilisateur-etablissement non trouvee');
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erreur lors du retrait de l utilisateur lie');
    }
  }

  static async getStatsByVille(): Promise<Array<{ ville: string; count: number }>> {
    try {
      const data = await prisma.etablissement.findMany({
        where: { isActive: true },
        select: { ville: true },
      });

      const stats = new Map<string, number>();
      data.forEach((etab: { ville: string | null }) => {
        const ville = etab.ville ?? '';
        const count = stats.get(ville) || 0;
        stats.set(ville, count + 1);
      });

      return Array.from(stats.entries()).map(([ville, count]) => ({ ville, count }));
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la génération des statistiques par ville');
    }
  }
}
