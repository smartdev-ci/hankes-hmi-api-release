"use strict";
/**
 * Service de gestion des utilisateurs
 * Opérations CRUD sur la table users via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class UserService {
    static async findAll() {
        try {
            const data = await index_1.prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des utilisateurs');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.user.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'utilisateur ${id}`);
        }
    }
    static async findByEmail(email) {
        try {
            const data = await index_1.prisma.user.findUnique({
                where: { email },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'utilisateur avec email ${email}`);
        }
    }
    static async create(userData) {
        try {
            const data = await index_1.prisma.user.create({
                data: userData,
            });
            return data;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.ValidationError('Un utilisateur avec cet email existe déjà');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de l\'utilisateur');
        }
    }
    static async update(id, userData) {
        try {
            const data = await index_1.prisma.user.update({
                where: { id },
                data: userData,
            });
            return data;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Utilisateur ${id} non trouvé`);
            }
            if (error.code === 'P2002') {
                throw new errors_1.ValidationError('Un utilisateur avec cet email existe déjà');
            }
            if (error instanceof errors_1.DatabaseError ||
                error instanceof errors_1.NotFoundError ||
                error instanceof errors_1.ValidationError) {
                throw error;
            }
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de l'utilisateur ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.user.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de l'utilisateur ${id}`);
        }
    }
    static async verifyUser(id) {
        return this.update(id, { isVerified: true });
    }
    static async toggleActiveStatus(id, isActive) {
        return this.update(id, { isActive });
    }
    static async findByRole(role) {
        try {
            const data = await index_1.prisma.user.findMany({
                where: { role },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des utilisateurs avec le rôle ${role}`);
        }
    }
    static async count() {
        try {
            const count = await index_1.prisma.user.count();
            return count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du comptage des utilisateurs');
        }
    }
    static async findByTelephone(telephone) {
        try {
            const data = await index_1.prisma.user.findFirst({
                where: { telephone },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'utilisateur avec le téléphone ${telephone}`);
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map