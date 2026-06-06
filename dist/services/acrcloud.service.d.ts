export interface ACRCloudMetadata {
    title: string;
    artist: string;
    isrc: string;
    confidence: number;
    label?: string;
    releaseDate?: string;
    genres?: string[];
}
export declare class ACRCloudService {
    private apiKey;
    private apiSecret;
    private host;
    private endpoint;
    constructor();
    /**
     * Génère la signature pour l'authentification ACRCloud
     */
    private generateSignature;
    /**
     * Identifie un fichier audio via ACRCloud
     * @param audioBuffer - Le buffer du fichier audio
     * @param filename - Nom du fichier (optionnel)
     */
    identify(audioBuffer: Buffer, filename?: string): Promise<ACRCloudMetadata | null>;
    /**
     * Vérifie si le service est configuré correctement
     */
    isConfigured(): boolean;
}
export declare const acrcloudService: ACRCloudService;
export default acrcloudService;
