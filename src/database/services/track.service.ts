import { prisma } from '../index';
import { DatabaseError } from '../errors';
import { buildTrackKey, normalizeForMatch } from '../../utils/normalization';

export interface TrackMetadata {
  titre: string;
  artiste: string;
  album?: string | null;
  isrc?: string | null;
  genre?: string | null;
  annee?: number | null;
}

export class TrackService {
  static async upsertFromRecognition(data: TrackMetadata) {
    try {
      const normalizedKey = buildTrackKey(data);

      const track = await prisma.track.upsert({
        where: { normalizedKey },
        update: {
          titre: data.titre,
          artiste: data.artiste,
          album: data.album || undefined,
          isrc: data.isrc || undefined,
          genre: data.genre || undefined,
          annee: data.annee || undefined,
        },
        create: {
          titre: data.titre,
          artiste: data.artiste,
          album: data.album || null,
          isrc: data.isrc || null,
          genre: data.genre || null,
          annee: data.annee || null,
          normalizedKey,
        },
      });

      await this.ensureAliases(track.id, [data.titre, data.artiste]);

      return track;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Erreur lors de la sauvegarde du morceau local');
    }
  }

  static async findById(id: string) {
    try {
      return await prisma.track.findUnique({ where: { id } });
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Erreur lors de la recuperation du morceau ${id}`);
    }
  }

  private static async ensureAliases(trackId: string, aliases: Array<string | null | undefined>) {
    const normalizedAliases = aliases
      .map((alias) => ({
        alias,
        normalizedAlias: normalizeForMatch(alias),
      }))
      .filter((item): item is { alias: string; normalizedAlias: string } =>
        Boolean(item.alias && item.normalizedAlias)
      );

    await Promise.all(
      normalizedAliases.map((item) =>
        prisma.trackAlias.upsert({
          where: {
            trackId_normalizedAlias: {
              trackId,
              normalizedAlias: item.normalizedAlias,
            },
          },
          update: { alias: item.alias },
          create: {
            trackId,
            alias: item.alias,
            normalizedAlias: item.normalizedAlias,
          },
        })
      )
    );
  }
}
