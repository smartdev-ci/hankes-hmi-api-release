import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createDeviceSchema, updateDeviceSchema } from '../utils/validators';
import { DeviceService } from '../database/services';

const router = Router();
const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const etablissementId = req.query.etablissementId as string | undefined;

    let devices = await DeviceService.findAll();

    if (req.user?.role !== 'admin') {
      devices = devices.filter((device) => device.userId === req.user?.id);
    }
    if (etablissementId) {
      devices = devices.filter((device) => device.etablissementId === etablissementId);
    }

    const startIndex = (page - 1) * limit;

    res.json({
      success: true,
      data: devices.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        total: devices.length,
        totalPages: Math.ceil(devices.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', authenticate, validateRequest(createDeviceSchema), async (req, res) => {
  try {
    const { deviceId, platform, appVersion, osVersion, etablissementId, pushToken } = req.body;

    const existing = await DeviceService.findByDeviceId(deviceId);
    const device = existing
      ? await DeviceService.update(existing.id, {
          platform,
          appVersion,
          osVersion,
          etablissementId: etablissementId || null,
          pushToken: pushToken || null,
          lastActiveAt: new Date(),
        })
      : await DeviceService.create({
          userId: req.user!.id,
          deviceId,
          platform,
          appVersion,
          osVersion,
          etablissementId: etablissementId || null,
          pushToken: pushToken || null,
          lastActiveAt: new Date(),
        });

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing ? 'Appareil mis a jour avec succes' : 'Appareil enregistre avec succes',
      data: device,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:deviceId', authenticate, validateRequest(updateDeviceSchema), async (req, res) => {
  try {
    const deviceId = getParam(req.params.deviceId);
    const device = await DeviceService.findById(deviceId);

    if (!device || (req.user?.role !== 'admin' && device.userId !== req.user?.id)) {
      return res.status(404).json({ success: false, error: 'Appareil non trouve' });
    }

    const updated = await DeviceService.update(device.id, {
      etablissementId: req.body.etablissementId,
      appVersion: req.body.appVersion,
      osVersion: req.body.osVersion,
      pushToken: req.body.pushToken,
      lastActiveAt: req.body.lastActiveAt ? new Date(req.body.lastActiveAt) : new Date(),
    });

    return res.json({
      success: true,
      message: 'Appareil mis a jour avec succes',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:deviceId', authenticate, async (req, res) => {
  try {
    const deviceId = getParam(req.params.deviceId);
    const device = await DeviceService.findById(deviceId);

    if (!device || (req.user?.role !== 'admin' && device.userId !== req.user?.id)) {
      return res.status(404).json({ success: false, error: 'Appareil non trouve' });
    }

    await DeviceService.delete(device.id);
    return res.json({ success: true, message: 'Appareil supprime avec succes' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
