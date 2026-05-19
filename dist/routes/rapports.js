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
        const type = req.query.typeRapport;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        let rapports = await services_1.RapportService.findAll();
        if (req.user?.role !== 'admin') {
            rapports = rapports.filter((rapport) => rapport.generePar === req.user?.id);
        }
        if (type) {
            rapports = rapports.filter((rapport) => rapport.type === type);
        }
        if (startDate) {
            rapports = rapports.filter((rapport) => rapport.dateGeneration >= startDate);
        }
        if (endDate) {
            rapports = rapports.filter((rapport) => rapport.dateGeneration <= endDate);
        }
        const startIndex = (page - 1) * limit;
        res.json({
            success: true,
            data: rapports.slice(startIndex, startIndex + limit),
            pagination: {
                page,
                limit,
                total: rapports.length,
                totalPages: Math.ceil(rapports.length / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { typeRapport, type, dateDebut, dateFin, format, etablissementId, metadata, } = req.body;
        const rapport = await services_1.RapportService.create({
            type: type || typeRapport,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin),
            format: format || 'pdf',
            statut: 'en_cours',
            generePar: req.user.id,
            etablissementId: etablissementId || null,
            metadata: metadata || null,
        });
        res.status(202).json({
            success: true,
            message: 'Rapport en cours de generation',
            data: rapport,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:rapportId', auth_1.authenticate, async (req, res) => {
    try {
        const rapport = await services_1.RapportService.findById(getParam(req.params.rapportId));
        if (!rapport || (req.user?.role !== 'admin' && rapport.generePar !== req.user?.id)) {
            return res.status(404).json({ success: false, error: 'Rapport non trouve' });
        }
        return res.json({ success: true, data: rapport });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:rapportId/telecharger', auth_1.authenticate, async (req, res) => {
    try {
        const rapport = await services_1.RapportService.findById(getParam(req.params.rapportId));
        if (!rapport || (req.user?.role !== 'admin' && rapport.generePar !== req.user?.id)) {
            return res.status(404).json({ success: false, error: 'Rapport non trouve' });
        }
        if (rapport.statut !== 'termine' || !rapport.fichierUrl) {
            return res.status(409).json({ success: false, error: 'Rapport non pret au telechargement' });
        }
        return res.json({
            success: true,
            data: {
                url: rapport.fichierUrl,
                format: rapport.format,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=rapports.js.map