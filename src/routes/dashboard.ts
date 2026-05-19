import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { SupabasePrismaService } from '../database/services';

const router = Router();

const parseDateRange = (query: any) => ({
  startDate: query.startDate ? new Date(query.startDate as string) : undefined,
  endDate: query.endDate ? new Date(query.endDate as string) : undefined,
});

router.get('/kpis', authenticate, authorize('admin'), async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const kpis = await SupabasePrismaService.getDashboardKpis(range);

    res.json({
      success: true,
      data: {
        ...kpis,
        periode: {
          startDate: range.startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: range.endDate?.toISOString() || new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/carte', authenticate, async (req, res) => {
  try {
    const data = await SupabasePrismaService.getMapData({
      statut: req.query.statut as string | undefined,
      ville: req.query.ville as string | undefined,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/top-musiques', authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 5), 50);
    const range = parseDateRange(req.query);
    const classement = await SupabasePrismaService.getTopMusiques(limit, range);

    res.json({
      success: true,
      data: {
        classement,
        periode: {
          startDate: range.startDate?.toISOString() || null,
          endDate: range.endDate?.toISOString() || null,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/top-artistes', authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 5), 50);
    const range = parseDateRange(req.query);
    const classement = await SupabasePrismaService.getTopArtistes(limit, range);

    res.json({
      success: true,
      data: {
        classement,
        periode: {
          startDate: range.startDate?.toISOString() || null,
          endDate: range.endDate?.toISOString() || null,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/evolution', authenticate, async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const evolution = await SupabasePrismaService.getDiffusionEvolution(range);

    res.json({
      success: true,
      data: {
        evolution,
        periode: {
          startDate: range.startDate?.toISOString() || null,
          endDate: range.endDate?.toISOString() || null,
          granularite: 'jour',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
