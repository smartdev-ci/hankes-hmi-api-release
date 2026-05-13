"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
// Mock database
const etablissements = [];
/**
 * GET /etablissements
 * Liste des établissements (avec pagination et filtres)
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const ville = req.query.ville;
        const type = req.query.type;
        const search = req.query.search;
        let filtered = [...etablissements];
        // Filtres
        if (ville) {
            filtered = filtered.filter(e => e.ville === ville);
        }
        if (type) {
            filtered = filtered.filter(e => e.type === type);
        }
        if (search) {
            filtered = filtered.filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) ||
                e.adresse.toLowerCase().includes(search.toLowerCase()));
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
 * POST /etablissements
 * Créer un nouvel établissement
 */
router.post('/', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.createEtablissementSchema), async (req, res) => {
    try {
        const etablissement = {
            id: require('uuid').v4(),
            ...req.body,
            gerantId: req.user?.id,
            isActive: true,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        etablissements.push(etablissement);
        // Mettre à jour l'utilisateur avec l'ID de l'établissement
        // (dans une vraie implémentation, mettre à jour la BDD)
        res.status(201).json({
            success: true,
            data: etablissement,
            message: 'Établissement créé avec succès',
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
 * GET /etablissements/:etablissementId
 * Récupérer les détails d'un établissement
 */
router.get('/:etablissementId', auth_1.authenticate, async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
            return;
        }
        res.json({
            success: true,
            data: etablissement,
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
 * PUT /etablissements/:etablissementId
 * Mettre à jour un établissement
 */
router.put('/:etablissementId', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.updateEtablissementSchema), async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
            return;
        }
        // Mise à jour
        Object.assign(etablissement, {
            ...req.body,
            updatedAt: new Date(),
        });
        res.json({
            success: true,
            data: etablissement,
            message: 'Établissement mis à jour avec succès',
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
 * DELETE /etablissements/:etablissementId
 * Supprimer un établissement (admin uniquement)
 */
router.delete('/:etablissementId', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const index = etablissements.findIndex(e => e.id === etablissementId);
        if (index === -1) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        etablissements.splice(index, 1);
        res.json({
            success: true,
            message: 'Établissement supprimé avec succès',
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
 * POST /etablissements/:etablissementId/valider
 * Valider un établissement (admin uniquement)
 */
router.post('/:etablissementId/valider', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        etablissement.isVerified = true;
        etablissement.updatedAt = new Date();
        res.json({
            success: true,
            data: etablissement,
            message: 'Établissement validé avec succès',
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
 * POST /etablissements/:etablissementId/suspendre
 * Suspendre un établissement (admin uniquement)
 */
router.post('/:etablissementId/suspendre', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const { motif } = req.body;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        etablissement.isActive = false;
        etablissement.updatedAt = new Date();
        // TODO: Envoyer notification au gérant
        res.json({
            success: true,
            data: etablissement,
            message: 'Établissement suspendu avec succès',
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
 * GET /etablissements/:etablissementId/stats
 * Statistiques d'un établissement
 */
router.get('/:etablissementId/stats', auth_1.authenticate, async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
            return;
        }
        // Stats mockées
        const stats = {
            etablissementId,
            periode: { startDate, endDate },
            totalDiffusions: 0,
            musiquesUnique: 0,
            artistesUnique: 0,
            dureeTotaleHeures: 0,
            topMusiques: [],
            topArtistes: [],
            evolutionParJour: [],
        };
        res.json({
            success: true,
            data: stats,
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
 * GET /etablissements/:etablissementId/diffusions
 * Historique des diffusions d'un établissement
 */
router.get('/:etablissementId/diffusions', auth_1.authenticate, async (req, res) => {
    try {
        const { etablissementId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const etablissement = etablissements.find(e => e.id === etablissementId);
        if (!etablissement) {
            res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
            return;
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
            return;
        }
        // Mock: retourner liste vide
        res.json({
            success: true,
            data: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
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
exports.default = router;
//# sourceMappingURL=etablissements.js.map