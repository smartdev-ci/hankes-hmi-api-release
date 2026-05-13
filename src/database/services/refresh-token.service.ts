/**
 * Service de gestion des refresh tokens
 */
import { prisma } from '../index';
import { DatabaseError } from '../errors';

interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceId: string | null;
  expiresAt: Date;
  createdAt: Date;
}

interface RefreshTokenInsert {
  userId: string;
  tokenHash: string;
  deviceId?: string | null;
  expiresAt: Date;
}

export class RefreshTokenService {
  static async create(data: RefreshTokenInsert): Promise<RefreshToken> {
    try {
      const result = await prisma.refreshToken.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création du refresh token');
    }
  }

  static async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    try {
      const result = await prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          expiresAt: {
            gt: new Date(),
          },
        },
      });
      return result || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération du refresh token');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.refreshToken.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la suppression du refresh token');
    }
  }

  static async deleteExpired(): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la suppression des refresh tokens expirés');
    }
  }

  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    try {
      const result = await prisma.refreshToken.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des refresh tokens');
    }
  }

  static async revokeUserTokens(userId: string): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la révocation des refresh tokens');
    }
  }
}
