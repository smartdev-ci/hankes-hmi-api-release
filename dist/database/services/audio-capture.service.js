"use strict";
/**
 * Service de gestion des captures audio
 * Opérations CRUD sur la table audio_captures via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioCaptureService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class AudioCaptureService {
    static async findAll() {
        try {
            const data = await index_1.prisma.audioCapture.findMany({
                orderBy: { capturedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des captures audio');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.audioCapture.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de la capture ${id}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.audioCapture.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de la capture audio');
        }
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.audioCapture.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Capture audio ${id} non trouvée`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de la capture ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.audioCapture.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de la capture ${id}`);
        }
    }
    static async findByEtablissement(etablissementId) {
        try {
            const data = await index_1.prisma.audioCapture.findMany({
                where: { etablissementId },
                orderBy: { capturedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération des captures pour l'établissement ${etablissementId}`);
        }
    }
    static async findByUser(userId) {
        try {
            const data = await index_1.prisma.audioCapture.findMany({
                where: { userId },
                orderBy: { capturedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération des captures pour l'utilisateur ${userId}`);
        }
    }
    static async findByStatut(statut) {
        try {
            const data = await index_1.prisma.audioCapture.findMany({
                where: { statut },
                orderBy: { capturedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération des captures avec le statut ${statut}`);
        }
    }
    static async markAsProcessed(id) {
        return this.update(id, {
            statut: 'identified',
            processedAt: new Date(),
        });
    }
    static async markAsFailed(id) {
        return this.update(id, {
            statut: 'failed',
            processedAt: new Date(),
        });
    }
    static async countPending() {
        try {
            const count = await index_1.prisma.audioCapture.count({
                where: { statut: 'pending' },
            });
            return count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du comptage des captures en attente');
        }
    }
    static async getRecentForProcessing(limit = 10) {
        try {
            const data = await index_1.prisma.audioCapture.findMany({
                where: { statut: 'pending' },
                orderBy: { capturedAt: 'asc' },
                take: limit,
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des captures pour traitement');
        }
    }
}
exports.AudioCaptureService = AudioCaptureService;
//# sourceMappingURL=audio-capture.service.js.map