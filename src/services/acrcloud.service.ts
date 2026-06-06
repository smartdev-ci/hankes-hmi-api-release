import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import { config } from "../config";

export interface ACRCloudMetadata {
  title: string;
  artist: string;
  isrc: string;
  confidence: number;
  label?: string;
  releaseDate?: string;
  genres?: string[];
}

interface ACRCloudResponse {
  status: {
    code: number;
    msg: string;
  };
  metadata?: {
    music?: Array<{
      title: string;
      artists: Array<{ name: string }>;
      external_metadata?: {
        isrc?: string;
        label?: string;
        release_date?: string;
        genre_list?: Array<{ name: string }>;
      };
      score: number;
    }>;
  };
}

export class ACRCloudService {
  private apiKey: string;
  private apiSecret: string;
  private host: string;
  private endpoint: string;

  constructor() {
    this.apiKey = config.acrcloud.apiKey;
    this.apiSecret = config.acrcloud.apiSecret;
    this.host = config.acrcloud.host;
    this.endpoint = `https://${this.host}/v1/identify`;
  }

  /**
   * Génère la signature pour l'authentification ACRCloud
   */
  private generateSignature(timestamp: number): string {
    const stringToSign = `POST\n/v1/identify\n${this.apiKey}\naudio\n1\n${timestamp}`;
    return crypto
      .createHmac("sha1", this.apiSecret)
      .update(stringToSign)
      .digest("base64");
  }

  /**
   * Identifie un fichier audio via ACRCloud
   * @param audioBuffer - Le buffer du fichier audio
   * @param filename - Nom du fichier (optionnel)
   */
  async identify(
    audioBuffer: Buffer,
    filename: string = "audio.wav",
  ): Promise<ACRCloudMetadata | null> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error("ACRCloud credentials not configured");
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(timestamp);

      // Créer le formulaire multipart
      const formData = new FormData();
      formData.append("sample", audioBuffer, {
        filename,
        contentType: "audio/mpeg",
      } as any);
      formData.append("data_type", "audio");
      formData.append("signature_version", "1");
      formData.append("timestamp", timestamp.toString());
      formData.append("access_key", this.apiKey);
      formData.append("signature", signature);

      // Appel API avec axios
      const response = await axios.post<ACRCloudResponse>(
        this.endpoint,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 secondes
        },
      );

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

      const metadata: ACRCloudMetadata = {
        title: music.title,
        artist: music.artists?.map((a) => a.name).join(", ") || "Unknown",
        isrc: music.external_metadata?.isrc || "",
        confidence: music.score / 100,
        label: music.external_metadata?.label,
        releaseDate: music.external_metadata?.release_date,
        genres: music.external_metadata?.genre_list?.map((g) => g.name),
      };

      return metadata;
    } catch (error: any) {
      console.error("ACRCloud identification error:", error?.message || error);
      throw new Error(`Failed to identify audio: ${error?.message || error}`);
    }
  }

  /**
   * Vérifie si le service est configuré correctement
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }
}

// Export singleton
export const acrcloudService = new ACRCloudService();
export default acrcloudService;
