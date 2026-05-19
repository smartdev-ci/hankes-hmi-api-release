"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
const getParam = (value) => Array.isArray(value) ? value[0] : value;
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const nonLues = req.query.nonLues === 'true';
        let notifications = await services_1.NotificationService.findByUser(req.user.id);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/lire-tout', auth_1.authenticate, async (req, res) => {
    try {
        const count = await services_1.NotificationService.markAllAsRead(req.user.id);
        res.json({
            success: true,
            message: 'Toutes les notifications ont ete marquees comme lues',
            count,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/lire', auth_1.authenticate, async (req, res) => {
    try {
        const id = getParam(req.params.id);
        const notification = await services_1.NotificationService.findById(id);
        if (!notification || notification.userId !== req.user.id) {
            return res.status(404).json({ success: false, error: 'Notification non trouvee' });
        }
        await services_1.NotificationService.markAsRead(id);
        return res.json({ success: true, message: 'Notification marquee comme lue' });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map