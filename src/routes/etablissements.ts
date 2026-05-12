import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createEtablissementSchema, updateEtablissementSchema } from '../utils/validators';

const router = Router();

// Mock database
const etablissements: any[] = [];

/**
 * GET /etablissements
 * Liste des établissements (avec pagination et filtres)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const ville = req.query.ville as string;
    const type = req.query.type as string;
    const search = req.query.search as string;

    let filtered = [...etablissements];

    // Filtres
    if (ville) {
      filtered = filtered.filter(e => e.ville === ville);
    }
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    if (search) {
      filtered = filtered.filter(e => 
        e.nom.toLowerCase().includes(search.toLowerCase()) ||
        e.adresse.toLowerCase().includes(search.toLowerCase())
      );
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
 * POST /etablissements
 * Créer un nouvel établissement
 */
router.post('/', authenticate, validateRequest(createEtablissementSchema), async (req, res) => {
  try {
    const etablissement = {
      id: require('uuid').v4(),
      ...req.body,
      gerantId: req.user?.id,
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    etablissements.push(etablissement);

    // Mettre à jour l'utilisateur avec l'ID de l'établissement
    // (dans une vraie implémentation, mettre à jour la BDD)

    res.status(201).json({
      success: true,
      data: etablissement,
      message: 'Établissement créé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId
 * Récupérer les détails d'un établissement
 */
router.get('/:etablissementId', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
      return;
    }

    res.json({
      success: true,
      data: etablissement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /etablissements/:etablissementId
 * Mettre à jour un établissement
 */
router.put('/:etablissementId', authenticate, validateRequest(updateEtablissementSchema), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
      return;
    }

    // Mise à jour
    Object.assign(etablissement, {
      ...req.body,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      data: etablissement,
      message: 'Établissement mis à jour avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /etablissements/:etablissementId
 * Supprimer un établissement (admin uniquement)
 */
router.delete('/:etablissementId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    const index = etablissements.findIndex(e => e.id === etablissementId);
    
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    etablissements.splice(index, 1);

    res.json({
      success: true,
      message: 'Établissement supprimé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/valider
 * Valider un établissement (admin uniquement)
 */
router.post('/:etablissementId/valider', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    etablissement.isVerified = true;
    etablissement.updatedAt = new Date();

    res.json({
      success: true,
      data: etablissement,
      message: 'Établissement validé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/suspendre
 * Suspendre un établissement (admin uniquement)
 */
router.post('/:etablissementId/suspendre', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    const { motif } = req.body;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    etablissement.isActive = false;
    etablissement.updatedAt = new Date();

    // TODO: Envoyer notification au gérant

    res.json({
      success: true,
      data: etablissement,
      message: 'Établissement suspendu avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/stats
 * Statistiques d'un établissement
 */
router.get('/:etablissementId/stats', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
      return;
    }

    // Stats mockées
    const stats = {
      etablissementId,
      periode: { startDate, endDate },
      totalDiffusions: 0,
      musiquesUnique: 0,
      artistesUnique: 0,
      dureeTotaleHeures: 0,
      topMusiques: [],
      topArtistes: [],
      evolutionParJour: [],
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/diffusions
 * Historique des diffusions d'un établissement
 */
router.get('/:etablissementId/diffusions', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const etablissement = etablissements.find(e => e.id === etablissementId);
    
    if (!etablissement) {
      res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
      return;
    }

    // Mock: retourner liste vide
    res.json({
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
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
