import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { RapportService } from '../database/services';

const router = Router();
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.typeRapport as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    let rapports = await RapportService.findAll();

    if (req.user?.role !== 'admin') {
      rapports = rapports.filter((rapport) => rapport.generePar === req.user?.id);
    }
    if (type) {
      rapports = rapports.filter((rapport) => rapport.type === type);
    }
    if (startDate) {
      rapports = rapports.filter((rapport) => rapport.dateGeneration >= startDate);
    }
    if (endDate) {
      rapports = rapports.filter((rapport) => rapport.dateGeneration <= endDate);
    }

    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      data: rapports.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        total: rapports.length,
        totalPages: Math.ceil(rapports.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const {
      typeRapport,
      type,
      dateDebut,
      dateFin,
      format,
      etablissementId,
      metadata,
    } = req.body;

    const rapport = await RapportService.create({
      type: type || typeRapport,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      format: format || 'pdf',
      statut: 'en_cours',
      generePar: req.user!.id,
      etablissementId: etablissementId || null,
      metadata: metadata || null,
    });

    res.status(202).json({
      success: true,
      message: 'Rapport en cours de generation',
      data: rapport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:rapportId', authenticate, async (req, res) => {
  try {
    const rapport = await RapportService.findById(getParam(req.params.rapportId));

    if (!rapport || (req.user?.role !== 'admin' && rapport.generePar !== req.user?.id)) {
      return res.status(404).json({ success: false, error: 'Rapport non trouve' });
    }

    return res.json({ success: true, data: rapport });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:rapportId/telecharger', authenticate, async (req, res) => {
  try {
    const rapport = await RapportService.findById(getParam(req.params.rapportId));

    if (!rapport || (req.user?.role !== 'admin' && rapport.generePar !== req.user?.id)) {
      return res.status(404).json({ success: false, error: 'Rapport non trouve' });
    }
    if (rapport.statut !== 'termine' || !rapport.fichierUrl) {
      return res.status(409).json({ success: false, error: 'Rapport non pret au telechargement' });
    }

    return res.json({
      success: true,
      data: {
        url: rapport.fichierUrl,
        format: rapport.format,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
