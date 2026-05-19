import request from 'supertest';
import { app } from '../../app';

describe('Health API', () => {
  describe('GET /v1/health', () => {
    it('devrait retourner le statut OK de l\'API', async () => {
      const response = await request(app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('OK');
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('devrait inclure les informations de version', async () => {
      const response = await request(app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.data.version).toMatch(/\d+\.\d+\.\d+/);
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /v1/health/database', () => {
    it('devrait vérifier la connexion à la base de données', async () => {
      const response = await request(app)
        .get('/v1/health/database')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.connected).toBeDefined();
    });
  });
});
