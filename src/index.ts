import app from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   HMIS API - Hankes Music Intelligence System             ║
║   Version: 2.0.0                                          ║
║                                                           ║
║   Serveur démarré sur le port ${PORT}                        ║
║   Environment: ${config.nodeEnv.padEnd(36)}║
║                                                           ║
║   Endpoints:                                              ║
║   - http://localhost:${PORT}/v1/auth                       ║
║   - http://localhost:${PORT}/v1/etablissements             ║
║   - http://localhost:${PORT}/v1/dashboard                  ║
║   - http://localhost:${PORT}/health                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
