"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_1 = require("../database/services");
const router = (0, express_1.Router)();
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
router.get('/database', async (req, res) => {
    try {
        const check = await services_1.SupabasePrismaService.checkConnection();
        res.json({
            success: true,
            data: {
                ...check,
                status: check.connected ? 'connected' : 'disconnected',
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
router.get('/ready', async (req, res) => {
    try {
        const database = await services_1.SupabasePrismaService.checkConnection();
        res.json({
            success: true,
            status: 'ready',
            checks: {
                database: database.connected ? 'ok' : 'failed',
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
router.get('/metrics', async (req, res) => {
    const metrics = `
# HELP hmis_api_process_uptime_seconds Process uptime in seconds
# TYPE hmis_api_process_uptime_seconds gauge
hmis_api_process_uptime_seconds ${Math.floor(process.uptime())}
`;
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});
exports.default = router;
//# sourceMappingURL=health.js.map