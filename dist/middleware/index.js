"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.rateLimiter = exports.validateRequest = exports.notFoundHandler = exports.errorHandler = void 0;
/**
 * Middleware de gestion des erreurs globales
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Une erreur est survenue'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
/**
 * Middleware pour les routes non trouvées (404)
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} non trouvée`,
    });
};
exports.notFoundHandler = notFoundHandler;
/**
 * Middleware de validation avec Zod
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error.errors) {
                res.status(400).json({
                    success: false,
                    error: 'Validation échouée',
                    errors: error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
/**
 * Middleware de rate limiting simple
 */
const requestCounts = new Map();
const rateLimiter = (windowMs = 60000, maxRequests = 100) => {
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const record = requestCounts.get(ip);
        if (!record || now > record.resetTime) {
            requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        if (record.count >= maxRequests) {
            res.status(429).json({
                success: false,
                error: 'Trop de requêtes, veuillez réessayer plus tard',
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            });
            return;
        }
        record.count++;
        next();
    };
};
exports.rateLimiter = rateLimiter;
/**
 * Middleware de logging des requêtes
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=index.js.map