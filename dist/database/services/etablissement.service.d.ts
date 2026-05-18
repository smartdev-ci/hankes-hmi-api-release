/**
 * Service de gestion des établissements
 * Opérations CRUD sur la table etablissements via Prisma
 */
import { CreatorRole } from '@prisma/client';
interface Etablissement {
    id: string;
    nom: string;
    type: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
    adresse: string;
    ville: string;
    region: string;
    latitude: number | null;
    longitude: number | null;
    telephone: string;
    email: string | null;
    gerantId: string;
    isActive: boolean;
    isVerified: boolean;
    capacite: number | null;
    licence: string | null;
    creePar: string | null;
    roleCreateur: CreatorRole | null;
    createdAt: Date;
    updatedAt: Date;
}
interface EtablissementInsert {
    nom: string;
    type: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
    adresse: string;
    ville: string;
    region: string;
    latitude?: number | null;
    longitude?: number | null;
    telephone: string;
    email?: string | null;
    gerantId: string;
    isActive?: boolean;
    isVerified?: boolean;
    capacite?: number | null;
    licence?: string | null;
    creePar?: string | null;
    roleCreateur?: CreatorRole | null;
}
interface EtablissementUpdate {
    nom?: string;
    type?: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
    adresse?: string;
    ville?: string;
    region?: string;
    latitude?: number | null;
    longitude?: number | null;
    telephone?: string;
    email?: string | null;
    isActive?: boolean;
    isVerified?: boolean;
    capacite?: number | null;
    licence?: string | null;
}
export declare class EtablissementService {
    static findAll(): Promise<Etablissement[]>;
    static findById(id: string): Promise<Etablissement | null>;
    static create(data: EtablissementInsert): Promise<Etablissement>;
    static update(id: string, data: EtablissementUpdate): Promise<Etablissement>;
    static delete(id: string): Promise<void>;
    static findByVille(ville: string): Promise<Etablissement[]>;
    static findByRegion(region: string): Promise<Etablissement[]>;
    static findByType(type: Etablissement['type']): Promise<Etablissement[]>;
    static verifyEtablissement(id: string): Promise<Etablissement>;
    static toggleActiveStatus(id: string, isActive: boolean): Promise<Etablissement>;
    static countActive(): Promise<number>;
    /**
     * Récupérer les établissements créés par un utilisateur (admin ou recenseur)
     */
    static findByCreateur(createurId: string): Promise<Etablissement[]>;
    static getStatsByVille(): Promise<Array<{
        ville: string;
        count: number;
    }>>;
}
export {};
