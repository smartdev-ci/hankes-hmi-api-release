"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
// Configuration du client Prisma
exports.prisma = global.prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    ...(process.env.DATABASE_URL
        ? {
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        }
        : {}),
});
// Sauvegarder dans le global en développement
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
// Fonction de connexion sécurisée
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        console.log('✅ Base de données PostgreSQL connectée avec succès');
    }
    catch (error) {
        console.error('❌ Échec de la connexion à la base de données:', error);
        throw error;
    }
}
// Fonction de déconnexion propre
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log('🔌 Connexion à la base de données fermée');
    }
    catch (error) {
        console.error('⚠️ Erreur lors de la déconnexion:', error);
    }
}
// Export des types et modèles pour utilisation directe
__exportStar(require("@prisma/client"), exports);
exports.default = exports.prisma;
//# sourceMappingURL=index.js.map