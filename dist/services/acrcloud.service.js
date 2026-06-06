"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acrcloudService = exports.ACRCloudService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const form_data_1 = __importDefault(require("form-data"));
const config_1 = require("../config");
class ACRCloudService {
    constructor() {
        this.apiKey = config_1.config.acrcloud.apiKey;
        this.apiSecret = config_1.config.acrcloud.apiSecret;
        this.host = config_1.config.acrcloud.host;
        this.endpoint = `https://${this.host}/v1/identify`;
    }
    /**
     * Génère la signature pour l'authentification ACRCloud
     */
    generateSignature(timestamp) {
        const stringToSign = `POST\n/v1/identify\n${this.apiKey}\naudio\n1\n${timestamp}`;
        return crypto_1.default
            .createHmac("sha1", this.apiSecret)
            .update(stringToSign)
            .digest("base64");
    }
    /**
     * Identifie un fichier audio via ACRCloud
     * @param audioBuffer - Le buffer du fichier audio
     * @param filename - Nom du fichier (optionnel)
     */
    async identify(audioBuffer, filename = "audio.wav") {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error("ACRCloud credentials not configured");
            }
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = this.generateSignature(timestamp);
            // Créer le formulaire multipart
            const formData = new form_data_1.default();
            formData.append("sample", audioBuffer, {
                filename,
                contentType: "audio/mpeg",
            });
            formData.append("data_type", "audio");
            formData.append("signature_version", "1");
            formData.append("timestamp", timestamp.toString());
            formData.append("access_key", this.apiKey);
            formData.append("signature", signature);
            // Appel API avec axios
            const response = await axios_1.default.post(this.endpoint, formData, {
                headers: formData.getHeaders(),
                timeout: 30000, // 30 secondes
            });
            const result = response.data;
            // Vérifier le statut de la réponse
            if (result.status.code !== 0) {
                console.warn(`ACRCloud error: ${result.status.msg}`);
                return null;
            }
            // Extraire les métadonnées
            const music = result.metadata?.music?.[0];
            if (!music) {
                return null;
            }
            const metadata = {
                title: music.title,
                artist: music.artists?.map((a) => a.name).join(", ") || "Unknown",
                isrc: music.external_metadata?.isrc || "",
                confidence: music.score / 100,
                label: music.external_metadata?.label,
                releaseDate: music.external_metadata?.release_date,
                genres: music.external_metadata?.genre_list?.map((g) => g.name),
            };
            return metadata;
        }
        catch (error) {
            console.error("ACRCloud identification error:", error?.message || error);
            throw new Error(`Failed to identify audio: ${error?.message || error}`);
        }
    }
    /**
     * Vérifie si le service est configuré correctement
     */
    isConfigured() {
        return !!(this.apiKey && this.apiSecret);
    }
}
exports.ACRCloudService = ACRCloudService;
// Export singleton
exports.acrcloudService = new ACRCloudService();
exports.default = exports.acrcloudService;
//# sourceMappingURL=acrcloud.service.js.map