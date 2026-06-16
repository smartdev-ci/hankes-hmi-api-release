import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  AudioCaptureService,
  FingerprintRepository,
  MusicRecognitionService,
  TrackService,
} from '../database/services';
import { DiffusionService } from '../database/services/diffusion.service';
import hybridRecognitionService from '../services/hybrid-recognition.service';
import fingerprintService from '../services/fingerprint.service';
import { config } from '../config';
import multer from 'multer';


const router = Router();
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;


// ===== CONFIGURATION GLOBALE =====
const MIN_CONFIDENCE_THRESHOLD = config.audio.minConfidence;
const DUPLICATE_WINDOW_MINUTES = config.audio.duplicateWindowMinutes;
const MAX_FILE_SIZE = config.audio.maxFileSizeBytes;


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers audio sont autorises'));
    }
  },
});


// ===== LOGGER UTILITY =====
/**
 * Log explicite pour les erreurs 400 (validation) avec contexte complet
 */
const logValidationError = (
  endpoint: string,
  userId: string,
  fieldName: string,
  reason: string,
  receivedValue?: any
) => {
  const timestamp = new Date().toISOString();
  const receivedDisplay = receivedValue !== undefined ? ` (reçu: ${JSON.stringify(receivedValue)})` : '';
  console.error(
    `[VALIDATION_ERROR] [${timestamp}] [${endpoint}] User: ${userId} | ` +
    `Missing/Invalid: ${fieldName} | Reason: ${reason}${receivedDisplay}`
  );
};


// ===== HELPERS =====


/**
 * Normalise une chaîne pour comparaison (minuscule, sans ponctuation)
 */
const normalizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u00C0-\u024F]/g, '') // Garde les accents
    .replace(/\s+/g, ' ');
};


/**
 * Vérifie si une musique a déjà été capturée récemment pour cet établissement
 */
