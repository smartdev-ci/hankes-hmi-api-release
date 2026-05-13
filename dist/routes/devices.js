"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
// Mock database
const devices = [];
/**
 * GET /devices
 * Lister les appareils
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const etablissementId = req.query.etablissementId;
        const actif = req.query.actif === 'true';
        let filtered = [...devices];
        // Filtres
        if (etablissementId) {
            filtered = filtered.filter(d => d.etablissementId === etablissementId);
        }
        if (actif !== undefined) {
            filtered = filtered.filter(d => d.isActive === actif);
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
 * POST /devices
 * Enregistrer un appareil
 */
router.post('/', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.createDeviceSchema), async (req, res) => {
    try {
        const { nom, type, etablissementId, metadata } = req.body;
        // Créer l'appareil
        const device = {
            id: require('uuid').v4(),
            nom,
            type,
            etablissementId,
            metadata,
            isActive: true,
            lastSeenAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            enregistrePar: req.user?.id,
        };
        devices.push(device);
        res.status(201).json({
            success: true,
            message: 'Appareil enregistré avec succès',
            device: {
                id: device.id,
                nom: device.nom,
                type: device.type,
                etablissementId: device.etablissementId,
                isActive: device.isActive,
                lastSeenAt: device.lastSeenAt,
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
 * PATCH /devices/:deviceId
 * Mettre à jour un appareil
 */
router.patch('/:deviceId', auth_1.authenticate, (0, middleware_1.validateRequest)(validators_1.updateDeviceSchema), async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { nom, metadata, isActive } = req.body;
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
            res.status(404).json({
                success: false,
                error: 'Appareil non trouvé',
            });
            return;
        }
        // Mettre à jour les champs
        if (nom !== undefined)
            device.nom = nom;
        if (metadata !== undefined)
            device.metadata = metadata;
        if (isActive !== undefined)
            device.isActive = isActive;
        device.updatedAt = new Date();
        device.lastSeenAt = new Date();
        res.json({
            success: true,
            message: 'Appareil mis à jour avec succès',
            device: {
                id: device.id,
                nom: device.nom,
                type: device.type,
                etablissementId: device.etablissementId,
                isActive: device.isActive,
                lastSeenAt: device.lastSeenAt,
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
 * DELETE /devices/:deviceId
 * Désactiver un appareil
 */
router.delete('/:deviceId', auth_1.authenticate, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
            res.status(404).json({
                success: false,
                error: 'Appareil non trouvé',
            });
            return;
        }
        // Désactiver l'appareil (soft delete)
        device.isActive = false;
        device.updatedAt = new Date();
        res.json({
            success: true,
            message: 'Appareil désactivé avec succès',
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
//# sourceMappingURL=devices.js.map