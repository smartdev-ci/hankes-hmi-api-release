"use strict";
/**
 * Service de gestion des OTP
 * Opérations CRUD sur la table otps via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class OTPService {
    static async create(data) {
        try {
            const result = await index_1.prisma.oTP.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création du OTP');
        }
    }
    static async findByPhoneAndCode(phone, code) {
        try {
            const data = await index_1.prisma.oTP.findFirst({
                where: {
                    phone,
                    code,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la vérification du OTP');
        }
    }
    static async markAsUsed(id) {
        try {
            const result = await index_1.prisma.oTP.update({
                where: { id },
                data: { isUsed: true },
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.ValidationError('OTP non trouvé');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la validation du OTP');
        }
    }
    static async deleteExpired() {
        try {
            await index_1.prisma.oTP.deleteMany({
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
            throw new errors_1.DatabaseError('Erreur lors de la suppression des OTP expirés');
        }
    }
    static async findValidOTP(phone, code) {
        return OTPService.findByPhoneAndCode(phone, code);
    }
    static async delete(id) {
        try {
            await index_1.prisma.oTP.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.ValidationError('OTP non trouvé');
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.ValidationError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la suppression du OTP');
        }
    }
}
exports.OTPService = OTPService;
//# sourceMappingURL=otp.service.js.map