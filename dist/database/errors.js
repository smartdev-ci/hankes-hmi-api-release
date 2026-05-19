"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.NotFoundError = exports.DatabaseError = void 0;
exports.handlePrismaError = handlePrismaError;
exports.getPaginationOptions = getPaginationOptions;
const client_1 = require("@prisma/client");
/**
 * Classes d'erreurs personnalisées pour la base de données
 */
class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Gère les erreurs Prisma de manière centralisée
 */
function handlePrismaError(error) {
    // Erreur Prisma connue
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': // Unique constraint failed
                return {
                    status: 409,
                    message: 'Conflit: cette valeur existe déjà',
                    code: error.code,
                };
            case 'P2025': // Record not found
                return {
                    status: 404,
                    message: 'Ressource non trouvée',
                    code: error.code,
                };
            case 'P2003': // Foreign key constraint failed
                return {
                    status: 400,
                    message: 'Référence invalide',
                    code: error.code,
                };
            case 'P2014': // Relation violation
                return {
                    status: 400,
                    message: 'Violation de relation',
                    code: error.code,
                };
            case 'P2006': // Invalid value type
                return {
                    status: 400,
                    message: 'Type de valeur invalide',
                    code: error.code,
                };
            default:
                return {
                    status: 500,
                    message: 'Erreur de base de données',
                    code: error.code,
                };
        }
    }
    // Erreur de validation Prisma
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return {
            status: 400,
            message: 'Données invalides',
            code: 'VALIDATION_ERROR',
        };
    }
    // Erreur d'initialisation
    if (error instanceof client_1.Prisma.PrismaClientInitializationError) {
        return {
            status: 500,
            message: 'Configuration de base de données invalide',
            code: 'DB_CONFIG_ERROR',
        };
    }
    // Erreur RCU (Read Committed Uncommitted)
    if (error instanceof client_1.Prisma.PrismaClientRustPanicError) {
        return {
            status: 500,
            message: 'Erreur interne du moteur de base de données',
            code: 'DB_ENGINE_ERROR',
        };
    }
    // Erreur inconnue
    return {
        status: 500,
        message: error.message || 'Erreur serveur inattendue',
        code: 'UNKNOWN_ERROR',
    };
}
/**
 * Calcule les options de pagination pour Prisma
 */
function getPaginationOptions(options) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;
    const take = limit;
    let orderBy;
    if (options.sortBy) {
        orderBy = {
            [options.sortBy]: options.sortOrder || 'desc',
        };
    }
    return { skip, take, orderBy };
}
//# sourceMappingURL=errors.js.map