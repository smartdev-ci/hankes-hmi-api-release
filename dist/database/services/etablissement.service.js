"use strict";
/**
 * Service de gestion des établissements
 * Opérations CRUD sur la table etablissements via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtablissementService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class EtablissementService {
    static async findAll() {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                orderBy: { nom: 'asc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des établissements');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.etablissement.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'établissement ${id}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.etablissement.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.ValidationError('Un établissement avec ce gérant existe déjà');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de l\'établissement');
        }
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.etablissement.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Établissement ${id} non trouvé`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de l'établissement ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.etablissement.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de l'établissement ${id}`);
        }
    }
    static async findByVille(ville) {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                where: { ville },
                orderBy: { nom: 'asc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des établissements à ${ville}`);
        }
    }
    static async findByRegion(region) {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                where: { region },
                orderBy: { nom: 'asc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des établissements dans ${region}`);
        }
    }
    static async findByType(type) {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                where: { type },
                orderBy: { nom: 'asc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des établissements de type ${type}`);
        }
    }
    static async verifyEtablissement(id) {
        return this.update(id, { isVerified: true });
    }
    static async toggleActiveStatus(id, isActive) {
        return this.update(id, { isActive });
    }
    static async countActive() {
        try {
            const count = await index_1.prisma.etablissement.count({
                where: { isActive: true },
            });
            return count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du comptage des établissements actifs');
        }
    }
    /**
     * Récupérer les établissements créés par un utilisateur (admin ou recenseur)
     */
    static async findByCreateur(createurId) {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                where: { creePar: createurId },
                include: {
                    gerant: {
                        select: {
                            id: true,
                            nom: true,
                            email: true,
                            telephone: true,
                        },
                    },
                    createur: {
                        select: {
                            id: true,
                            nom: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération des établissements créés par ${createurId}`);
        }
    }
    static async getStatsByVille() {
        try {
            const data = await index_1.prisma.etablissement.findMany({
                where: { isActive: true },
                select: { ville: true },
            });
            const stats = new Map();
            data.forEach((etab) => {
                const count = stats.get(etab.ville) || 0;
                stats.set(etab.ville, count + 1);
            });
            return Array.from(stats.entries()).map(([ville, count]) => ({ ville, count }));
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la génération des statistiques par ville');
        }
    }
}
exports.EtablissementService = EtablissementService;
//# sourceMappingURL=etablissement.service.js.map