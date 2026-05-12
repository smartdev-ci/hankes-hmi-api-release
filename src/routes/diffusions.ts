import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Mock database
const diffusions: any[] = [];

/**
 * GET /diffusions
 * Liste des diffusions (avec filtres et pagination)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const etablissementId = req.query.etablissementId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const artiste = req.query.artiste as string;
    const isrc = req.query.isrc as string;
    const sourceApi = req.query.sourceApi as string;

    let filtered = [...diffusions];

    // Filtres
    if (etablissementId) {
      filtered = filtered.filter(d => d.etablissementId === etablissementId);
    }
    if (startDate) {
      filtered = filtered.filter(d => new Date(d.timestampDiffusion) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(d => new Date(d.timestampDiffusion) <= new Date(endDate));
    }
    if (artiste) {
      filtered = filtered.filter(d => d.artiste.toLowerCase().includes(artiste.toLowerCase()));
    }
    if (isrc) {
      filtered = filtered.filter(d => d.isrc === isrc);
    }
    if (sourceApi) {
      filtered = filtered.filter(d => d.sourceApi === sourceApi);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /diffusions/:diffusionId
 * Récupérer les détails d'une diffusion
 */
router.get('/:diffusionId', authenticate, async (req, res) => {
  try {
    const { diffusionId } = req.params;
    
    const diffusion = diffusions.find(d => d.id === diffusionId);
    
    if (!diffusion) {
      res.status(404).json({
        success: false,
        error: 'Diffusion non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: diffusion,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
