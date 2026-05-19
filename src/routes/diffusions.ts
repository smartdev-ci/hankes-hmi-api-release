import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { DiffusionService } from '../database/services';

const router = Router();
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const etablissementId = req.query.etablissementId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const artiste = req.query.artiste as string | undefined;

    let diffusions = etablissementId
      ? await DiffusionService.findByEtablissement(etablissementId)
      : await DiffusionService.findAll();

    if (startDate) {
      diffusions = diffusions.filter((d) => d.playedAt >= startDate);
    }
    if (endDate) {
      diffusions = diffusions.filter((d) => d.playedAt <= endDate);
    }
    if (artiste) {
      diffusions = diffusions.filter((d) => d.artiste.toLowerCase().includes(artiste.toLowerCase()));
    }

    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      data: diffusions.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        total: diffusions.length,
        totalPages: Math.ceil(diffusions.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:diffusionId', authenticate, async (req, res) => {
  try {
    const diffusion = await DiffusionService.findById(getParam(req.params.diffusionId));

    if (!diffusion) {
      return res.status(404).json({ success: false, error: 'Diffusion non trouvee' });
    }

    return res.json({ success: true, data: diffusion });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
