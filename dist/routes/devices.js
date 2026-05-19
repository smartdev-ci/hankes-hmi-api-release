"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../utils/validators");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
const getParam = (value) => Array.isArray(value) ? value[0] : value;
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const etablissementId = req.query.etablissementId;
        let devices = await services_1.DeviceService.findAll();
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.createDeviceSchema), async (req, res) => {
    try {
        const { deviceId, platform, appVersion, osVersion, etablissementId, pushToken } = req.body;
        const existing = await services_1.DeviceService.findByDeviceId(deviceId);
        const device = existing
            ? await services_1.DeviceService.update(existing.id, {
                platform,
                appVersion,
                osVersion,
                etablissementId: etablissementId || null,
                pushToken: pushToken || null,
                lastActiveAt: new Date(),
            })
            : await services_1.DeviceService.create({
                userId: req.user.id,
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.patch('/:deviceId', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.updateDeviceSchema), async (req, res) => {
    try {
        const deviceId = getParam(req.params.deviceId);
        const device = await services_1.DeviceService.findById(deviceId);
        if (!device || (req.user?.role !== 'admin' && device.userId !== req.user?.id)) {
            return res.status(404).json({ success: false, error: 'Appareil non trouve' });
        }
        const updated = await services_1.DeviceService.update(device.id, {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/:deviceId', auth_1.authenticate, async (req, res) => {
    try {
        const deviceId = getParam(req.params.deviceId);
        const device = await services_1.DeviceService.findById(deviceId);
        if (!device || (req.user?.role !== 'admin' && device.userId !== req.user?.id)) {
            return res.status(404).json({ success: false, error: 'Appareil non trouve' });
        }
        await services_1.DeviceService.delete(device.id);
        return res.json({ success: true, message: 'Appareil supprime avec succes' });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map