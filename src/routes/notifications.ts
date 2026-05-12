import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Mock database
const notifications: any[] = [];

/**
 * GET /notifications
 * Lister les notifications de l'utilisateur connecté
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const nonLues = req.query.nonLues === 'true';

    // Filtrer les notifications de l'utilisateur
    let filtered = notifications.filter(n => n.userId === req.user?.id);

    if (nonLues) {
      filtered = filtered.filter(n => !n.estLue);
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
 * POST /notifications/:id/lire
 * Marquer une notification comme lue
 */
router.post('/:id/lire', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = notifications.find(n => n.id === id && n.userId === req.user?.id);
    
    if (!notification) {
      res.status(404).json({
        success: false,
        error: 'Notification non trouvée',
      });
      return;
    }

    notification.estLue = true;
    notification.dateLecture = new Date();

    res.json({
      success: true,
      message: 'Notification marquée comme lue',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /notifications/lire-tout
 * Marquer toutes les notifications comme lues
 */
router.post('/lire-tout', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    // Marquer toutes les notifications de l'utilisateur comme lues
    notifications
      .filter(n => n.userId === req.user?.id && !n.estLue)
      .forEach(n => {
        n.estLue = true;
        n.dateLecture = now;
      });

    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
