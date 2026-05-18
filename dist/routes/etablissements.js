"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../utils/validators");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
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
        let etablissements = await services_1.EtablissementService.findAll();
        // Filtres
        if (ville) {
            etablissements = etablissements.filter(e => e.ville === ville);
        }
        if (type) {
            etablissements = etablissements.filter(e => e.type === type);
        }
        if (search) {
            etablissements = etablissements.filter(e => e.nom.toLowerCase().includes(search.toLowerCase()) ||
                e.adresse.toLowerCase().includes(search.toLowerCase()));
        }
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = etablissements.slice(startIndex, endIndex);
        res.json({
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
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /etablissements
 * Créer un nouvel établissement (recenseur ou admin)
 * Si gerantEmail est fourni, crée un utilisateur gérant lié
 */
router.post('/', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.createEtablissementSchema), async (req, res) => {
    try {
        const { nom, type, adresse, ville, region, latitude, longitude, telephone, email, capacite, licence, gerantEmail, gerantNom, gerantTelephone } = req.body;
        const createurId = req.user.id;
        const createurRole = req.user.role;
        // Vérifier que le créateur est admin ou recenseur
        if (createurRole !== 'admin' && createurRole !== 'recenseur') {
            return res.status(403).json({
                success: false,
                error: 'Seuls les admins et recenseurs peuvent créer des établissements',
            });
        }
        let gerantId;
        // Si les informations du gérant sont fournies, créer l'utilisateur gérant
        if (gerantEmail && gerantNom && gerantTelephone) {
            // Vérifier si l'email existe déjà
            const existingUser = await services_1.UserService.findByEmail(gerantEmail);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Email du gérant déjà utilisé',
                });
            }
            // Vérifier si le téléphone existe déjà
            const existingPhone = await services_1.UserService.findByTelephone(gerantTelephone);
            if (existingPhone) {
                return res.status(409).json({
                    success: false,
                    error: 'Numéro de téléphone du gérant déjà utilisé',
                });
            }
            // Générer un mot de passe temporaire
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await (0, auth_1.hashPassword)(tempPassword);
            // Créer l'utilisateur gérant
            const gerant = await services_1.UserService.create({
                email: gerantEmail,
                password: hashedPassword,
                nom: gerantNom,
                telephone: gerantTelephone,
                role: 'etablissement',
                isVerified: false,
                isActive: true,
            });
            gerantId = gerant.id;
            // TODO: Envoyer email/SMS au gérant avec ses identifiants
            console.log(`Gérant créé: ${gerantEmail}, mot de passe temporaire: ${tempPassword}`);
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'Les informations du gérant (email, nom, téléphone) sont requises',
            });
        }
        // Créer l'établissement
        const etablissement = await services_1.EtablissementService.create({
            nom,
            type,
            adresse,
            ville,
            region,
            latitude: latitude || null,
            longitude: longitude || null,
            telephone,
            email: email || null,
            gerantId,
            capacite: capacite || null,
            licence: licence || null,
            creePar: createurId,
            roleCreateur: createurRole,
        });
        res.status(201).json({
            success: true,
            message: 'Établissement créé avec succès',
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
 * GET /etablissements/:etablissementId
 * Récupérer les détails d'un établissement
 */
router.get('/:etablissementId', auth_1.authenticate, async (req, res) => {
    try {
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
        }
        // Mise à jour
        const updatedEtablissement = await services_1.EtablissementService.update(etablissementId, req.body);
        res.json({
            success: true,
            data: updatedEtablissement,
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        await services_1.EtablissementService.delete(etablissementId);
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const etablissement = await services_1.EtablissementService.verifyEtablissement(etablissementId);
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const etablissement = await services_1.EtablissementService.toggleActiveStatus(etablissementId, false);
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
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
        const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const etablissement = await services_1.EtablissementService.findById(etablissementId);
        if (!etablissement) {
            return res.status(404).json({
                success: false,
                error: 'Établissement non trouvé',
            });
        }
        // Vérifier les permissions
        if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
            });
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