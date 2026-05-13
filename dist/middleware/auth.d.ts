import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: UserRole;
            };
        }
    }
}
/**
 * Middleware d'authentification JWT
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware de vérification de rôle
 */
export declare const authorize: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Hashage de mot de passe avec bcrypt
 */
export declare const hashPassword: (password: string) => Promise<string>;
/**
 * Vérification de mot de passe
 */
export declare const verifyPassword: (password: string, hashedPassword: string) => Promise<boolean>;
/**
 * Génération de token JWT
 */
export declare const generateAccessToken: (payload: JwtPayload) => string;
/**
 * Génération de refresh token
 */
export declare const generateRefreshToken: (payload: JwtPayload) => string;
/**
 * Validation du format de téléphone (E.164)
 */
export declare const isValidPhone: (phone: string) => boolean;
/**
 * Validation du format d'email
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Génération de code OTP à 6 chiffres
 */
export declare const generateOTP: () => string;
