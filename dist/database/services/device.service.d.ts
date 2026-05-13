/**
 * Service de gestion des appareils
 * Opérations CRUD sur la table devices via Prisma
 */
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
export declare class DeviceService {
    static findAll(): Promise<Device[]>;
    static findById(id: string): Promise<Device | null>;
    static findByDeviceId(deviceId: string): Promise<Device | null>;
    static create(data: DeviceInsert): Promise<Device>;
    static update(id: string, data: DeviceUpdate): Promise<Device>;
    static delete(id: string): Promise<void>;
    static updateLastActive(id: string): Promise<Device>;
}
export {};
