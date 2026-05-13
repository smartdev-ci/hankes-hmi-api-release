"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const PORT = config_1.config.port;
app_1.default.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   HMIS API - Hankes Music Intelligence System             ║
║   Version: 2.0.0                                          ║
║                                                           ║
║   Serveur démarré sur le port ${PORT}                        ║
║   Environment: ${config_1.config.nodeEnv.padEnd(36)}║
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
//# sourceMappingURL=index.js.map