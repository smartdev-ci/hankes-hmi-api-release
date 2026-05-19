import { PrismaClient } from '@prisma/client';

// Déclaration du client Prisma global pour éviter les recréations multiples
// en développement avec hot-reload
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configuration du client Prisma
export const prisma = global.prisma || new PrismaClient({
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
  global.prisma = prisma;
}

// Fonction de connexion sécurisée
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Base de données PostgreSQL connectée avec succès');
  } catch (error) {
    console.error('❌ Échec de la connexion à la base de données:', error);
    throw error;
  }
}

// Fonction de déconnexion propre
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 Connexion à la base de données fermée');
  } catch (error) {
    console.error('⚠️ Erreur lors de la déconnexion:', error);
  }
}

// Export des types et modèles pour utilisation directe
export * from '@prisma/client';

export default prisma;
