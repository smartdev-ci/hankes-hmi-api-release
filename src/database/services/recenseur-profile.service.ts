/**
 * Service de gestion des profils recenseurs
 * Opérations CRUD sur la table recenseur_profiles via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';

type PieceIdentiteType = 'cni' | 'passeport' | 'titre_sejour' | 'carte_consulaire';

export interface RecenseurProfile {
  id: string;
  userId: string;
  numeroPiece: string;
  typePiece: PieceIdentiteType;
  dateNaissance: Date;
  photoIdentiteUrl: string;
  creePar: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecenseurProfileInsert {
  userId: string;
  numeroPiece: string;
  typePiece: PieceIdentiteType;
  dateNaissance: Date;
  photoIdentiteUrl: string;
  creePar: string;
}

export interface RecenseurProfileUpdate {
  numeroPiece?: string;
  typePiece?: PieceIdentiteType;
  dateNaissance?: Date;
  photoIdentiteUrl?: string;
}

export class RecenseurProfileService {
  /**
   * Récupérer tous les profils recenseurs
   */
  static async findAll(): Promise<RecenseurProfile[]> {
    try {
      const data = await prisma.recenseurProfile.findMany({
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
          admin: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return data as unknown as RecenseurProfile[];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des profils recenseurs');
    }
  }

  /**
   * Récupérer un profil recenseur par son ID
   */
  static async findById(id: string): Promise<RecenseurProfile | null> {
    try {
      const data = await prisma.recenseurProfile.findUnique({
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
          admin: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
      });
      return data as unknown as RecenseurProfile | null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération du profil recenseur ${id}`);
    }
  }

  /**
   * Récupérer un profil recenseur par l'ID de l'utilisateur
   */
  static async findByUserId(userId: string): Promise<RecenseurProfile | null> {
    try {
      const data = await prisma.recenseurProfile.findUnique({
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
      return data as unknown as RecenseurProfile | null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération du profil recenseur pour l'utilisateur ${userId}`);
    }
  }

  /**
   * Créer un profil recenseur (réservé aux admins)
   */
  static async create(data: RecenseurProfileInsert): Promise<RecenseurProfile> {
    try {
      // Vérifier que l'utilisateur existe et a le rôle recenseur
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new ValidationError('Utilisateur non trouvé');
      }

      if (user.role !== 'recenseur') {
        throw new ValidationError('L\'utilisateur doit avoir le rôle "recenseur"');
      }

      // Vérifier que le recenseur n'a pas déjà un profil
      const existingProfile = await prisma.recenseurProfile.findUnique({
        where: { userId: data.userId },
      });

      if (existingProfile) {
        throw new ValidationError('Un profil recenseur existe déjà pour cet utilisateur');
      }

      // Vérifier que l'admin qui crée existe
      const admin = await prisma.user.findUnique({
        where: { id: data.creePar },
      });

      if (!admin || admin.role !== 'admin') {
        throw new ValidationError('Seul un administrateur peut créer un profil recenseur');
      }

      const result = await prisma.recenseurProfile.create({
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

      return result as unknown as RecenseurProfile;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Un profil recenseur avec ce numéro de pièce existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la création du profil recenseur');
    }
  }

  /**
   * Mettre à jour un profil recenseur
   */
  static async update(id: string, data: RecenseurProfileUpdate): Promise<RecenseurProfile> {
    try {
      const result = await prisma.recenseurProfile.update({
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
      return result as unknown as RecenseurProfile;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Profil recenseur ${id} non trouvé`);
      }
      if (error.code === 'P2002') {
        throw new ValidationError('Un profil recenseur avec ce numéro de pièce existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour du profil recenseur ${id}`);
    }
  }

  /**
   * Supprimer un profil recenseur
   */
  static async delete(id: string): Promise<void> {
    try {
      await prisma.recenseurProfile.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression du profil recenseur ${id}`);
    }
  }

  /**
   * Récupérer les établissements créés par un recenseur
   */
  static async getEtablissementsCreesParRecenseur(recenseurUserId: string): Promise<any[]> {
    try {
      const etablissements = await prisma.etablissement.findMany({
        where: {
          creePar: recenseurUserId,
          roleCreateur: 'recenseur',
        },
        include: {
          gerant: {
            select: {
              id: true,
              nom: true,
              email: true,
              telephone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return etablissements;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des établissements créés par le recenseur');
    }
  }

  /**
   * Compter le nombre de recenseurs
   */
  static async count(): Promise<number> {
    try {
      const count = await prisma.recenseurProfile.count();
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des recenseurs');
    }
  }
}
