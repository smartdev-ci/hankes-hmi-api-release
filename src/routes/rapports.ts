import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Mock database
const rapports: any[] = [];

/**
 * GET /rapports
 * Lister les rapports
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const typeRapport = req.query.typeRapport as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let filtered = [...rapports];

    // Filtres
    if (typeRapport) {
      filtered = filtered.filter(r => r.typeRapport === typeRapport);
    }
    if (startDate) {
      filtered = filtered.filter(r => new Date(r.dateGeneration) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(r => new Date(r.dateGeneration) <= new Date(endDate));
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
 * POST /rapports
 * Générer un rapport
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { typeRapport, dateDebut, dateFin, format } = req.body;

    // Créer le rapport
    const rapport: any = {
      id: require('uuid').v4(),
      typeRapport,
      dateDebut,
      dateFin,
      format: format || 'pdf',
      statut: 'en_cours',
      dateGeneration: new Date(),
      generePar: req.user?.id,
    };

    rapports.push(rapport);

    // Simulation de génération asynchrone
    setTimeout(() => {
      rapport.statut = 'termine';
      rapport.urlTelechargement = `/rapports/${rapport.id}/telecharger`;
    }, 2000);

    res.status(202).json({
      success: true,
      message: 'Rapport en cours de génération',
      rapport: {
        id: rapport.id,
        typeRapport: rapport.typeRapport,
        statut: rapport.statut,
        dateGeneration: rapport.dateGeneration,
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
 * GET /rapports/:rapportId
 * Récupérer les détails d'un rapport
 */
router.get('/:rapportId', authenticate, async (req, res) => {
  try {
    const { rapportId } = req.params;
    
    const rapport = rapports.find(r => r.id === rapportId);
    
    if (!rapport) {
      res.status(404).json({
        success: false,
        error: 'Rapport non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      rapport: {
        id: rapport.id,
        typeRapport: rapport.typeRapport,
        dateDebut: rapport.dateDebut,
        dateFin: rapport.dateFin,
        format: rapport.format,
        statut: rapport.statut,
        dateGeneration: rapport.dateGeneration,
        urlTelechargement: rapport.urlTelechargement,
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
 * GET /rapports/:rapportId/telecharger
 * Télécharger un rapport
 */
router.get('/:rapportId/telecharger', authenticate, async (req, res) => {
  try {
    const { rapportId } = req.params;
    
    const rapport = rapports.find(r => r.id === rapportId);
    
    if (!rapport) {
      res.status(404).json({
        success: false,
        error: 'Rapport non trouvé',
      });
      return;
    }

    if (rapport.statut !== 'termine') {
      res.status(400).json({
        success: false,
        error: 'Rapport non prêt au téléchargement',
      });
      return;
    }

    // Mock: retourne un fichier fictif
    res.setHeader('Content-Type', `application/${rapport.format}`);
    res.setHeader('Content-Disposition', `attachment; filename="rapport_${rapport.id}.${rapport.format}"`);
    
    res.send('Contenu du rapport (fichier mocké)');
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
