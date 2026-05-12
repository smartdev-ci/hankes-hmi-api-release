/**
 * Service de gestion des notifications
 */
import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface Notification {
  id: string;
  userId: string;
  titre: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  estLue: boolean;
  dateLecture: Date | null;
  metadata: any | null;
  createdAt: Date;
}

interface NotificationInsert {
  userId: string;
  titre: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  estLue?: boolean;
  dateLecture?: Date | null;
  metadata?: any | null;
}

interface NotificationUpdate {
  titre?: string;
  message?: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  estLue?: boolean;
  dateLecture?: Date | null;
  metadata?: any | null;
}

export class NotificationService {
  static async findAll(): Promise<Notification[]> {
    try {
      const data = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des notifications');
    }
  }

  static async findById(id: string): Promise<Notification | null> {
    try {
      const data = await prisma.notification.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de la notification ${id}`);
    }
  }

  static async create(data: NotificationInsert): Promise<Notification> {
    try {
      const result = await prisma.notification.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création de la notification');
    }
  }

  static async markAsRead(id: string): Promise<Notification> {
    try {
      const result = await prisma.notification.update({
        where: { id },
        data: {
          estLue: true,
          dateLecture: new Date(),
        },
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Notification ${id} non trouvée`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erreur lors de la marque comme lue');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.notification.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de la notification ${id}`);
    }
  }
}
