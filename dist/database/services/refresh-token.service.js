"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenService = void 0;
/**
 * Service de gestion des refresh tokens
 */
const index_1 = require("../index");
const errors_1 = require("../errors");
class RefreshTokenService {
    static async create(data) {
        try {
            const result = await index_1.prisma.refreshToken.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création du refresh token');
        }
    }
    static async findByTokenHash(tokenHash) {
        try {
            const result = await index_1.prisma.refreshToken.findFirst({
                where: {
                    tokenHash,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
            return result || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération du refresh token');
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.refreshToken.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la suppression du refresh token');
        }
    }
    static async deleteExpired() {
        try {
            await index_1.prisma.refreshToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la suppression des refresh tokens expirés');
        }
    }
    static async findByUserId(userId) {
        try {
            const result = await index_1.prisma.refreshToken.findMany({
                where: {
                    userId,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des refresh tokens');
        }
    }
    static async revokeUserTokens(userId) {
        try {
            await index_1.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la révocation des refresh tokens');
        }
    }
}
exports.RefreshTokenService = RefreshTokenService;
//# sourceMappingURL=refresh-token.service.js.map