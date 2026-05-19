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
        const etablissementId = req.query.etablissementId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const artiste = req.query.artiste;
        let diffusions = etablissementId
            ? await services_1.DiffusionService.findByEtablissement(etablissementId)
            : await services_1.DiffusionService.findAll();
        if (startDate) {
            diffusions = diffusions.filter((d) => d.playedAt >= startDate);
        }
        if (endDate) {
            diffusions = diffusions.filter((d) => d.playedAt <= endDate);
        }
        if (artiste) {
            diffusions = diffusions.filter((d) => d.artiste.toLowerCase().includes(artiste.toLowerCase()));
        }
        const startIndex = (page - 1) * limit;
        res.json({
            success: true,
            data: diffusions.slice(startIndex, startIndex + limit),
            pagination: {
                page,
                limit,
                total: diffusions.length,
                totalPages: Math.ceil(diffusions.length / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:diffusionId', auth_1.authenticate, async (req, res) => {
    try {
        const diffusion = await services_1.DiffusionService.findById(getParam(req.params.diffusionId));
        if (!diffusion) {
            return res.status(404).json({ success: false, error: 'Diffusion non trouvee' });
        }
        return res.json({ success: true, data: diffusion });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=diffusions.js.map