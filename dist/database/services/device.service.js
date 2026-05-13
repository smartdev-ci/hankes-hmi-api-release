"use strict";
/**
 * Service de gestion des appareils
 * Opérations CRUD sur la table devices via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class DeviceService {
    static async findAll() {
        try {
            const data = await index_1.prisma.device.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des appareils');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.device.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'appareil ${id}`);
        }
    }
    static async findByDeviceId(deviceId) {
        try {
            const data = await index_1.prisma.device.findUnique({
                where: { deviceId },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de l'appareil ${deviceId}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.device.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de l\'appareil');
        }
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.device.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Appareil ${id} non trouvé`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de l'appareil ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.device.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de l'appareil ${id}`);
        }
    }
    static async updateLastActive(id) {
        return this.update(id, { lastActiveAt: new Date() });
    }
}
exports.DeviceService = DeviceService;
//# sourceMappingURL=device.service.js.map