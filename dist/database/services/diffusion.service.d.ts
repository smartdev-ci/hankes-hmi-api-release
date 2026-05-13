/**
 * Service de gestion des diffusions
 * Opérations CRUD sur la table diffusions via Prisma
 */
interface Diffusion {
    id: string;
    etablissementId: string;
    musicId: string;
    titre: string;
    artiste: string;
    playedAt: Date;
    duree: number;
    source: 'capture' | 'manual' | 'playlist';
    userId: string | null;
    createdAt: Date;
}
interface DiffusionInsert {
    etablissementId: string;
    musicId: string;
    titre: string;
    artiste: string;
    playedAt: Date;
    duree: number;
    source: 'capture' | 'manual' | 'playlist';
    userId?: string | null;
}
interface DiffusionUpdate {
    etablissementId?: string;
    musicId?: string;
    titre?: string;
    artiste?: string;
    playedAt?: Date;
    duree?: number;
    source?: 'capture' | 'manual' | 'playlist';
    userId?: string | null;
}
export declare class DiffusionService {
    static findAll(): Promise<Diffusion[]>;
    static findById(id: string): Promise<Diffusion | null>;
    static create(data: DiffusionInsert): Promise<Diffusion>;
    static update(id: string, data: DiffusionUpdate): Promise<Diffusion>;
    static delete(id: string): Promise<void>;
    static findByEtablissement(etablissementId: string): Promise<Diffusion[]>;
    static findByDateRange(etablissementId: string, startDate: Date, endDate: Date): Promise<Diffusion[]>;
    static count(): Promise<number>;
}
export {};
