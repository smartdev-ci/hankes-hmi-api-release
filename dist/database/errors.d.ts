import { Prisma } from '@prisma/client';
/**
 * Classes d'erreurs personnalisées pour la base de données
 */
export declare class DatabaseError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * Gère les erreurs Prisma de manière centralisée
 */
export declare function handlePrismaError(error: any): {
    status: number;
    message: string;
    code?: string;
};
/**
 * Options de pagination standardisées
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Résultat paginé standardisé
 */
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
/**
 * Calcule les options de pagination pour Prisma
 */
export declare function getPaginationOptions(options: PaginationOptions): {
    skip: number;
    take: number;
    orderBy?: Prisma.Sql | Record<string, any>;
};
