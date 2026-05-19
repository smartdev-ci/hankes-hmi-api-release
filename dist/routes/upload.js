"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Format image non supporte. Utilisez JPEG, PNG ou WebP.'));
        }
    },
});
router.post('/image', auth_1.authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Aucune image fournie',
            });
        }
        return res.status(501).json({
            success: false,
            error: 'Stockage fichier non configure. Branchez Supabase Storage ou S3 avant d accepter les uploads.',
            data: {
                mimetype: req.file.mimetype,
                taille: req.file.size,
                nomOriginal: req.file.originalname,
            },
        });
    }
    catch (error) {
        if (error.message.includes('Format image')) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }
        if (error instanceof multer_1.default.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Image trop volumineuse. Taille maximale : 5MB',
            });
        }
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map