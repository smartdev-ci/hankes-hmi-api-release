"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Mock database
const notifications = [];
/**
 * GET /notifications
 * Lister les notifications de l'utilisateur connecté
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
    }
    catch (error) {
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
router.post('/:id/lire', auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
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
router.post('/lire-tout', auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map