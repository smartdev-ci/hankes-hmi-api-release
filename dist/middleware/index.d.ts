import { Request, Response, NextFunction } from 'express';
/**
 * Middleware de gestion des erreurs globales
 */
export declare const errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware pour les routes non trouvées (404)
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware de validation avec Zod
 */
export declare const validateRequest: (schema: any) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimiter: (windowMs?: number, maxRequests?: number) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware de logging des requêtes
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
