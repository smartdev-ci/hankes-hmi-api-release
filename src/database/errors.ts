import { Prisma } from '@prisma/client';

/**
 * Classes d'erreurs personnalisées pour la base de données
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Gère les erreurs Prisma de manière centralisée
 */
export function handlePrismaError(error: any): { 
  status: number; 
  message: string;
  code?: string;
} {
  // Erreur Prisma connue
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Données invalides',
      code: 'VALIDATION_ERROR',
    };
  }
  
  // Erreur d'initialisation
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 500,
      message: 'Configuration de base de données invalide',
      code: 'DB_CONFIG_ERROR',
    };
  }
  
  // Erreur RCU (Read Committed Uncommitted)
  if (error instanceof Prisma.PrismaClientRustPanicError) {
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
export function getPaginationOptions(
  options: PaginationOptions
): {
  skip: number;
  take: number;
  orderBy?: Prisma.Sql | Record<string, any>;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  
  const skip = (page - 1) * limit;
  const take = limit;
  
  let orderBy: Record<string, any> | undefined;
  if (options.sortBy) {
    orderBy = {
      [options.sortBy]: options.sortOrder || 'desc',
    };
  }
  
  return { skip, take, orderBy };
}
