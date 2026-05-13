interface Rapport {
    id: string;
    type: 'etablissement' | 'periode' | 'artiste' | 'global';
    dateDebut: Date;
    dateFin: Date;
    format: 'pdf' | 'excel' | 'csv';
    statut: 'en_cours' | 'termine' | 'failed';
    fichierUrl: string | null;
    dateGeneration: Date;
    generePar: string;
    etablissementId: string | null;
    metadata: any | null;
    createdAt: Date;
}
interface RapportInsert {
    type: 'etablissement' | 'periode' | 'artiste' | 'global';
    dateDebut: Date;
    dateFin: Date;
    format?: 'pdf' | 'excel' | 'csv';
    statut?: 'en_cours' | 'termine' | 'failed';
    fichierUrl?: string | null;
    generePar: string;
    etablissementId?: string | null;
    metadata?: any | null;
}
interface RapportUpdate {
    type?: 'etablissement' | 'periode' | 'artiste' | 'global';
    dateDebut?: Date;
    dateFin?: Date;
    format?: 'pdf' | 'excel' | 'csv';
    statut?: 'en_cours' | 'termine' | 'failed';
    fichierUrl?: string | null;
    generePar?: string;
    etablissementId?: string | null;
    metadata?: any | null;
}
export declare class RapportService {
    static findAll(): Promise<Rapport[]>;
    static findById(id: string): Promise<Rapport | null>;
    static create(data: RapportInsert): Promise<Rapport>;
    static update(id: string, data: RapportUpdate): Promise<Rapport>;
    static delete(id: string): Promise<void>;
}
export {};
