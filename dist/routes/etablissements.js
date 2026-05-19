"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../utils/validators");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
const getParam = (value) => Array.isArray(value) ? value[0] : value;
const sendRouteError = (res, error) => {
    const statusByName = {
        ValidationError: 400,
        NotFoundError: 404,
    };
    return res.status(statusByName[error?.name] || 500).json({
        success: false,
        error: error.message,
    });
};
const canManageEtablissement = (user, etablissement) => {
    if (!user)
        return false;
    if (user.role === 'admin')
        return true;
    if (etablissement.gerantId === user.id)
        return true;
    return user.role === 'recenseur' && etablissement.creePar === user.id;
};
/**
 * GET /etablissements
 * Liste des etablissements avec filtres simples.
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const ville = req.query.ville;
        const type = req.query.type;
        const search = req.query.search;
        let etablissements = await services_1.EtablissementService.findAll();
        if (req.user?.role === 'recenseur') {
            etablissements = etablissements.filter((e) => e.creePar === req.user?.id);
        }
        if (ville) {
            etablissements = etablissements.filter((e) => e.ville === ville);
        }
        if (type) {
            etablissements = etablissements.filter((e) => e.type === type);
        }
        if (search) {
            const normalizedSearch = search.toLowerCase();
            etablissements = etablissements.filter((e) => e.nom.toLowerCase().includes(normalizedSearch) ||
                e.adresse.toLowerCase().includes(normalizedSearch));
        }
        const startIndex = (page - 1) * limit;
        const paginatedResults = etablissements.slice(startIndex, startIndex + limit);
        return res.json({
            success: true,
            data: paginatedResults,
            pagination: {
                page,
                limit,
                total: etablissements.length,
                totalPages: Math.ceil(etablissements.length / limit),
            },
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * POST /etablissements
 * Cree un etablissement avec un gerant existant ou un gerant cree dans la meme transaction.
 */
router.post('/', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.createEtablissementSchema), async (req, res) => {
    try {
        const createurRole = req.user.role;
        if (createurRole !== 'admin' && createurRole !== 'recenseur') {
            return res.status(403).json({
                success: false,
                error: 'Seuls les admins et recenseurs peuvent creer des etablissements',
            });
        }
        const { nom, type, adresse, ville, region, latitude, longitude, telephone, email, capacite, licence, gerantId, gerantEmail, gerantNom, gerantTelephone, gerantPassword, } = req.body;
        const hashedGerantPassword = gerantPassword ? await (0, auth_1.hashPassword)(gerantPassword) : undefined;
        const etablissement = await services_1.EtablissementService.createWithGerant({
            createurId: req.user.id,
            createurRole: createurRole,
            gerantId,
            gerant: gerantEmail && gerantNom && gerantTelephone && hashedGerantPassword
                ? {
                    email: gerantEmail,
                    password: hashedGerantPassword,
                    nom: gerantNom,
                    telephone: gerantTelephone,
                    isVerified: false,
                    isActive: true,
                }
                : undefined,
            etablissement: {
                nom,
                type,
                adresse,
                ville,
                region,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                telephone,
                email: email ?? null,
                capacite: capacite ?? null,
                licence: licence ?? null,
            },
        });
        return res.status(201).json({
            success: true,
            message: 'Etablissement cree avec succes',
            data: etablissement,
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * GET /etablissements/:etablissementId/users
 * Liste les utilisateurs lies a un etablissement, hors gerant.
 */
router.get('/:etablissementId/users', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        const users = await services_1.EtablissementService.findUsers(etablissementId);
        return res.json({ success: true, data: users, total: users.length });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * POST /etablissements/:etablissementId/users
 * Associe un utilisateur existant a un etablissement.
 */
router.post('/:etablissementId/users', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.assignEtablissementUserSchema), async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const { userId, role } = req.body;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        const association = await services_1.EtablissementService.addUserToEtablissement(etablissementId, userId, role, req.user.id);
        return res.status(201).json({
            success: true,
            message: 'Utilisateur lie a l etablissement avec succes',
            data: association,
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * DELETE /etablissements/:etablissementId/users/:userId
 * Retire un utilisateur lie a un etablissement.
 */
router.delete('/:etablissementId/users/:userId', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const userId = getParam(req.params.userId);
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        await services_1.EtablissementService.removeUser(etablissementId, userId);
        return res.json({ success: true, message: 'Utilisateur retire de l etablissement' });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * GET /etablissements/:etablissementId
 * Recupere les details d'un etablissement.
 */
router.get('/:etablissementId', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        return res.json({ success: true, data: etablissement });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
/**
 * PUT /etablissements/:etablissementId
 */
router.put('/:etablissementId', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.updateEtablissementSchema), async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        const { nom, type, adresse, ville, region, latitude, longitude, telephone, email, capacite, licence, } = req.body;
        const updatedEtablissement = await services_1.EtablissementService.update(etablissementId, {
            nom,
            type,
            adresse,
            ville,
            region,
            latitude,
            longitude,
            telephone,
            email,
            capacite,
            licence,
        });
        return res.json({
            success: true,
            message: 'Etablissement mis a jour avec succes',
            data: updatedEtablissement,
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
router.delete('/:etablissementId', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        await services_1.EtablissementService.delete(getParam(req.params.etablissementId));
        return res.json({ success: true, message: 'Etablissement supprime avec succes' });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
router.post('/:etablissementId/valider', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const etablissement = await services_1.EtablissementService.verifyEtablissement(getParam(req.params.etablissementId));
        return res.json({
            success: true,
            message: 'Etablissement valide avec succes',
            data: etablissement,
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
router.post('/:etablissementId/suspendre', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const etablissement = await services_1.EtablissementService.toggleActiveStatus(getParam(req.params.etablissementId), false);
        return res.json({
            success: true,
            message: 'Etablissement suspendu avec succes',
            data: etablissement,
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
router.get('/:etablissementId/stats', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        const diffusions = startDate && endDate
            ? await services_1.DiffusionService.findByDateRange(etablissementId, startDate, endDate)
            : await services_1.DiffusionService.findByEtablissement(etablissementId);
        const uniqueMusiques = new Set(diffusions.map((d) => d.musicId));
        const uniqueArtistes = new Set(diffusions.map((d) => d.artiste.toLowerCase()));
        const dureeTotaleSecondes = diffusions.reduce((sum, d) => sum + d.duree, 0);
        return res.json({
            success: true,
            data: {
                etablissementId,
                periode: { startDate, endDate },
                totalDiffusions: diffusions.length,
                musiquesUnique: uniqueMusiques.size,
                artistesUnique: uniqueArtistes.size,
                dureeTotaleHeures: Number((dureeTotaleSecondes / 3600).toFixed(2)),
            },
        });
    }
    catch (error) {
        return sendRouteError(res, error);
    }
});
router.get('/:etablissementId/diffusions', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = getParam(req.params.etablissementId);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
        }
        if (!canManageEtablissement(req.user, etablissement)) {
            return res.status(403).json({ success: false, error: 'Acces non autorise' });
        }
        const diffusions = await services_1.DiffusionService.findByEtablissement(etablissementId);
        const startIndex = (page - 1) * limit;
        return res.json({
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
        return sendRouteError(res, error);
    }
});
exports.default = router;
//# sourceMappingURL=etablissements.js.map