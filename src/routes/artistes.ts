import { Router } from 'express';
import { authenticate, hashPassword } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createArtisteProfileSchema } from '../utils/validators';
import { UserService, ArtisteProfileService } from '../database/services';
import { NotFoundError, ValidationError } from '../database/errors';
import { z } from 'zod';

const router = Router();

/**
 * POST /artistes/register
 * Inscription publique d'un artiste
 * Crée l'utilisateur avec le rôle 'artiste' puis le profil artiste
 */
router.post('/register', validateRequest(createArtisteProfileSchema.extend({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().max(255),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/),
})), async (req, res) => {
  try {
    const { email, password, nom, telephone, nomArtiste, bio, isrc } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email déjà utilisé',
      });
    }

    // Vérifier si le téléphone existe déjà
    const existingPhone = await UserService.findByTelephone(telephone);
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: 'Numéro de téléphone déjà utilisé',
      });
    }

    // Hash du mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur avec le rôle artiste
    const user = await UserService.create({
      email,
      password: hashedPassword,
      nom,
      telephone,
      role: 'artiste',
      isVerified: false,
      isActive: true,
    });

    // Créer le profil artiste
    const artisteProfile = await ArtisteProfileService.create({
      userId: user.id,
      nomArtiste,
      bio: bio || null,
      isrc: isrc || null,
    });

    res.status(201).json({
      success: true,
      message: 'Artiste inscrit avec succès',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
      },
      profile: {
        id: artisteProfile.id,
        nomArtiste: artisteProfile.nomArtiste,
        bio: artisteProfile.bio,
        isrc: artisteProfile.isrc,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'inscription de l\'artiste:', error);
    
    if (error instanceof ValidationError) {
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
 * GET /artistes/me
 * Récupérer le profil de l'artiste connecté
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un artiste
    if (req.user?.role !== 'artiste') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux artistes',
      });
    }

    const artisteProfile = await ArtisteProfileService.findByUserId(req.user.id);
    
    if (!artisteProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profil artiste non trouvé',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
        profile: artisteProfile,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil artiste:', error);
    
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
 * PUT /artistes/me
 * Mettre à jour le profil de l'artiste connecté
 */
router.put('/me', authenticate, validateRequest(createArtisteProfileSchema.partial()), async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un artiste
    if (req.user?.role !== 'artiste') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux artistes',
      });
    }

    const artisteProfile = await ArtisteProfileService.findByUserId(req.user.id);
    
    if (!artisteProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profil artiste non trouvé',
      });
    }

    // Mettre à jour le profil
    const updatedProfile = await ArtisteProfileService.update(artisteProfile.id, {
      nomArtiste: req.body.nomArtiste,
      bio: req.body.bio,
      isrc: req.body.isrc,
    });

    res.json({
      success: true,
      message: 'Profil artiste mis à jour avec succès',
      data: updatedProfile,
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du profil artiste:', error);
    
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
 * GET /artistes/me/diffusions
 * Récapitulatif des diffusions pour l'artiste connecté
 * Inclut: titre, artiste, établissement, date/heure de diffusion
 */
router.get('/me/diffusions', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un artiste
    if (req.user?.role !== 'artiste') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux artistes',
      });
    }

    const artisteProfile = await ArtisteProfileService.findByUserId(req.user.id);
    
    if (!artisteProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profil artiste non trouvé',
      });
    }

    // Paramètres de filtrage et pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Construire les options pour le service
    const options = {
      page,
      limit,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    // Récupérer le récapitulatif des diffusions
    const recap = await ArtisteProfileService.getDiffusionsRecap(req.user.id, options);

    res.json({
      success: true,
      data: {
        stats: recap.stats,
        diffusions: recap.diffusions,
        pagination: {
          page,
          limit,
          total: recap.total,
          totalPages: Math.ceil(recap.total / limit),
          hasPreviousPage: page > 1,
          hasNextPage: page < Math.ceil(recap.total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du récapitulatif des diffusions:', error);
    
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
 * GET /artistes/me/musiques
 * Liste des musiques revendiquées par l'artiste connecté
 */
router.get('/me/musiques', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un artiste
    if (req.user?.role !== 'artiste') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux artistes',
      });
    }

    const musiques = await ArtisteProfileService.getMusiquesRevendiquees(req.user.id);

    res.json({
      success: true,
      data: musiques,
      total: musiques.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des musiques revendiquées:', error);
    
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Erreur serveur interne' 
        : error.message,
    });
  }
});

/**
 * POST /artistes/me/revendiquer
 * Revendiquer une musique reconnue
 */
router.post('/me/revendiquer', authenticate, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un artiste
    if (req.user?.role !== 'artiste') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux artistes',
      });
    }

    const { musicRecognitionId, isrc, nomArtiste } = req.body;

    if (!musicRecognitionId && !isrc) {
      return res.status(400).json({
        success: false,
        error: 'Soit musicRecognitionId, soit isrc doit être fourni',
      });
    }

    const claim = await ArtisteProfileService.revendiquerMusique(
      req.user.id,
      musicRecognitionId,
      isrc,
      nomArtiste
    );

    res.status(201).json({
      success: true,
      message: 'Musique revendiquée avec succès',
      data: claim,
    });
  } catch (error: any) {
    console.error('Erreur lors de la revendication de la musique:', error);
    
    if (error instanceof ValidationError) {
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

export default router;
