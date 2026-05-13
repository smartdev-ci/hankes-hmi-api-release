"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Mock database
const diffusions = [];
/**
 * GET /diffusions
 * Liste des diffusions (avec filtres et pagination)
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const etablissementId = req.query.etablissementId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const artiste = req.query.artiste;
        const isrc = req.query.isrc;
        const sourceApi = req.query.sourceApi;
        let filtered = [...diffusions];
        // Filtres
        if (etablissementId) {
            filtered = filtered.filter(d => d.etablissementId === etablissementId);
        }
        if (startDate) {
            filtered = filtered.filter(d => new Date(d.timestampDiffusion) >= new Date(startDate));
        }
        if (endDate) {
            filtered = filtered.filter(d => new Date(d.timestampDiffusion) <= new Date(endDate));
        }
        if (artiste) {
            filtered = filtered.filter(d => d.artiste.toLowerCase().includes(artiste.toLowerCase()));
        }
        if (isrc) {
            filtered = filtered.filter(d => d.isrc === isrc);
        }
        if (sourceApi) {
            filtered = filtered.filter(d => d.sourceApi === sourceApi);
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
 * GET /diffusions/:diffusionId
 * Récupérer les détails d'une diffusion
 */
router.get('/:diffusionId', auth_1.authenticate, async (req, res) => {
    try {
        const { diffusionId } = req.params;
        const diffusion = diffusions.find(d => d.id === diffusionId);
        if (!diffusion) {
            res.status(404).json({
                success: false,
                error: 'Diffusion non trouvée',
            });
            return;
        }
        res.json({
            success: true,
            data: diffusion,
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
//# sourceMappingURL=diffusions.js.map