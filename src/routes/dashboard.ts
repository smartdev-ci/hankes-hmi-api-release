import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * GET /dashboard/kpis
 * Récupérer les KPIs principaux (admin uniquement)
 */
router.get('/kpis', authenticate, authorize('admin'), async (req, res) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // KPIs mockés
    const kpis = {
      totalEtablissements: 0,
      totalDiffusions: 0,
      musiquesUnique: 0,
      artistesUnique: 0,
      couvertureGeographique: {
        villes: 0,
        regions: 0,
      },
      periode: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      data: kpis,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /dashboard/carte
 * Données pour la carte géographique (avec filtres)
 */
router.get('/carte', authenticate, async (req, res) => {
  try {
    const statut = req.query.statut as string;
    const ville = req.query.ville as string;

    // Mock: données géographiques avec filtres
    let etablissementsData: any[] = [];
    
    // Application des filtres (mock)
    if (statut || ville) {
      // Filtres appliqués ici quand on aura la vraie DB
      etablissementsData = [];
    } else {
      etablissementsData = [];
    }

    const mapData = {
      etablissements: etablissementsData,
      total: etablissementsData.length,
    };

    res.json({
      success: true,
      data: mapData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /dashboard/top-musiques
 * Top des musiques les plus diffusées (avec filtres date et limit)
 */
router.get('/top-musiques', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // Validation du limit (5-50)
    const validLimit = Math.min(Math.max(limit, 5), 50);

    // Mock: top musiques
    const topMusiques: any[] = [];

    res.json({
      success: true,
      data: {
        classement: topMusiques,
        periode: { 
          startDate: startDate || null, 
          endDate: endDate || null 
        },
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
 * GET /dashboard/top-artistes
 * Top des artistes les plus diffusés (avec filtres date et limit)
 */
router.get('/top-artistes', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // Validation du limit (5-50)
    const validLimit = Math.min(Math.max(limit, 5), 50);

    // Mock: top artistes
    const topArtistes: any[] = [];

    res.json({
      success: true,
      data: {
        classement: topArtistes,
        periode: { 
          startDate: startDate || null, 
          endDate: endDate || null 
        },
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
 * GET /dashboard/evolution
 * Évolution temporelle des diffusions (avec filtres date et granularité)
 */
router.get('/evolution', authenticate, async (req, res) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const granularite = req.query.granularite as string || 'jour';
    
    // Validation de la granularité
    const validGranularite = ['jour', 'semaine', 'mois'].includes(granularite) 
      ? granularite 
      : 'jour';

    // Mock: évolution
    const evolution = {
      evolution: [],
      periode: { 
        startDate: startDate || null, 
        endDate: endDate || null,
        granularite: validGranularite,
      },
    };

    res.json({
      success: true,
      data: evolution,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
