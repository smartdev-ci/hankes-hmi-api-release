import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { audioCaptureSchema } from '../utils/validators';
import acrcloudService from '../services/acrcloud.service';
import multer from 'multer';

const router = Router();

// Configuration multer pour l'upload de fichiers audio
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers audio sont autorisés'));
    }
  },
});

// Mock database
const captures: any[] = [];

/**
 * GET /audio/config
 * Configuration de capture audio
 */
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = {
      dureeExtraitSecondes: 15,
      formatAudio: 'wav',
      frequenceEchantillonnage: 44100,
      canaux: 1,
      bitrate: 128,
      tailleMaxMo: 10,
      providers: ['acrcloud', 'audd'],
      providerDefaut: 'acrcloud',
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /audio/capturer
 * Upload d'un extrait audio pour identification via ACRCloud
 */
router.post('/capturer', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const { etablissementId, deviceId } = req.body;
    const audioFile = req.file;

    if (!audioFile || !audioFile.buffer) {
      res.status(400).json({
        success: false,
        error: 'Fichier audio requis',
      });
      return;
    }

    // Créer la capture
    const capture: any = {
      id: require('uuid').v4(),
      etablissementId,
      deviceId,
      statut: 'en_cours',
      dateCapture: new Date(),
      dateTraitement: null as Date | null,
      resultat: null as any,
      provider: 'acrcloud',
    };

    captures.push(capture);

    // Appel à ACRCloud pour identification
    try {
      const metadata = await acrcloudService.identify(audioFile.buffer, audioFile.originalname);

      capture.statut = 'termine';
      capture.dateTraitement = new Date();

      if (metadata) {
        capture.resultat = {
          titre: metadata.title,
          artiste: metadata.artist,
          isrc: metadata.isrc,
          confidence: metadata.confidence,
          label: metadata.label,
          annee: metadata.releaseDate ? new Date(metadata.releaseDate).getFullYear() : undefined,
          genres: metadata.genres,
        };
      } else {
        capture.resultat = {
          erreur: 'Aucune correspondance trouvée',
          confidence: 0,
        };
      }
    } catch (acrError: any) {
      capture.statut = 'echec';
      capture.dateTraitement = new Date();
      capture.resultat = {
        erreur: acrError.message,
      };
    }

    res.status(200).json({
      success: true,
      message: capture.resultat?.titre ? 'Musique identifiée avec succès' : 'Traitement terminé',
      captureId: capture.id,
      statut: capture.statut,
      resultat: capture.resultat,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /audio/sync
 * Synchronisation batch offline
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { captures: capturesBatch } = req.body;

    if (!Array.isArray(capturesBatch) || capturesBatch.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Le batch de captures ne peut pas être vide',
      });
      return;
    }

    // Traiter chaque capture du batch
    const resultats = capturesBatch.map((batch: any) => ({
      localId: batch.localId,
      captureId: require('uuid').v4(),
      statut: 'en_cours',
    }));

    res.status(202).json({
      success: true,
      message: `${resultats.length} captures en cours de synchronisation`,
      resultats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /audio/statut/:captureId
 * Statut du traitement d'une capture
 */
router.get('/statut/:captureId', authenticate, async (req, res) => {
  try {
    const { captureId } = req.params;
    
    const capture = captures.find(c => c.id === captureId);
    
    if (!capture) {
      res.status(404).json({
        success: false,
        error: 'Capture non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      capture: {
        id: capture.id,
        statut: capture.statut,
        dateCapture: capture.dateCapture,
        dateTraitement: capture.dateTraitement,
        resultat: capture.resultat,
        provider: capture.provider,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
