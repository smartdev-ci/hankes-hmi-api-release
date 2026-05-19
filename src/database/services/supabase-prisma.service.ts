import { prisma } from '../index';
import { DatabaseError } from '../errors';

type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

const playedAtFilter = ({ startDate, endDate }: DateRange) => {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate ? { lte: endDate } : {}),
  };
};

export class SupabasePrismaService {
  static async checkConnection(): Promise<{
    connected: boolean;
    database: 'postgresql';
    provider: 'supabase-prisma';
    latencyMs: number;
  }> {
    const startedAt = Date.now();

    try {
      if (!process.env.DATABASE_URL) {
        return {
          connected: false,
          database: 'postgresql',
          provider: 'supabase-prisma',
          latencyMs: Date.now() - startedAt,
        };
      }

      await prisma.$queryRaw`SELECT 1`;
      return {
        connected: true,
        database: 'postgresql',
        provider: 'supabase-prisma',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Impossible de communiquer avec Supabase via Prisma');
    }
  }

  static async getDashboardKpis(range: DateRange = {}) {
    const diffusionWhere = {
      ...(playedAtFilter(range) ? { playedAt: playedAtFilter(range) } : {}),
    };

    const [
      totalEtablissements,
      totalDiffusions,
      musiquesUnique,
      artistesUnique,
      villes,
      regions,
    ] = await Promise.all([
      prisma.etablissement.count({ where: { isActive: true } }),
      prisma.diffusion.count({ where: diffusionWhere }),
      prisma.diffusion.groupBy({ by: ['musicId'], where: diffusionWhere }).then((rows) => rows.length),
      prisma.diffusion.groupBy({ by: ['artiste'], where: diffusionWhere }).then((rows) => rows.length),
      prisma.etablissement.groupBy({ by: ['ville'], where: { isActive: true } }).then((rows) => rows.length),
      prisma.etablissement.groupBy({ by: ['region'], where: { isActive: true } }).then((rows) => rows.length),
    ]);

    return {
      totalEtablissements,
      totalDiffusions,
      musiquesUnique,
      artistesUnique,
      couvertureGeographique: {
        villes,
        regions,
      },
    };
  }

  static async getMapData(filters: { statut?: string; ville?: string } = {}) {
    const etablissements = await prisma.etablissement.findMany({
      where: {
        ...(filters.ville ? { ville: filters.ville } : {}),
        ...(filters.statut === 'actif' ? { isActive: true } : {}),
        ...(filters.statut === 'inactif' ? { isActive: false } : {}),
        ...(filters.statut === 'verifie' ? { isVerified: true } : {}),
        ...(filters.statut === 'non_verifie' ? { isVerified: false } : {}),
      },
      select: {
        id: true,
        nom: true,
        type: true,
        ville: true,
        region: true,
        adresse: true,
        latitude: true,
        longitude: true,
        isActive: true,
        isVerified: true,
      },
      orderBy: { nom: 'asc' },
    });

    return {
      etablissements,
      total: etablissements.length,
    };
  }

  static async getTopMusiques(limit: number, range: DateRange = {}) {
    const where = {
      ...(playedAtFilter(range) ? { playedAt: playedAtFilter(range) } : {}),
    };

    const grouped = await prisma.diffusion.groupBy({
      by: ['musicId', 'titre', 'artiste'],
      where,
      _count: { _all: true },
      _sum: { duree: true },
      orderBy: { _count: { musicId: 'desc' } },
      take: limit,
    });

    return grouped.map((row, index) => ({
      rang: index + 1,
      musicId: row.musicId,
      titre: row.titre,
      artiste: row.artiste,
      totalDiffusions: row._count._all,
      dureeTotale: row._sum.duree || 0,
    }));
  }

  static async getTopArtistes(limit: number, range: DateRange = {}) {
    const where = {
      ...(playedAtFilter(range) ? { playedAt: playedAtFilter(range) } : {}),
    };

    const grouped = await prisma.diffusion.groupBy({
      by: ['artiste'],
      where,
      _count: { _all: true },
      _sum: { duree: true },
      orderBy: { _count: { artiste: 'desc' } },
      take: limit,
    });

    return grouped.map((row, index) => ({
      rang: index + 1,
      artiste: row.artiste,
      totalDiffusions: row._count._all,
      dureeTotale: row._sum.duree || 0,
    }));
  }

  static async getDiffusionEvolution(range: DateRange = {}) {
    const diffusions = await prisma.diffusion.findMany({
      where: {
        ...(playedAtFilter(range) ? { playedAt: playedAtFilter(range) } : {}),
      },
      select: {
        playedAt: true,
        duree: true,
      },
      orderBy: { playedAt: 'asc' },
    });

    const buckets = new Map<string, { date: string; totalDiffusions: number; dureeTotale: number }>();

    diffusions.forEach((diffusion) => {
      const date = diffusion.playedAt.toISOString().slice(0, 10);
      const current = buckets.get(date) || { date, totalDiffusions: 0, dureeTotale: 0 };
      current.totalDiffusions += 1;
      current.dureeTotale += diffusion.duree;
      buckets.set(date, current);
    });

    return Array.from(buckets.values());
  }
}
