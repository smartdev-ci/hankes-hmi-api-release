/**
 * Service de gestion des utilisateurs
 * Opérations CRUD sur la table users via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';
import { UserRole } from '@prisma/client';

interface User {
  id: string;
  email: string;
  password: string;
  nom: string;
  telephone: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  etablissementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserInsert {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  etablissementId?: string | null;
}

interface UserUpdate {
  email?: string;
  password?: string;
  nom?: string;
  telephone?: string;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  etablissementId?: string | null;
}

export class UserService {
  static async findAll(): Promise<User[]> {
    try {
      const data = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des utilisateurs');
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const data = await prisma.user.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de l'utilisateur ${id}`);
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const data = await prisma.user.findUnique({
        where: { email },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de l'utilisateur avec email ${email}`);
    }
  }

  static async create(userData: UserInsert): Promise<User> {
    try {
      const data = await prisma.user.create({
        data: userData,
      });
      return data;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ValidationError('Un utilisateur avec cet email existe déjà');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la création de l\'utilisateur');
    }
  }

  static async update(id: string, userData: UserUpdate): Promise<User> {
    try {
      const data = await prisma.user.update({
        where: { id },
        data: userData,
      });
      return data;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Utilisateur ${id} non trouvé`);
      }
      if (error.code === 'P2002') {
        throw new ValidationError('Un utilisateur avec cet email existe déjà');
      }
      if (
        error instanceof DatabaseError ||
        error instanceof NotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new DatabaseError(`Erreur lors de la mise à jour de l'utilisateur ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de l'utilisateur ${id}`);
    }
  }

  static async verifyUser(id: string): Promise<User> {
    return this.update(id, { isVerified: true });
  }

  static async toggleActiveStatus(id: string, isActive: boolean): Promise<User> {
    return this.update(id, { isActive });
  }

  static async findByRole(role: UserRole): Promise<User[]> {
    try {
      const data = await prisma.user.findMany({
        where: { role },
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recherche des utilisateurs avec le rôle ${role}`);
    }
  }

  static async count(): Promise<number> {
    try {
      const count = await prisma.user.count();
      return count;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors du comptage des utilisateurs');
    }
  }

  static async findByTelephone(telephone: string): Promise<User | null> {
    try {
      const data = await prisma.user.findFirst({
        where: { telephone },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(
        `Erreur lors de la récupération de l'utilisateur avec le téléphone ${telephone}`
      );
    }
  }
}
