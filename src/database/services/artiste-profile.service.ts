/**
 * Service de gestion des profils artistes
 * Opérations CRUD sur la table artiste_profiles via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';

export interface ArtisteProfile {
  id: string;
  userId: string;
  nomArtiste: string;
  bio: string | null;
  isrc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtisteProfileInsert {
  userId: string;
  nomArtiste: string;
  bio?: string | null;
  isrc?: string | null;
}

export interface ArtisteProfileUpdate {
  nomArtiste?: string;
  bio?: string | null;
  isrc?: string | null;
}

export class ArtisteProfileService {
  /**
   * Récupérer tous les profils artistes
   */
  static async findAll(): Promise<ArtisteProfile[]> {
    try {
      const data = await prisma.artisteProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              telephone: true,
              isActive: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return data as unknown as ArtisteProfile[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des profils artistes');
    }
  }

  /**
   * Récupérer un profil artiste par son ID
   */
  static async findById(id: string): Promise<ArtisteProfile | null> {
    try {
      const data = await prisma.artisteProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              telephone: true,
              isActive: true,
              isVerified: true,
            },
          },
        },
      });
      return data as unknown as ArtisteProfile | null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération du profil artiste ${id}`);
    }
  }

  /**
   * Récupérer un profil artiste par l'ID de l'utilisateur
   */
  static async findByUserId(userId: string): Promise<ArtisteProfile | null> {
    try {
      const data = await prisma.artisteProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              telephone: true,
              isActive: true,
              isVerified: true,
            },
          },
        },
      });
      return data as unknown as ArtisteProfile | null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération du profil artiste pour l'utilisateur ${userId}`);
    }
  }

  /**
   * Créer un profil artiste (inscription publique)
   */
  static async create(data: ArtisteProfileInsert): Promise<ArtisteProfile> {
    try {
      // Vérifier que l'utilisateur existe et a le rôle artiste
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      if (user.role !== 'artiste') {
        throw new ValidationError('L\'utilisateur doit avoir le rôle "artiste"');
      }

      // Vérifier que l'artiste n'a pas déjà un profil
      const existingProfile = await prisma.artisteProfile.findUnique({
        where: { userId: data.userId },
      });

      if (existingProfile) {
        throw new ValidationError('Un profil artiste existe déjà pour cet utilisateur');
      }

      const result = await prisma.artisteProfile.create({
        data,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              telephone: true,
            },
          },
        },
      });

      return result as unknown as ArtisteProfile;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Un profil artiste avec cet ISRC existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la création du profil artiste');
    }
  }

  /**
   * Mettre à jour un profil artiste
   */
  static async update(id: string, data: ArtisteProfileUpdate): Promise<ArtisteProfile> {
    try {
      const result = await prisma.artisteProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              telephone: true,
            },
          },
        },
      });
      return result as unknown as ArtisteProfile;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Profil artiste ${id} non trouvé`);
      }
      if (error.code === 'P2002') {
        throw new ValidationError('Un profil artiste avec cet ISRC existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour du profil artiste ${id}`);
    }
  }

  /**
   * Supprimer un profil artiste
   */
  static async delete(id: string): Promise<void> {
    try {
      await prisma.artisteProfile.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression du profil artiste ${id}`);
    }
  }

  /**
   * Obtenir le récapitulatif des diffusions pour un artiste
   * Inclut: titre, artiste, établissement, date/heure de diffusion
   */
  static async getDiffusionsRecap(artisteUserId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    total: number;
    diffusions: Array<{
      id: string;
      titre: string;
      artiste: string;
      playedAt: Date;
      duree: number;
      etablissement: {
        id: string;
        nom: string;
        ville: string;
        region: string;
      };
    }>;
    stats: {
      totalDiffusions: number;
      etablissementsCount: number;
      villesCount: number;
    };
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const startDate = options?.startDate;
      const endDate = options?.endDate;

      // Construire le filtre de date
      const whereClause: any = {
        music: {
          artisteMusiques: {
            some: {
              artisteUserId,
            },
          },
        },
      };

      if (startDate || endDate) {
        whereClause.playedAt = {};
        if (startDate) whereClause.playedAt.gte = startDate;
        if (endDate) whereClause.playedAt.lte = endDate;
      }

      // Récupérer les diffusions avec pagination
      const [diffusions, totalCount] = await Promise.all([
        prisma.diffusion.findMany({
          where: whereClause,
          include: {
            etablissement: {
              select: {
                id: true,
                nom: true,
                ville: true,
                region: true,
              },
            },
            music: {
              select: {
                titre: true,
                artiste: true,
              },
            },
          },
          orderBy: { playedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.diffusion.count({
          where: whereClause,
        }),
      ]);

      // Calculer les statistiques
      const [etablissementsCount, villesCount] = await Promise.all([
        prisma.diffusion.groupBy({
          by: ['etablissementId'],
          where: whereClause,
        }).then((results) => results.length),
        prisma.etablissement.findMany({
          where: {
            id: {
              in: diffusions.map((d) => d.etablissementId),
            },
          },
          select: {
            ville: true,
          },
          distinct: ['ville'],
        }).then((results) => results.length),
      ]);

      return {
        total: totalCount,
        diffusions: diffusions.map((d) => ({
          id: d.id,
          titre: d.music.titre,
          artiste: d.music.artiste,
          playedAt: d.playedAt,
          duree: d.duree,
          etablissement: d.etablissement,
        })),
        stats: {
          totalDiffusions: totalCount,
          etablissementsCount,
          villesCount,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération du récapitulatif des diffusions pour l\'artiste');
    }
  }

  /**
   * Revendiquer une musique reconnue pour un artiste
   */
  static async revendiquerMusique(
    artisteUserId: string,
    musicRecognitionId?: string,
    isrc?: string,
    nomArtiste?: string
  ): Promise<any> {
    try {
      // Vérifier que l'utilisateur est un artiste
      const user = await prisma.user.findUnique({
        where: { id: artisteUserId },
      });

      if (!user || user.role !== 'artiste') {
        throw new ValidationError('Seul un utilisateur avec le rôle "artiste" peut revendiquer une musique');
      }

      // Vérifier si la revendication existe déjà
      const existingClaim = await prisma.artisteMusique.findFirst({
        where: {
          artisteUserId,
          musicRecognitionId: musicRecognitionId || null,
        },
      });

      if (existingClaim) {
        throw new ValidationError('Cette musique a déjà été revendiquée');
      }

      // Créer la revendication
      const claim = await prisma.artisteMusique.create({
        data: {
          artisteUserId,
          musicRecognitionId: musicRecognitionId || null,
          isrc: isrc || null,
          nomArtiste: nomArtiste || user.nom,
          verifie: false,
        },
        include: {
          musicRecognition: {
            select: {
              id: true,
              titre: true,
              artiste: true,
              isrc: true,
            },
          },
          artiste: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
      });

      return claim;
    } catch (error: any) {
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la revendication de la musique');
    }
  }

  /**
   * Obtenir toutes les musiques revendiquées par un artiste
   */
  static async getMusiquesRevendiquees(artisteUserId: string): Promise<any[]> {
    try {
      const claims = await prisma.artisteMusique.findMany({
        where: { artisteUserId },
        include: {
          musicRecognition: {
            select: {
              id: true,
              titre: true,
              artiste: true,
              isrc: true,
              album: true,
              genre: true,
              annee: true,
            },
          },
        },
        orderBy: { revendiqueAt: 'desc' },
      });

      return claims;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des musiques revendiquées');
    }
  }

  /**
   * Compter le nombre d'artistes
   */
  static async count(): Promise<number> {
    try {
      const count = await prisma.artisteProfile.count();
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des artistes');
    }
  }
}
