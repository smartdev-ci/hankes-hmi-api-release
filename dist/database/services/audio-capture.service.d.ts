/**
 * Service de gestion des captures audio
 * Opérations CRUD sur la table audio_captures via Prisma
 */
interface AudioCapture {
    id: string;
    etablissementId: string;
    userId: string;
    audioUrl: string;
    duree: number;
    format: string;
    taille: number;
    statut: 'pending' | 'processing' | 'identified' | 'failed';
    deviceId: string;
    capturedAt: Date;
    syncedAt: Date | null;
    processedAt: Date | null;
    createdAt: Date;
}
interface AudioCaptureInsert {
    etablissementId: string;
    userId: string;
    audioUrl: string;
    duree: number;
    format: string;
    taille: number;
    statut?: 'pending' | 'processing' | 'identified' | 'failed';
    deviceId: string;
    capturedAt: Date;
    syncedAt?: Date | null;
    processedAt?: Date | null;
}
interface AudioCaptureUpdate {
    etablissementId?: string;
    userId?: string;
    audioUrl?: string;
    duree?: number;
    format?: string;
    taille?: number;
    statut?: 'pending' | 'processing' | 'identified' | 'failed';
    deviceId?: string;
    capturedAt?: Date;
    syncedAt?: Date | null;
    processedAt?: Date | null;
}
export declare class AudioCaptureService {
    static findAll(): Promise<AudioCapture[]>;
    static findById(id: string): Promise<AudioCapture | null>;
    static create(data: AudioCaptureInsert): Promise<AudioCapture>;
    static update(id: string, data: AudioCaptureUpdate): Promise<AudioCapture>;
    static delete(id: string): Promise<void>;
    static findByEtablissement(etablissementId: string): Promise<AudioCapture[]>;
    static findByUser(userId: string): Promise<AudioCapture[]>;
    static findByStatut(statut: AudioCapture['statut']): Promise<AudioCapture[]>;
    static markAsProcessed(id: string): Promise<AudioCapture>;
    static markAsFailed(id: string): Promise<AudioCapture>;
    static countPending(): Promise<number>;
    static getRecentForProcessing(limit?: number): Promise<AudioCapture[]>;
}
export {};
