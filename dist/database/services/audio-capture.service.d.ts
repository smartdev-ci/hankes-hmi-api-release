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
    deviceId: string | null;
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
    deviceId?: string | null;
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
    deviceId?: string | null;
    capturedAt?: Date;
    syncedAt?: Date | null;
    processedAt?: Date | null;
}
export interface AudioCaptureWithRecognition extends AudioCapture {
    recognition: {
        id: string;
        captureId: string;
        trackId: string | null;
        titre: string;
        artiste: string;
        album: string | null;
        isrc: string | null;
        label: string | null;
        annee: number | null;
        genre: string | null;
        confidence: number;
        source: string;
        metadata: any;
        createdAt: Date;
    } | null;
}
export declare class AudioCaptureService {
    static findAll(): Promise<AudioCapture[]>;
    static findById(id: string): Promise<AudioCapture | null>;
    /**
     * Récupère une capture avec sa reconnaissance associée
     */
    static findByIdWithRecognition(id: string): Promise<AudioCaptureWithRecognition | null>;
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
    /**
     * Récupère les captures récentes d'un établissement avec leur reconnaissance
     * Utilisé pour le dédoublonnage : vérifier si une musique a déjà été identifiée
     * dans une fenêtre temporelle donnée.
     *
     * @param etablissementId - ID de l'établissement
     * @param since - Date de début de la fenêtre temporelle
     * @param limit - Nombre maximum de captures à récupérer (défaut: 50)
     * @returns Liste des captures avec reconnaissance, triées par date décroissante
     */
    static findRecentWithRecognition(etablissementId: string, since: Date, limit?: number): Promise<AudioCaptureWithRecognition[]>;
    /**
     * Récupère toutes les captures d'un établissement sur une plage horaire
     * avec leur reconnaissance associée. Utilisé pour les statistiques de soirée.
     *
     * @param etablissementId - ID de l'établissement
     * @param start - Date de début de la plage
     * @param end - Date de fin de la plage
     * @returns Liste des captures avec reconnaissance, triées par date croissante
     */
    static findWithRecognition(etablissementId: string, start: Date, end: Date): Promise<AudioCaptureWithRecognition[]>;
    /**
     * Vérifie si une musique a déjà été capturée récemment pour un établissement.
     * C'est la méthode principale pour le dédoublonnage.
     *
     * Logique de match (par ordre de priorité) :
     * 1. Match par ISRC (le plus fiable, code unique international)
     * 2. Match par titre + artiste normalisés (fallback)
     *
     * @param etablissementId - ID de l'établissement
     * @param titre - Titre de la musique à vérifier
     * @param artiste - Artiste de la musique
     * @param isrc - Code ISRC (optionnel mais prioritaire)
     * @param windowMinutes - Fenêtre temporelle en minutes (défaut: 10)
     * @returns Objet indiquant si c'est un doublon et l'ID de la capture existante
     */
    static checkDuplicate(etablissementId: string, titre: string, artiste: string, isrc?: string | null, windowMinutes?: number): Promise<{
        isDuplicate: boolean;
        existingCaptureId?: string;
    }>;
    /**
     * Récupère les statistiques d'une soirée pour un établissement
     * Retourne la liste des musiques uniques avec leur première heure de passage
     *
     * @param etablissementId - ID de l'établissement
     * @param date - Date de la soirée (par défaut : aujourd'hui)
     * @returns Statistiques de la soirée
     */
    static getSoireeStats(etablissementId: string, date?: Date): Promise<{
        date: string;
        etablissementId: string;
        periode: {
            start: string;
            end: string;
        };
        stats: {
            totalCaptures: number;
            identifiedCaptures: number;
            uniqueTracks: number;
            totalPlayTime: any;
        };
        tracks: any[];
    }>;
    /**
     * Normalise une chaîne pour comparaison fiable
     * - Minuscules
     * - Suppression de la ponctuation (sauf accents)
     * - Normalisation des espaces
     */
    private static normalizeString;
}
export {};
