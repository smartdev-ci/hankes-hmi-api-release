/**
 * Service de gestion des reconnaissances musicales
 * Opérations CRUD sur la table music_recognitions via Prisma
 */
interface MusicRecognition {
    id: string;
    captureId: string;
    titre: string;
    artiste: string;
    album: string | null;
    isrc: string | null;
    label: string | null;
    genre: string | null;
    annee: number | null;
    confidence: number;
    source: string;
    metadata: any | null;
    createdAt: Date;
}
interface MusicRecognitionInsert {
    captureId: string;
    titre: string;
    artiste: string;
    album?: string | null;
    isrc?: string | null;
    label?: string | null;
    genre?: string | null;
    annee?: number | null;
    confidence: number;
    source: string;
    metadata?: any | null;
}
interface MusicRecognitionUpdate {
    titre?: string;
    artiste?: string;
    album?: string | null;
    isrc?: string | null;
    label?: string | null;
    genre?: string | null;
    annee?: number | null;
    confidence?: number;
    source?: string;
    metadata?: any | null;
}
export declare class MusicRecognitionService {
    static findAll(): Promise<MusicRecognition[]>;
    static findById(id: string): Promise<MusicRecognition | null>;
    static findByCaptureId(captureId: string): Promise<MusicRecognition | null>;
    static create(data: MusicRecognitionInsert): Promise<MusicRecognition>;
    static update(id: string, data: MusicRecognitionUpdate): Promise<MusicRecognition>;
    static delete(id: string): Promise<void>;
    static findByArtiste(artiste: string): Promise<MusicRecognition[]>;
    static findByTitre(titre: string): Promise<MusicRecognition[]>;
    /**
     * Retourne la première reconnaissance correspondant à l'ISRC donné.
     * On utilise findFirst (et non findUnique) car isrc n'est plus une contrainte unique
     * dans le schéma — un même ISRC peut apparaître sur plusieurs captures.
     */
    static findByIsrc(isrc: string): Promise<MusicRecognition | null>;
    /**
     * Retourne toutes les reconnaissances correspondant à l'ISRC donné.
     */
    static findAllByIsrc(isrc: string): Promise<MusicRecognition[]>;
    static count(): Promise<number>;
    static getTopArtistes(limit?: number): Promise<Array<{
        artiste: string;
        count: number;
    }>>;
}
export {};
