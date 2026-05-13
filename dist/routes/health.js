"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * GET /v1/health
 * Santé de l'API
 */
router.get('/', async (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '2.0.0',
        },
    });
});
/**
 * GET /v1/health/database
 * Vérification de la connexion à la base de données
 */
router.get('/database', async (req, res) => {
    try {
        // TODO: Vérifier la connexion à PostgreSQL avec Prisma
        const connected = true; // Mock pour l'instant
        res.json({
            success: true,
            data: {
                connected,
                database: 'postgresql',
                status: connected ? 'connected' : 'disconnected',
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            error: 'Database connection failed',
            details: error.message,
        });
    }
});
/**
 * GET /v1/health/ready
 * Vérification de readiness (dépendances prêtes)
 */
router.get('/ready', async (req, res) => {
    try {
        // TODO: Vérifier la connexion à PostgreSQL et Redis
        res.json({
            success: true,
            status: 'ready',
            checks: {
                database: 'ok',
                redis: 'ok',
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            status: 'not_ready',
            error: error.message,
        });
    }
});
/**
 * GET /v1/metrics
 * Métriques Prometheus
 */
router.get('/metrics', async (req, res) => {
    // Format Prometheus
    const metrics = `
# HELP hmis_api_requests_total Total number of API requests
# TYPE hmis_api_requests_total counter
hmis_api_requests_total 0

# HELP hmis_api_request_duration_seconds Request duration in seconds
# TYPE hmis_api_request_duration_seconds histogram
hmis_api_request_duration_seconds_bucket{le="0.1"} 0
hmis_api_request_duration_seconds_bucket{le="0.5"} 0
hmis_api_request_duration_seconds_bucket{le="1"} 0
hmis_api_request_duration_seconds_bucket{le="+Inf"} 0
hmis_api_request_duration_seconds_sum 0
hmis_api_request_duration_seconds_count 0

# HELP hmis_api_active_connections Number of active connections
# TYPE hmis_api_active_connections gauge
hmis_api_active_connections 0
`;
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});
exports.default = router;
//# sourceMappingURL=health.js.map