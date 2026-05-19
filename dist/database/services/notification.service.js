"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
/**
 * Service de gestion des notifications
 */
const index_1 = require("../index");
const errors_1 = require("../errors");
class NotificationService {
    static async findAll() {
        try {
            const data = await index_1.prisma.notification.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des notifications');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.notification.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de la notification ${id}`);
        }
    }
    static async findByUser(userId) {
        try {
            const data = await index_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la rÃ©cupÃ©ration des notifications de l'utilisateur ${userId}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.notification.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de la notification');
        }
    }
    static async markAsRead(id) {
        try {
            const result = await index_1.prisma.notification.update({
                where: { id },
                data: {
                    estLue: true,
                    dateLecture: new Date(),
                },
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Notification ${id} non trouvée`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la marque comme lue');
        }
    }
    static async markAllAsRead(userId) {
        try {
            const result = await index_1.prisma.notification.updateMany({
                where: {
                    userId,
                    estLue: false,
                },
                data: {
                    estLue: true,
                    dateLecture: new Date(),
                },
            });
            return result.count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la marque globale comme lue');
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.notification.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de la notification ${id}`);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map