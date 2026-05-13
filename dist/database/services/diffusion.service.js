"use strict";
/**
 * Service de gestion des diffusions
 * Opérations CRUD sur la table diffusions via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffusionService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class DiffusionService {
    static async findAll() {
        try {
            const data = await index_1.prisma.diffusion.findMany({
                orderBy: { playedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des diffusions');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.diffusion.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de la diffusion ${id}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.diffusion.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de la diffusion');
        }
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.diffusion.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Diffusion ${id} non trouvée`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de la diffusion ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.diffusion.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de la diffusion ${id}`);
        }
    }
    static async findByEtablissement(etablissementId) {
        try {
            const data = await index_1.prisma.diffusion.findMany({
                where: { etablissementId },
                orderBy: { playedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération des diffusions pour l'établissement ${etablissementId}`);
        }
    }
    static async findByDateRange(etablissementId, startDate, endDate) {
        try {
            const data = await index_1.prisma.diffusion.findMany({
                where: {
                    etablissementId,
                    playedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                orderBy: { playedAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des diffusions par période');
        }
    }
    static async count() {
        try {
            const count = await index_1.prisma.diffusion.count();
            return count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du comptage des diffusions');
        }
    }
}
exports.DiffusionService = DiffusionService;
//# sourceMappingURL=diffusion.service.js.map