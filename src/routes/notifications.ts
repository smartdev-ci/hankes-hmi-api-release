import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../database/services';

const router = Router();
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const nonLues = req.query.nonLues === 'true';

    let notifications = await NotificationService.findByUser(req.user!.id);
    if (nonLues) {
      notifications = notifications.filter((notification) => !notification.estLue);
    }

    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      data: notifications.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        total: notifications.length,
        totalPages: Math.ceil(notifications.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/lire-tout', authenticate, async (req, res) => {
  try {
    const count = await NotificationService.markAllAsRead(req.user!.id);
    res.json({
      success: true,
      message: 'Toutes les notifications ont ete marquees comme lues',
      count,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/lire', authenticate, async (req, res) => {
  try {
    const id = getParam(req.params.id);
    const notification = await NotificationService.findById(id);

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Notification non trouvee' });
    }

    await NotificationService.markAsRead(id);
    return res.json({ success: true, message: 'Notification marquee comme lue' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
