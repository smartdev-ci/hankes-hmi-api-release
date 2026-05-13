"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RapportService = void 0;
/**
 * Service de gestion des rapports
 */
const index_1 = require("../index");
const errors_1 = require("../errors");
class RapportService {
    static async findAll() {
        try {
            const data = await index_1.prisma.rapport.findMany({
                orderBy: { dateGeneration: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des rapports');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.rapport.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération du rapport ${id}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.rapport.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création du rapport');
        }
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.rapport.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Rapport ${id} non trouvé`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour du rapport ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.rapport.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression du rapport ${id}`);
        }
    }
}
exports.RapportService = RapportService;
//# sourceMappingURL=rapport.service.js.map