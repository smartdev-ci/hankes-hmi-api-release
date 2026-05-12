/**
 * Service de gestion des OTP
 * Opérations CRUD sur la table otps via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, ValidationError } from '../errors';

interface OTP {
  id: string;
  phone: string;
  code: string;
  purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
}

interface OTPInsert {
  phone: string;
  code: string;
  purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
  expiresAt: Date;
  attempts?: number;
  isUsed?: boolean;
}

interface OTPUpdate {
  phone?: string;
  code?: string;
  purpose?: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
  expiresAt?: Date;
  attempts?: number;
  isUsed?: boolean;
}

export class OTPService {
  static async create(data: OTPInsert): Promise<OTP> {
    try {
      const result = await prisma.oTP.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création du OTP');
    }
  }

  static async findByPhoneAndCode(phone: string, code: string): Promise<OTP | null> {
    try {
      const data = await prisma.oTP.findFirst({
        where: {
          phone,
          code,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la vérification du OTP');
    }
  }

  static async markAsUsed(id: string): Promise<OTP> {
    try {
      const result = await prisma.oTP.update({
        where: { id },
        data: { isUsed: true },
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new ValidationError('OTP non trouvé');
      }
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError('Erreur lors de la validation du OTP');
    }
  }

  static async deleteExpired(): Promise<void> {
    try {
      await prisma.oTP.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la suppression des OTP expirés');
    }
  }
}
