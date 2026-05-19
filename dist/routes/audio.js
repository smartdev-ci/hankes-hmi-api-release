"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const services_1 = require("../database/services");
const acrcloud_service_1 = __importDefault(require("../services/acrcloud.service"));
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const getParam = (value) => Array.isArray(value) ? value[0] : value;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Seuls les fichiers audio sont autorises'));
        }
    },
});
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
                providers: ['acrcloud'],
                providerDefaut: 'acrcloud',
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
        let capture = await services_1.AudioCaptureService.create({
            etablissementId,
            userId: req.user.id,
            audioUrl: `memory://${audioFile.originalname}`,
            duree: Number(req.body.duree || 0),
            format: audioFile.mimetype,
            taille: audioFile.size,
            statut: 'processing',
            deviceId: deviceId || null,
            capturedAt: req.body.capturedAt ? new Date(req.body.capturedAt) : new Date(),
            syncedAt: new Date(),
        });
        try {
            const metadata = await acrcloud_service_1.default.identify(audioFile.buffer, audioFile.originalname);
            if (metadata) {
                const recognition = await services_1.MusicRecognitionService.create({
                    captureId: capture.id,
                    titre: metadata.title,
                    artiste: metadata.artist,
                    isrc: metadata.isrc || null,
                    label: metadata.label || null,
                    annee: metadata.releaseDate ? new Date(metadata.releaseDate).getFullYear() : null,
                    genre: metadata.genres?.join(', ') || null,
                    confidence: metadata.confidence,
                    source: 'acrcloud',
                    metadata: metadata,
                });
                capture = await services_1.AudioCaptureService.markAsProcessed(capture.id);
                return res.status(200).json({
                    success: true,
                    message: 'Musique identifiee avec succes',
                    captureId: capture.id,
                    statut: capture.statut,
                    resultat: recognition,
                });
            }
            capture = await services_1.AudioCaptureService.markAsFailed(capture.id);
            return res.status(200).json({
                success: true,
                message: 'Traitement termine sans correspondance',
                captureId: capture.id,
                statut: capture.statut,
                resultat: null,
            });
        }
        catch (acrError) {
            capture = await services_1.AudioCaptureService.markAsFailed(capture.id);
            return res.status(502).json({
                success: false,
                error: acrError.message,
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
        const resultats = await Promise.all(captures.map((batch) => services_1.AudioCaptureService.create({
            etablissementId: batch.etablissementId,
            userId: req.user.id,
            audioUrl: batch.audioUrl || `offline://${batch.localId || Date.now()}`,
            duree: Number(batch.duree || 0),
            format: batch.format || 'unknown',
            taille: Number(batch.taille || 0),
            statut: 'pending',
            deviceId: batch.deviceId || null,
            capturedAt: batch.capturedAt ? new Date(batch.capturedAt) : new Date(),
            syncedAt: new Date(),
        })));
        return res.status(202).json({
            success: true,
            message: `${resultats.length} captures synchronisees`,
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
exports.default = router;
//# sourceMappingURL=audio.js.map