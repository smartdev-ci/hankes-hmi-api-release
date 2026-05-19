import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format image non supporte. Utilisez JPEG, PNG ou WebP.'));
    }
  },
});

router.post('/image', authenticate, upload.single('image'), async (req, res) => {
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
  } catch (error: any) {
    if (error.message.includes('Format image')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
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

export default router;
