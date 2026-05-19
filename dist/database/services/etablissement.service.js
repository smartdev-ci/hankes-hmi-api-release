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
    static async createWithGerant(input) {
        try {
            if (!['admin', 'recenseur'].includes(input.createurRole)) {
                throw new errors_1.ValidationError('Seuls les admins et recenseurs peuvent creer des etablissements');
            }
            if (!input.gerantId && !input.gerant) {
                throw new errors_1.ValidationError('Un gerant existant ou les informations du gerant sont requis');
            }
            return await index_1.prisma.$transaction(async (tx) => {
                let gerantId = input.gerantId;
                if (gerantId) {
                    const gerant = await tx.user.findUnique({ where: { id: gerantId } });
                    if (!gerant) {
                        throw new errors_1.ValidationError('Gerant introuvable');
                    }
                    if (gerant.role !== 'etablissement') {
                        throw new errors_1.ValidationError('Le gerant doit etre un utilisateur avec le role etablissement');
                    }
                    const existingEtablissement = await tx.etablissement.findUnique({
                        where: { gerantId },
                    });
                    if (existingEtablissement) {
                        throw new errors_1.ValidationError('Cet utilisateur est deja gerant d un etablissement');
                    }
                }
                else if (input.gerant) {
                    const gerant = await tx.user.create({
                        data: {
                            email: input.gerant.email,
                            password: input.gerant.password,
                            nom: input.gerant.nom,
                            telephone: input.gerant.telephone,
                            role: 'etablissement',
                            isVerified: input.gerant.isVerified ?? false,
                            isActive: input.gerant.isActive ?? true,
                            etablissementId: null,
                        },
                    });
                    gerantId = gerant.id;
                }
                const etablissement = await tx.etablissement.create({
                    data: {
                        ...input.etablissement,
                        gerantId: gerantId,
                        creePar: input.createurId,
                        roleCreateur: input.createurRole,
                    },
                    include: {
                        gerant: {
                            select: {
                                id: true,
                                email: true,
                                nom: true,
                                telephone: true,
                                role: true,
                            },
                        },
                        createur: {
                            select: {
                                id: true,
                                email: true,
                                nom: true,
                                role: true,
                            },
                        },
                    },
                });
                await tx.user.update({
                    where: { id: gerantId },
                    data: { etablissementId: etablissement.id },
                });
                return etablissement;
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.ValidationError('Email, telephone ou gerant deja utilise');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la creation transactionnelle de l etablissement');
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
    static async addUserToEtablissement(etablissementId, userId, role, assignePar) {
        try {
            const [etablissement, user, assigneur] = await Promise.all([
                index_1.prisma.etablissement.findUnique({ where: { id: etablissementId } }),
                index_1.prisma.user.findUnique({ where: { id: userId } }),
                index_1.prisma.user.findUnique({ where: { id: assignePar } }),
            ]);
            if (!etablissement)
                throw new errors_1.NotFoundError('Etablissement non trouve');
            if (!user)
                throw new errors_1.NotFoundError('Utilisateur non trouve');
            if (!assigneur)
                throw new errors_1.NotFoundError('Utilisateur assignateur non trouve');
            if (etablissement.gerantId === userId) {
                throw new errors_1.ValidationError('Le gerant est deja lie a cet etablissement');
            }
            return await index_1.prisma.etablissementUser.create({
                data: {
                    etablissementId,
                    userId,
                    role,
                    assignePar,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nom: true,
                            email: true,
                            telephone: true,
                            role: true,
                            isActive: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.ValidationError('Cet utilisateur est deja lie a cet etablissement');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de l association utilisateur-etablissement');
        }
    }
    static async findUsers(etablissementId) {
        try {
            return await index_1.prisma.etablissementUser.findMany({
                where: { etablissementId },
                include: {
                    user: {
                        select: {
                            id: true,
                            nom: true,
                            email: true,
                            telephone: true,
                            role: true,
                            isActive: true,
                        },
                    },
                    assigne: {
                        select: {
                            id: true,
                            nom: true,
                            email: true,
                        },
                    },
                },
                orderBy: { assigneAt: 'desc' },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la recuperation des utilisateurs lies');
        }
    }
    static async removeUser(etablissementId, userId) {
        try {
            await index_1.prisma.etablissementUser.delete({
                where: {
                    etablissementId_userId: {
                        etablissementId,
                        userId,
                    },
                },
            });
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Association utilisateur-etablissement non trouvee');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du retrait de l utilisateur lie');
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
                const ville = etab.ville ?? '';
                const count = stats.get(ville) || 0;
                stats.set(ville, count + 1);
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