"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /dashboard/kpis
 * Récupérer les KPIs principaux (admin uniquement)
 */
router.get('/kpis', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // KPIs mockés
        const kpis = {
            totalEtablissements: 0,
            totalDiffusions: 0,
            musiquesUnique: 0,
            artistesUnique: 0,
            couvertureGeographique: {
                villes: 0,
                regions: 0,
            },
            periode: {
                startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: endDate || new Date().toISOString(),
            },
        };
        res.json({
            success: true,
            data: kpis,
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
 * GET /dashboard/carte
 * Données pour la carte géographique (avec filtres)
 */
router.get('/carte', auth_1.authenticate, async (req, res) => {
    try {
        const statut = req.query.statut;
        const ville = req.query.ville;
        // Mock: données géographiques avec filtres
        let etablissementsData = [];
        // Application des filtres (mock)
        if (statut || ville) {
            // Filtres appliqués ici quand on aura la vraie DB
            etablissementsData = [];
        }
        else {
            etablissementsData = [];
        }
        const mapData = {
            etablissements: etablissementsData,
            total: etablissementsData.length,
        };
        res.json({
            success: true,
            data: mapData,
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
 * GET /dashboard/top-musiques
 * Top des musiques les plus diffusées (avec filtres date et limit)
 */
router.get('/top-musiques', auth_1.authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // Validation du limit (5-50)
        const validLimit = Math.min(Math.max(limit, 5), 50);
        // Mock: top musiques
        const topMusiques = [];
        res.json({
            success: true,
            data: {
                classement: topMusiques,
                periode: {
                    startDate: startDate || null,
                    endDate: endDate || null
                },
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
 * GET /dashboard/top-artistes
 * Top des artistes les plus diffusés (avec filtres date et limit)
 */
router.get('/top-artistes', auth_1.authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // Validation du limit (5-50)
        const validLimit = Math.min(Math.max(limit, 5), 50);
        // Mock: top artistes
        const topArtistes = [];
        res.json({
            success: true,
            data: {
                classement: topArtistes,
                periode: {
                    startDate: startDate || null,
                    endDate: endDate || null
                },
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
 * GET /dashboard/evolution
 * Évolution temporelle des diffusions (avec filtres date et granularité)
 */
router.get('/evolution', auth_1.authenticate, async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const granularite = req.query.granularite || 'jour';
        // Validation de la granularité
        const validGranularite = ['jour', 'semaine', 'mois'].includes(granularite)
            ? granularite
            : 'jour';
        // Mock: évolution
        const evolution = {
            evolution: [],
            periode: {
                startDate: startDate || null,
                endDate: endDate || null,
                granularite: validGranularite,
            },
        };
        res.json({
            success: true,
            data: evolution,
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
//# sourceMappingURL=dashboard.js.map