import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createEtablissementSchema, updateEtablissementSchema } from '../utils/validators';
import { EtablissementService } from '../database/services/etablissement.service';
import { NotFoundError, ValidationError } from '../database/errors';
import { EtablissementType } from '@prisma/client';
import { prisma } from '../database';

const router = Router();

/**
 * GET /etablissements
 * Liste des établissements (avec pagination et filtres)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 par page
    const ville = req.query.ville as string | undefined;
    const type = req.query.type as EtablissementType | undefined;
    const search = req.query.search as string | undefined;
    const region = req.query.region as string | undefined;

    // Construction des filtres Prisma
    const where: any = {};

    if (ville) {
      where.ville = ville;
    }

    if (region) {
      where.region = region;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { adresse: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Récupération du total pour la pagination
    const total = await prisma.etablissement.count({ where });

    // Pagination Prisma native
    const skip = (page - 1) * limit;
    const etablissements = await prisma.etablissement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nom: 'asc' },
      include: {
        gerant: {
          select: {
            id: true,
            nom: true,
            telephone: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: etablissements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des établissements:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * POST /etablissements
 * Créer un nouvel établissement
 */
router.post('/', authenticate, validateRequest(createEtablissementSchema), async (req, res) => {
  try {
    const etablissementData = {
      ...req.body,
      gerantId: req.user?.id,
      isActive: true,
      isVerified: false,
    };

    // Vérifier que le gérant existe et n'a pas déjà un établissement
    const existingEtablissement = await prisma.etablissement.findUnique({
      where: { gerantId: req.user?.id },
    });

    if (existingEtablissement) {
      throw new ValidationError('Un établissement est déjà associé à votre compte');
    }

    const etablissement = await EtablissementService.create(etablissementData);

    // Mettre à jour l'utilisateur avec l'ID de l'établissement
    await prisma.user.update({
      where: { id: req.user?.id },
      data: { etablissementId: etablissement.id },
    });

    res.status(201).json({
      success: true,
      data: etablissement,
      message: 'Établissement créé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'établissement:', error);
    
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId
 * Récupérer les détails d'un établissement
 */
router.get('/:etablissementId', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    res.json({
      success: true,
      data: etablissement,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'établissement:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * PUT /etablissements/:etablissementId
 * Mettre à jour un établissement
 */
router.put('/:etablissementId', authenticate, validateRequest(updateEtablissementSchema), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Mise à jour via le service
    const updatedEtablissement = await EtablissementService.update(etablissementId, req.body);

    res.json({
      success: true,
      data: updatedEtablissement,
      message: 'Établissement mis à jour avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'établissement:', error);
    
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * DELETE /etablissements/:etablissementId
 * Supprimer un établissement (admin uniquement)
 */
router.delete('/:etablissementId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    // Vérifier que l'établissement existe
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Suppression via le service
    await EtablissementService.delete(etablissementId);

    res.json({
      success: true,
      message: 'Établissement supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'établissement:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/valider
 * Valider un établissement (admin uniquement)
 */
router.post('/:etablissementId/valider', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    const updatedEtablissement = await EtablissementService.verifyEtablissement(etablissementId);

    res.json({
      success: true,
      data: updatedEtablissement,
      message: 'Établissement validé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la validation de l\'établissement:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/suspendre
 * Suspendre un établissement (admin uniquement)
 */
router.post('/:etablissementId/suspendre', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const { motif } = req.body;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Suspension de l'établissement
    const updatedEtablissement = await EtablissementService.toggleActiveStatus(etablissementId, false);

    // TODO: Envoyer notification au gérant avec le motif
    // await NotificationService.create({
    //   userId: etablissement.gerantId,
    //   titre: 'Établissement suspendu',
    //   message: `Votre établissement a été suspendu. Motif: ${motif}`,
    //   type: 'ALERT',
    // });

    res.json({
      success: true,
      data: updatedEtablissement,
      message: 'Établissement suspendu avec succès',
    });
  } catch (error: any) {
    console.error('Erreur lors de la suspension de l\'établissement:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/stats
 * Statistiques d'un établissement
 */
router.get('/:etablissementId/stats', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Construire les filtres de date pour les diffusions
    const whereFilters: any = { etablissementId };
    
    if (startDate || endDate) {
      whereFilters.playedAt = {};
      if (startDate) {
        whereFilters.playedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereFilters.playedAt.lte = new Date(endDate);
      }
    }

    // Récupérer les statistiques depuis la table Diffusion
    const [totalDiffusions, musiquesUnique, artistesUnique] = await Promise.all([
      prisma.diffusion.count({ where: whereFilters }),
      
      // Musiques uniques
      prisma.diffusion.groupBy({
        by: ['musicId'],
        where: whereFilters,
      }).then(results => results.length),
      
      // Artistes uniques
      prisma.diffusion.groupBy({
        by: ['artiste'],
        where: whereFilters,
      }).then(results => results.length),
    ]);

    // Durée totale (en heures)
    const dureeTotaleResult = await prisma.diffusion.aggregate({
      where: whereFilters,
      _sum: { duree: true },
    });
    const dureeTotaleHeures = Math.round((dureeTotaleResult._sum.duree || 0) / 3600);

    // Top musiques
    const topMusiques = await prisma.diffusion.groupBy({
      by: ['titre', 'artiste'],
      where: whereFilters,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Top artistes
    const topArtistes = await prisma.diffusion.groupBy({
      by: ['artiste'],
      where: whereFilters,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Évolution par jour (7 derniers jours si pas de dates spécifiées)
    const evolutionParJour = await prisma.diffusion.groupBy({
      by: ['playedAt'],
      where: whereFilters,
      _count: { id: true },
      orderBy: { playedAt: 'asc' },
    });

    // Formater l'évolution par jour
    const evolutionFormatee = evolutionParJour.map(item => ({
      date: item.playedAt.toISOString().split('T')[0],
      count: item._count.id,
    }));

    const stats = {
      etablissementId,
      periode: { startDate, endDate },
      totalDiffusions,
      musiquesUnique,
      artistesUnique,
      dureeTotaleHeures,
      topMusiques: topMusiques.map(m => ({
        titre: m.titre,
        artiste: m.artiste,
        nombreDiffusions: m._count.id,
      })),
      topArtistes: topArtistes.map(a => ({
        artiste: a.artiste,
        nombreDiffusions: a._count.id,
      })),
      evolutionParJour: evolutionFormatee,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/diffusions
 * Historique des diffusions d'un établissement
 */
router.get('/:etablissementId/diffusions', authenticate, async (req, res) => {
  try {
    const { etablissementId } = req.params;
    
    if (!etablissementId || Array.isArray(etablissementId)) {
      throw new ValidationError('ID de l\'établissement invalide');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 par page
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      throw new NotFoundError('Établissement non trouvé');
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Récupérer l'historique des diffusions avec pagination Prisma
    const whereFilters: any = { etablissementId };
    const total = await prisma.diffusion.count({ where: whereFilters });
    const skip = (page - 1) * limit;

    const diffusions = await prisma.diffusion.findMany({
      where: whereFilters,
      skip,
      take: limit,
      orderBy: { playedAt: 'desc' },
      include: {
        music: {
          select: {
            id: true,
            titre: true,
            artiste: true,
            album: true,
            isrc: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: diffusions.map(d => ({
        id: d.id,
        titre: d.titre,
        artiste: d.artiste,
        playedAt: d.playedAt,
        duree: d.duree,
        source: d.source,
        music: d.music,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des diffusions:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

export default router;
