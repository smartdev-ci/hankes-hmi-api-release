"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Configuration multer pour le stockage en mémoire
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Format d\'image non supporté. Utilisez JPEG, PNG ou WebP.'));
        }
    },
});
/**
 * POST /upload/image
 * Upload d'une image pour un établissement
 */
router.post('/image', auth_1.authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'Aucune image fournie',
            });
            return;
        }
        // Mock: générer une URL fictive
        const imageUrl = `https://storage.hankees.ci/etablissements/${require('uuid').v4()}-${req.file.originalname}`;
        res.status(201).json({
            success: true,
            message: 'Image uploadée avec succès',
            data: {
                url: imageUrl,
                mimetype: req.file.mimetype,
                taille: req.file.size,
                nomOriginal: req.file.originalname,
            },
        });
    }
    catch (error) {
        if (error.message.includes('Format d\'image')) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
            return;
        }
        if (error instanceof multer_1.default.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({
                    success: false,
                    error: 'L\'image est trop volumineuse. Taille maximale : 5MB',
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map