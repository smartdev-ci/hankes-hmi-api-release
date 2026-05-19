"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
describe('Health API', () => {
    describe('GET /v1/health', () => {
        it('devrait retourner le statut OK de l\'API', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/v1/health')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.status).toBe('OK');
            expect(response.body.data.timestamp).toBeDefined();
        });
        it('devrait inclure les informations de version', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/v1/health')
                .expect(200);
            expect(response.body.data.version).toMatch(/\d+\.\d+\.\d+/);
            expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
        });
    });
    describe('GET /v1/health/database', () => {
        it('devrait vérifier la connexion à la base de données', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/v1/health/database')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.connected).toBeDefined();
        });
    });
});
//# sourceMappingURL=health.test.js.map