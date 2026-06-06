"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const services_1 = require("../database/services");
const diffusion_service_1 = require("../database/services/diffusion.service");
const hybrid_recognition_service_1 = __importDefault(require("../services/hybrid-recognition.service"));
const fingerprint_service_1 = __importDefault(require("../services/fingerprint.service"));
const config_1 = require("../config");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const getParam = (value) => Array.isArray(value) ? value[0] : value;
// ===== CONFIGURATION GLOBALE =====
const MIN_CONFIDENCE_THRESHOLD = config_1.config.audio.minConfidence;
const DUPLICATE_WINDOW_MINUTES = config_1.config.audio.duplicateWindowMinutes;
const MAX_FILE_SIZE = config_1.config.audio.maxFileSizeBytes;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Seuls les fichiers audio sont autorises'));
        }
    },
});
// ===== HELPERS =====
/**
 * Normalise une chaîne pour comparaison (minuscule, sans ponctuation)
 */
const normalizeString = (str) => {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s\u00C0-\u024F]/g, '') // Garde les accents
        .replace(/\s+/g, ' ');
};
/**
 * Vérifie si une musique a déjà été capturée récemment pour cet établissement
 */
const isRecentDuplicate = async (etablissementId, titre, artiste, isrc) => {
    try {
        const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
        // Récupérer les captures récentes avec reconnaissance
        const recentCaptures = await services_1.AudioCaptureService.findRecentWithRecognition(etablissementId, windowStart);
        if (!recentCaptures || recentCaptures.length === 0) {
            return { isDuplicate: false };
        }
        const normalizedTitle = normalizeString(titre);
        const normalizedArtist = normalizeString(artiste);
        for (const capture of recentCaptures) {
            const recognition = capture.recognition;
            if (!recognition)
                continue;
            // 1. Match par ISRC (le plus fiable)
            if (isrc && recognition.isrc && normalizeString(isrc) === normalizeString(recognition.isrc)) {
                return { isDuplicate: true, existingId: capture.id };
            }
            // 2. Match par titre + artiste normalisés
            const existingTitle = normalizeString(recognition.titre);
            const existingArtist = normalizeString(recognition.artiste);
            if (normalizedTitle &&
                normalizedArtist &&
                existingTitle === normalizedTitle &&
                existingArtist === normalizedArtist) {
                return { isDuplicate: true, existingId: capture.id };
            }
        }
        return { isDuplicate: false };
    }
    catch (error) {
        console.error('Erreur lors de la vérification de doublon:', error);
        return { isDuplicate: false }; // Fail open : on traite quand même
    }
};
// ===== ROUTES =====
router.get('/config', auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/capturer', auth_1.authenticate, upload.single('audio'), async (req, res) => {
    try {
        const { etablissementId, deviceId } = req.body;
        const audioFile = req.file;
        if (!audioFile?.buffer) {
            return res.status(400).json({ success: false, error: 'Fichier audio requis' });
        }
        if (!etablissementId) {
            return res.status(400).json({ success: false, error: 'etablissementId requis' });
        }
        // Mémoriser capturedAt pour l'utiliser aussi dans la diffusion
        const capturedAt = req.body.capturedAt ? new Date(req.body.capturedAt) : new Date();
        // 1. Créer la capture initiale
        let capture = await services_1.AudioCaptureService.create({
            etablissementId,
            userId: req.user.id,
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
            const recognitionResult = await hybrid_recognition_service_1.default.processCapture({
                captureId: capture.id,
                etablissementId,
                userId: req.user.id,
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
        }
        catch (recognitionError) {
            capture = await services_1.AudioCaptureService.markAsFailed(capture.id);
            return res.status(502).json({
                success: false,
                error: recognitionError.message,
                captureId: capture.id,
                statut: capture.statut,
            });
        }
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/sync', auth_1.authenticate, async (req, res) => {
    try {
        const { captures } = req.body;
        if (!Array.isArray(captures) || captures.length === 0) {
            return res.status(400).json({ success: false, error: 'Le batch de captures ne peut pas etre vide' });
        }
        const resultats = [];
        let createdCount = 0;
        let ignoredLowConfidence = 0;
        let ignoredDuplicate = 0;
        // Traiter séquentiellement pour bien gérer les doublons en cascade
        for (const batch of captures) {
            try {
                const etablissementId = batch.etablissementId;
                if (!etablissementId) {
                    resultats.push({
                        localId: batch.localId || batch.trackId,
                        status: 'error',
                        reason: 'missing_etablissementId'
                    });
                    continue;
                }
                // 1. Filtrer par confiance
                if (!batch.confidence || batch.confidence < MIN_CONFIDENCE_THRESHOLD) {
                    console.log(`[SYNC] Ignorée (confiance ${batch.confidence}):`, `${batch.titre} - ${batch.artiste}`);
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
                const duplicateCheck = await isRecentDuplicate(etablissementId, batch.titre, batch.artiste, batch.isrc || null);
                if (duplicateCheck.isDuplicate) {
                    console.log(`[SYNC] Doublon ignoré: "${batch.titre}" (existe: ${duplicateCheck.existingId})`);
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
                const capture = await services_1.AudioCaptureService.create({
                    etablissementId,
                    userId: req.user.id,
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
                    const track = await services_1.TrackService.upsertFromRecognition({
                        titre: batch.titre,
                        artiste: batch.artiste,
                        album: batch.album || null,
                        isrc: batch.isrc || null,
                        genre: batch.genre || null,
                        annee: batch.annee || null,
                    });
                    recognition = await services_1.MusicRecognitionService.create({
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
                        },
                    });
                    if (batch.fingerprint) {
                        await services_1.FingerprintRepository.create({
                            fingerprint: batch.fingerprint,
                            fingerprintHash: batch.fingerprintHash || fingerprint_service_1.default.hashFingerprint(batch.fingerprint),
                            algorithm: batch.fingerprintAlgorithm || 'mobile',
                            recognitionId: recognition.id,
                            trackId: track.id,
                        });
                    }
                    // 5. Enregistrer la diffusion associée à la capture synchronisée
                    await diffusion_service_1.DiffusionService.create({
                        etablissementId,
                        musicId: recognition.id,
                        titre: recognition.titre,
                        artiste: recognition.artiste,
                        playedAt: capturedAt,
                        duree: Number(batch.duree || 0),
                        source: 'capture',
                        userId: req.user.id,
                        captureId: capture.id,
                    });
                }
                createdCount++;
                resultats.push({
                    localId: batch.localId || batch.trackId,
                    captureId: capture.id,
                    status: 'created'
                });
            }
            catch (itemError) {
                console.error('[SYNC] Erreur sur item:', itemError);
                resultats.push({
                    localId: batch.localId || batch.trackId,
                    status: 'error',
                    reason: itemError.message
                });
            }
        }
        console.log(`[SYNC] ✅ Terminé: ${createdCount} créées, ${ignoredLowConfidence} faible confiance, ${ignoredDuplicate} doublons`);
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
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/statut/:captureId', auth_1.authenticate, async (req, res) => {
    try {
        const capture = await services_1.AudioCaptureService.findById(getParam(req.params.captureId));
        if (!capture) {
            return res.status(404).json({ success: false, error: 'Capture non trouvee' });
        }
        return res.json({ success: true, data: capture });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// ===== ROUTE : Statistiques de soirée =====
router.get('/soiree/stats', auth_1.authenticate, async (req, res) => {
    try {
        const { etablissementId, date } = req.query;
        if (!etablissementId) {
            return res.status(400).json({ success: false, error: 'etablissementId requis' });
        }
        // Récupérer les captures du jour (ou date spécifiée)
        const targetDate = date ? new Date(date) : new Date();
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);
        const captures = await services_1.AudioCaptureService.findWithRecognition(etablissementId, dayStart, dayEnd);
        // Calculer les stats
        const uniqueTracks = new Map();
        let totalDuration = 0;
        for (const capture of captures) {
            const recognition = capture.recognition;
            if (!recognition)
                continue;
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
            }
            else {
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
                tracks: Array.from(uniqueTracks.values()).sort((a, b) => new Date(b.firstPlayedAt).getTime() - new Date(a.firstPlayedAt).getTime()),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=audio.js.map