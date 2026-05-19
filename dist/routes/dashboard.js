"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
const parseDateRange = (query) => ({
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
});
router.get('/kpis', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const range = parseDateRange(req.query);
        const kpis = await services_1.SupabasePrismaService.getDashboardKpis(range);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/carte', auth_1.authenticate, async (req, res) => {
    try {
        const data = await services_1.SupabasePrismaService.getMapData({
            statut: req.query.statut,
            ville: req.query.ville,
        });
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/top-musiques', auth_1.authenticate, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 5), 50);
        const range = parseDateRange(req.query);
        const classement = await services_1.SupabasePrismaService.getTopMusiques(limit, range);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/top-artistes', auth_1.authenticate, async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 5), 50);
        const range = parseDateRange(req.query);
        const classement = await services_1.SupabasePrismaService.getTopArtistes(limit, range);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/evolution', auth_1.authenticate, async (req, res) => {
    try {
        const range = parseDateRange(req.query);
        const evolution = await services_1.SupabasePrismaService.getDiffusionEvolution(range);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map