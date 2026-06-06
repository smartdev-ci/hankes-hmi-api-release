"use strict";
/**
 * Service de gestion des reconnaissances musicales
 * Opérations CRUD sur la table music_recognitions via Prisma
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicRecognitionService = void 0;
const index_1 = require("../index");
const errors_1 = require("../errors");
class MusicRecognitionService {
    static async findAll() {
        try {
            const data = await index_1.prisma.musicRecognition.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la récupération des reconnaissances');
        }
    }
    static async findById(id) {
        try {
            const data = await index_1.prisma.musicRecognition.findUnique({
                where: { id },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de la reconnaissance ${id}`);
        }
    }
    static async findByCaptureId(captureId) {
        try {
            const data = await index_1.prisma.musicRecognition.findUnique({
                where: { captureId },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la récupération de la reconnaissance pour la capture ${captureId}`);
        }
    }
    static async create(data) {
        try {
            const result = await index_1.prisma.musicRecognition.create({
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new errors_1.DatabaseError('Une reconnaissance existe déjà pour cette capture');
            }
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la création de la reconnaissance');
        }
    }
    static async createFromExisting(captureId, recognition, source) {
        return this.create({
            ...recognition,
            captureId,
            source,
            metadata: {
                ...(recognition.metadata || {}),
                localRecognition: true,
                originalSource: recognition.source,
            },
        });
    }
    static async update(id, data) {
        try {
            const result = await index_1.prisma.musicRecognition.update({
                where: { id },
                data,
            });
            return result;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError(`Reconnaissance ${id} non trouvée`);
            }
            if (error instanceof errors_1.DatabaseError || error instanceof errors_1.NotFoundError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la mise à jour de la reconnaissance ${id}`);
        }
    }
    static async delete(id) {
        try {
            await index_1.prisma.musicRecognition.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la suppression de la reconnaissance ${id}`);
        }
    }
    static async findByArtiste(artiste) {
        try {
            const data = await index_1.prisma.musicRecognition.findMany({
                where: {
                    artiste: {
                        contains: artiste,
                        mode: 'insensitive',
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des reconnaissances pour l'artiste ${artiste}`);
        }
    }
    static async findByTitre(titre) {
        try {
            const data = await index_1.prisma.musicRecognition.findMany({
                where: {
                    titre: {
                        contains: titre,
                        mode: 'insensitive',
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des reconnaissances pour le titre ${titre}`);
        }
    }
    /**
     * Retourne la première reconnaissance correspondant à l'ISRC donné.
     * On utilise findFirst (et non findUnique) car isrc n'est plus une contrainte unique
     * dans le schéma — un même ISRC peut apparaître sur plusieurs captures.
     */
    static async findByIsrc(isrc) {
        try {
            const data = await index_1.prisma.musicRecognition.findFirst({
                where: { isrc },
                orderBy: { createdAt: 'desc' },
            });
            return data || null;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche de la reconnaissance avec ISRC ${isrc}`);
        }
    }
    /**
     * Retourne toutes les reconnaissances correspondant à l'ISRC donné.
     */
    static async findAllByIsrc(isrc) {
        try {
            const data = await index_1.prisma.musicRecognition.findMany({
                where: { isrc },
                orderBy: { createdAt: 'desc' },
            });
            return data;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError(`Erreur lors de la recherche des reconnaissances avec ISRC ${isrc}`);
        }
    }
    static async count() {
        try {
            const count = await index_1.prisma.musicRecognition.count();
            return count;
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors du comptage des reconnaissances');
        }
    }
    static async getTopArtistes(limit = 10) {
        try {
            const data = await index_1.prisma.musicRecognition.findMany({
                select: { artiste: true },
                orderBy: { createdAt: 'desc' },
            });
            const stats = new Map();
            data.forEach((recog) => {
                const count = stats.get(recog.artiste) || 0;
                stats.set(recog.artiste, count + 1);
            });
            return Array.from(stats.entries())
                .map(([artiste, count]) => ({ artiste, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
        }
        catch (error) {
            if (error instanceof errors_1.DatabaseError)
                throw error;
            throw new errors_1.DatabaseError('Erreur lors de la génération du top artistes');
        }
    }
}
exports.MusicRecognitionService = MusicRecognitionService;
//# sourceMappingURL=music-recognition.service.js.map