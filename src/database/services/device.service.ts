/**
 * Service de gestion des appareils
 * Opérations CRUD sur la table devices via Prisma
 */

import { prisma } from '../index';
import { DatabaseError, NotFoundError } from '../errors';

interface Device {
  id: string;
  userId: string;
  etablissementId: string | null;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  osVersion: string;
  pushToken: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DeviceInsert {
  userId: string;
  etablissementId?: string | null;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  osVersion: string;
  pushToken?: string | null;
  lastActiveAt?: Date;
}

interface DeviceUpdate {
  userId?: string;
  etablissementId?: string | null;
  deviceId?: string;
  platform?: 'ios' | 'android';
  appVersion?: string;
  osVersion?: string;
  pushToken?: string | null;
  lastActiveAt?: Date;
}

export class DeviceService {
  static async findAll(): Promise<Device[]> {
    try {
      const data = await prisma.device.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la récupération des appareils');
    }
  }

  static async findById(id: string): Promise<Device | null> {
    try {
      const data = await prisma.device.findUnique({
        where: { id },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de l'appareil ${id}`);
    }
  }

  static async findByDeviceId(deviceId: string): Promise<Device | null> {
    try {
      const data = await prisma.device.findUnique({
        where: { deviceId },
      });
      return data || null;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la récupération de l'appareil ${deviceId}`);
    }
  }

  static async create(data: DeviceInsert): Promise<Device> {
    try {
      const result = await prisma.device.create({
        data,
      });
      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la création de l\'appareil');
    }
  }

  static async update(id: string, data: DeviceUpdate): Promise<Device> {
    try {
      const result = await prisma.device.update({
        where: { id },
        data,
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Appareil ${id} non trouvé`);
      }
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Erreur lors de la mise à jour de l'appareil ${id}`);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.device.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la suppression de l'appareil ${id}`);
    }
  }

  static async updateLastActive(id: string): Promise<Device> {
    return this.update(id, { lastActiveAt: new Date() });
  }
}