const isRecentDuplicate = async (
  etablissementId: string,
  titre: string,
  artiste: string,
  isrc: string | null
): Promise<{ isDuplicate: boolean; existingId?: string }> => {
  try {
    const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);

    // Récupérer les captures récentes avec reconnaissance
    const recentCaptures = await AudioCaptureService.findRecentWithRecognition(
      etablissementId,
      windowStart
    );

    if (!recentCaptures || recentCaptures.length === 0) {
      return { isDuplicate: false };
    }

    const normalizedTitle = normalizeString(titre);
    const normalizedArtist = normalizeString(artiste);

    for (const capture of recentCaptures) {
      const recognition = (capture as any).recognition;
      if (!recognition) continue;

      // 1. Match par ISRC (le plus fiable)
      if (isrc && recognition.isrc && normalizeString(isrc) === normalizeString(recognition.isrc)) {
        return { isDuplicate: true, existingId: capture.id };
      }

      // 2. Match par titre + artiste normalisés
      const existingTitle = normalizeString(recognition.titre);
      const existingArtist = normalizeString(recognition.artiste);

      if (
        normalizedTitle &&
        normalizedArtist &&
        existingTitle === normalizedTitle &&
        existingArtist === normalizedArtist
      ) {
        return { isDuplicate: true, existingId: capture.id };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Erreur lors de la vérification de doublon:', error);
    return { isDuplicate: false }; // Fail open : on traite quand même
  }
};


// ===== ROUTES =====


router.get('/config', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        dureeExtraitSecondes: 15,
        formatAudio: 'wav',
        frequenceEchantillonnage: 44100,
        canaux: 1,
        bitrate: 128,
        tailleMaxMo: 10,
        providers: ['local-cache', 'local-fingerprint', 'acrcloud'],
        providerDefaut: 'local-fingerprint',
        minConfidence: MIN_CONFIDENCE_THRESHOLD,
        duplicateWindowMinutes: DUPLICATE_WINDOW_MINUTES,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/capturer', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const { etablissementId, deviceId } = req.body;
    const audioFile = req.file;
    const userId = req.user!.id;

    // ===== VALIDATION 1: Fichier audio =====
    if (!audioFile?.buffer) {
      logValidationError(
        '/capturer',
        userId,
        'audioFile',
        'Fichier audio manquant ou vide',
        {
          filePresent: !!audioFile,
          bufferPresent: !!audioFile?.buffer,
          receivedFileName: audioFile?.originalname
        }
      );
      return res.status(400).json({ 
        success: false, 
        error: 'Fichier audio requis',
        details: 'Aucun fichier audio fourni dans la requête'
      });
    }

    // ===== VALIDATION 2: etablissementId =====
    if (!etablissementId) {
      logValidationError(
        '/capturer',
        userId,
        'etablissementId',
        'Identifiant établissement manquant',
        {
          bodyKeys: Object.keys(req.body),
          receivedValue: etablissementId
        }
      );
      return res.status(400).json({ 
        success: false, 
        error: 'etablissementId requis',
        details: 'L\'identifiant de l\'établissement doit être fourni dans le body'
      });
    }

    // Mémoriser capturedAt pour l'utiliser aussi dans la diffusion
    const capturedAt = req.body.capturedAt ? new Date(req.body.capturedAt) : new Date();

    // 1. Créer la capture initiale
    let capture = await AudioCaptureService.create({
      etablissementId,
      userId,
      audioUrl: `memory://${audioFile.originalname}`,
      duree: Number(req.body.duree || 0),
      format: audioFile.mimetype,
      taille: audioFile.size,
      statut: 'processing',
      deviceId: deviceId || null,
      capturedAt,
      syncedAt: new Date(),
    });

    try {
      const recognitionResult = await hybridRecognitionService.processCapture({
        captureId: capture.id,
        etablissementId,
        userId,
        audioBuffer: audioFile.buffer,
        filename: audioFile.originalname,
        capturedAt,
        duree: Number(req.body.duree || 0),
      });

      return res.status(200).json({
        success: true,
        message: recognitionResult.message,
        captureId: recognitionResult.capture.id,
        statut: recognitionResult.capture.statut,
        resultat: recognitionResult.recognition || null,
        diffusion: recognitionResult.diffusion,
        provider: recognitionResult.provider,
        fingerprint: recognitionResult.fingerprint,
        duplicate: recognitionResult.duplicate,
        existingCaptureId: recognitionResult.existingCaptureId,
        rejected: recognitionResult.rejected,
        reason: recognitionResult.reason,
      });
    } catch (recognitionError: any) {
      capture = await AudioCaptureService.markAsFailed(capture.id);
      return res.status(502).json({
        success: false,
        error: recognitionError.message,
        captureId: capture.id,
        statut: capture.statut,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/sync', authenticate, async (req, res) => {
  try {
    const { captures } = req.body;
    const userId = req.user!.id;

    // ===== VALIDATION 1: Array de captures =====
    if (!Array.isArray(captures)) {
      logValidationError(
        '/sync',
        userId,
        'captures',
        'Format invalide: doit être un array',
        {
          receivedType: typeof captures,
          receivedValue: captures
        }
      );
      return res.status(400).json({ 
        success: false, 
        error: 'Le paramètre captures doit être un array',
        details: 'Envoyez { "captures": [...] }'
      });
    }

    // ===== VALIDATION 2: Array non vide =====
    if (captures.length === 0) {
      logValidationError(
        '/sync',
        userId,
        'captures',
        'Array vide rejeté',
        {
          arrayLength: 0,
          reason: 'Aucune capture à synchroniser'
        }
      );
      return res.status(400).json({ 
        success: false, 
        error: 'Le batch de captures ne peut pas etre vide',
        details: 'Fournissez au moins une capture à synchroniser'
      });
    }

    const resultats: any[] = [];
    let createdCount = 0;
    let ignoredLowConfidence = 0;
    let ignoredDuplicate = 0;

    console.log(
      `[SYNC] Début de synchronisation pour l'utilisateur ${userId} | ` +
      `${captures.length} capture(s) à traiter`
    );

    // Traiter séquentiellement pour bien gérer les doublons en cascade
    for (const batch of captures) {
      try {
        const etablissementId = batch.etablissementId;
        if (!etablissementId) {
          console.warn(
            `[SYNC] [SKIP] User: ${userId} | ` +
            `Missing etablissementId | trackId: ${batch.localId || batch.trackId}`
          );
          resultats.push({
            localId: batch.localId || batch.trackId,
            status: 'error',
            reason: 'missing_etablissementId'
          });
          continue;
        }

        // 1. Filtrer par confiance
        if (!batch.confidence || batch.confidence < MIN_CONFIDENCE_THRESHOLD) {
          console.log(
            `[SYNC] [LOW_CONFIDENCE] User: ${userId} | ` +
            `Confidence: ${batch.confidence} (seuil: ${MIN_CONFIDENCE_THRESHOLD}) | ` +
            `Track: "${batch.titre}" - "${batch.artiste}"`
          );
          ignoredLowConfidence++;
          resultats.push({
            localId: batch.localId || batch.trackId,
            status: 'ignored',
            reason: 'low_confidence',
            confidence: batch.confidence
          });
          continue;
        }

        // 2. Vérifier si doublon
        const duplicateCheck = await isRecentDuplicate(
          etablissementId,
          batch.titre,
          batch.artiste,
          batch.isrc || null
        );

        if (duplicateCheck.isDuplicate) {
          console.log(
            `[SYNC] [DUPLICATE] User: ${userId} | ` +
            `Track: "${batch.titre}" - "${batch.artiste}" | ` +
            `Window: ${DUPLICATE_WINDOW_MINUTES}min | ` +
            `Existing captureId: ${duplicateCheck.existingId}`
          );
          ignoredDuplicate++;
          resultats.push({
            localId: batch.localId || batch.trackId,
            status: 'ignored',
            reason: 'duplicate',
            existingCaptureId: duplicateCheck.existingId
          });
          continue;
        }

        // 3. Créer la capture
        const capturedAt = batch.capturedAt ? new Date(batch.capturedAt) : new Date();

        const capture = await AudioCaptureService.create({
          etablissementId,
          userId,
          audioUrl: batch.audioUrl || `offline://${batch.localId || Date.now()}`,
          duree: Number(batch.duree || 0),
          format: batch.format || 'unknown',
          taille: Number(batch.taille || 0),
          statut: 'pending',
          deviceId: batch.deviceId || null,
          capturedAt,
          syncedAt: new Date(),
        });

        // 4. Créer la reconnaissance associée si les données sont présentes
        let recognition = null;
        if (batch.titre && batch.artiste) {
          const track = await TrackService.upsertFromRecognition({
            titre: batch.titre,
            artiste: batch.artiste,
            album: batch.album || null,
            isrc: batch.isrc || null,
            genre: batch.genre || null,
            annee: batch.annee || null,
          });

          recognition = await MusicRecognitionService.create({
            captureId: capture.id,
            trackId: track.id,
            titre: batch.titre,
            artiste: batch.artiste,
            album: batch.album || null,
            isrc: batch.isrc || null,
            label: batch.label || null,
            annee: batch.annee || null,
            genre: batch.genre || null,
            confidence: batch.confidence,
            source: 'acrcloud',
            metadata: {
              title: batch.titre,
              artist: batch.artiste,
              confidence: batch.confidence,
              detectionMethod: batch.detectionMethod || 'unknown',
              syncedFromOffline: true,
            } as any,
          });

          if (batch.fingerprint) {
            await FingerprintRepository.create({
              fingerprint: batch.fingerprint,
              fingerprintHash: batch.fingerprintHash || fingerprintService.hashFingerprint(batch.fingerprint),
              algorithm: batch.fingerprintAlgorithm || 'mobile',
              recognitionId: recognition.id,
              trackId: track.id,
            });
          }

          // 5. Enregistrer la diffusion associée à la capture synchronisée
          await DiffusionService.create({
            etablissementId,
            musicId:  recognition.id,
            titre:    recognition.titre,
            artiste:  recognition.artiste,
            playedAt: capturedAt,
            duree:    Number(batch.duree || 0),
            source:   'capture',
            userId,
            captureId: capture.id,
          });
        }

        createdCount++;
        resultats.push({
          localId: batch.localId || batch.trackId,
          captureId: capture.id,
          status: 'created'
        });

      } catch (itemError: any) {
        console.error(
          `[SYNC] [ERROR] User: ${userId} | ` +
          `localId: ${batch.localId || batch.trackId} | ` +
          `Error: ${itemError.message}`
        );
        resultats.push({
          localId: batch.localId || batch.trackId,
          status: 'error',
          reason: itemError.message
        });
      }
    }

    console.log(
      `[SYNC] ✅ Terminé pour user ${userId} | ` +
      `${createdCount} créée(s), ${ignoredLowConfidence} faible confiance, ${ignoredDuplicate} doublons`
    );

    return res.status(202).json({
      success: true,
      message: `${createdCount} capture(s) creee(s), ${ignoredDuplicate} doublon(s) ignore(s), ${ignoredLowConfidence} rejetee(s) (faible confiance)`,
      stats: {
        total: captures.length,
        created: createdCount,
        ignoredDuplicate,
        ignoredLowConfidence,
      },
      data: resultats,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/statut/:captureId', authenticate, async (req, res) => {
  try {
    const capture = await AudioCaptureService.findById(getParam(req.params.captureId));

    if (!capture) {
      return res.status(404).json({ success: false, error: 'Capture non trouvee' });
    }

    return res.json({ success: true, data: capture });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ===== ROUTE : Statistiques de soirée =====
router.get('/soiree/stats', authenticate, async (req, res) => {
  try {
    const { etablissementId, date } = req.query;
    const userId = req.user!.id;

    // ===== VALIDATION: etablissementId =====
    if (!etablissementId) {
      logValidationError(
        '/soiree/stats',
        userId,
        'etablissementId',
        'Paramètre query manquant',
        {
          queryParams: Object.keys(req.query),
          receivedValue: etablissementId,
          hint: 'Utilisez: GET /soiree/stats?etablissementId=XXX&date=YYYY-MM-DD'
        }
      );
      return res.status(400).json({ 
        success: false, 
        error: 'etablissementId requis',
        details: 'Fournissez l\'ID de l\'établissement en tant que paramètre query',
        example: '/soiree/stats?etablissementId=your-id&date=2024-01-15'
      });
    }

    // Récupérer les captures du jour (ou date spécifiée)
    const targetDate = date ? new Date(date as string) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    console.log(
      `[STATS] User: ${userId} | ` +
      `Etablissement: ${etablissementId} | ` +
      `Period: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`
    );

    const captures = await AudioCaptureService.findWithRecognition(
      etablissementId as string,
      dayStart,
      dayEnd
    );

    // Calculer les stats
    const uniqueTracks = new Map<string, any>();
    let totalDuration = 0;

    for (const capture of captures) {
      const recognition = (capture as any).recognition;
      if (!recognition) continue;

      const key = recognition.isrc || `${normalizeString(recognition.titre)}|${normalizeString(recognition.artiste)}`;

      if (!uniqueTracks.has(key)) {
        uniqueTracks.set(key, {
          titre: recognition.titre,
          artiste: recognition.artiste,
          isrc: recognition.isrc,
          confidence: recognition.confidence,
          firstPlayedAt: capture.capturedAt,
          playCount: 1,
        });
      } else {
        uniqueTracks.get(key).playCount++;
      }
    }

    return res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        etablissementId,
        totalCaptures: captures.length,
        uniqueTracks: uniqueTracks.size,
        tracks: Array.from(uniqueTracks.values()).sort(
          (a, b) => new Date(b.firstPlayedAt).getTime() - new Date(a.firstPlayedAt).getTime()
        ),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


export default router;
