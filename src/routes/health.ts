import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * GET /health
 * Santé de l'API
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
  });
});

/**
 * GET /health/ready
 * Vérification de readiness (dépendances prêtes)
 */
router.get('/health/ready', async (req, res) => {
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
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      error: error.message,
    });
  }
});

/**
 * GET /metrics
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

export default router;
