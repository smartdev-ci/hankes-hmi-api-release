import { Router } from 'express';
import { authenticate, authorize, hashPassword } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createEtablissementSchema, updateEtablissementSchema } from '../utils/validators';
import { EtablissementService, UserService } from '../database/services';
import { UserRole, CreatorRole } from '@prisma/client';

const router = Router();

/**
 * GET /etablissements
 * Liste des établissements (avec pagination et filtres)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const ville = req.query.ville as string;
    const type = req.query.type as string;
    const search = req.query.search as string;

    let etablissements = await EtablissementService.findAll();

    // Filtres
    if (ville) {
      etablissements = etablissements.filter(e => e.ville === ville);
    }
    if (type) {
      etablissements = etablissements.filter(e => e.type === type);
    }
    if (search) {
      etablissements = etablissements.filter(e => 
        e.nom.toLowerCase().includes(search.toLowerCase()) ||
        e.adresse.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = etablissements.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: etablissements.length,
        totalPages: Math.ceil(etablissements.length / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /etablissements
 * Créer un nouvel établissement (recenseur ou admin)
 * Si gerantEmail est fourni, crée un utilisateur gérant lié
 */
router.post('/', authenticate, validateRequest(createEtablissementSchema), async (req, res) => {
  try {
    const {
      nom, type, adresse, ville, region, latitude, longitude,
      telephone, email, capacite, licence,
      gerantEmail, gerantNom, gerantTelephone
    } = req.body;

    const createurId = req.user!.id;
    const createurRole = req.user!.role as UserRole;

    // Vérifier que le créateur est admin ou recenseur
    if (createurRole !== 'admin' && createurRole !== 'recenseur') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les admins et recenseurs peuvent créer des établissements',
      });
    }

    let gerantId: string;

    // Si les informations du gérant sont fournies, créer l'utilisateur gérant
    if (gerantEmail && gerantNom && gerantTelephone) {
      // Vérifier si l'email existe déjà
      const existingUser = await UserService.findByEmail(gerantEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email du gérant déjà utilisé',
        });
      }

      // Vérifier si le téléphone existe déjà
      const existingPhone = await UserService.findByTelephone(gerantTelephone);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: 'Numéro de téléphone du gérant déjà utilisé',
        });
      }

      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(tempPassword);

      // Créer l'utilisateur gérant
      const gerant = await UserService.create({
        email: gerantEmail,
        password: hashedPassword,
        nom: gerantNom,
        telephone: gerantTelephone,
        role: UserRole.etablissement,
        isVerified: false,
        isActive: true,
      });

      gerantId = gerant.id;

      // TODO: Envoyer email/SMS au gérant avec ses identifiants
      console.log(`Gérant créé: ${gerantEmail}, mot de passe temporaire: ${tempPassword}`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Les informations du gérant (email, nom, téléphone) sont requises',
      });
    }

    // Créer l'établissement
    const etablissement = await EtablissementService.create({
      nom,
      type,
      adresse,
      ville,
      region,
      latitude: latitude || null,
      longitude: longitude || null,
      telephone,
      email: email || null,
      gerantId,
      capacite: capacite || null,
      licence: licence || null,
      creePar: createurId,
      roleCreateur: createurRole as CreatorRole,
    });

    res.status(201).json({
      success: true,
      message: 'Établissement créé avec succès',
      data: etablissement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId
 * Récupérer les détails d'un établissement
 */
router.get('/:etablissementId', authenticate, async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      return res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
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
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /etablissements/:etablissementId
 * Mettre à jour un établissement
 */
router.put('/:etablissementId', authenticate, validateRequest(updateEtablissementSchema), async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      return res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Mise à jour
    const updatedEtablissement = await EtablissementService.update(etablissementId, req.body);

    res.json({
      success: true,
      data: updatedEtablissement,
      message: 'Établissement mis à jour avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /etablissements/:etablissementId
 * Supprimer un établissement (admin uniquement)
 */
router.delete('/:etablissementId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    
    await EtablissementService.delete(etablissementId);

    res.json({
      success: true,
      message: 'Établissement supprimé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/valider
 * Valider un établissement (admin uniquement)
 */
router.post('/:etablissementId/valider', authenticate, authorize('admin'), async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    
    const etablissement = await EtablissementService.verifyEtablissement(etablissementId);

    res.json({
      success: true,
      data: etablissement,
      message: 'Établissement validé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /etablissements/:etablissementId/suspendre
 * Suspendre un établissement (admin uniquement)
 */
router.post('/:etablissementId/suspendre', authenticate, authorize('admin'), async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    
    const etablissement = await EtablissementService.toggleActiveStatus(etablissementId, false);

    res.json({
      success: true,
      data: etablissement,
      message: 'Établissement suspendu avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/stats
 * Statistiques d'un établissement
 */
router.get('/:etablissementId/stats', authenticate, async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      return res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Stats mockées
    const stats = {
      etablissementId,
      periode: { startDate, endDate },
      totalDiffusions: 0,
      musiquesUnique: 0,
      artistesUnique: 0,
      dureeTotaleHeures: 0,
      topMusiques: [],
      topArtistes: [],
      evolutionParJour: [],
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /etablissements/:etablissementId/diffusions
 * Historique des diffusions d'un établissement
 */
router.get('/:etablissementId/diffusions', authenticate, async (req, res) => {
  try {
    const etablissementId = Array.isArray(req.params.etablissementId) ? req.params.etablissementId[0] : req.params.etablissementId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const etablissement = await EtablissementService.findById(etablissementId);
    
    if (!etablissement) {
      return res.status(404).json({
        success: false,
        error: 'Établissement non trouvé',
      });
    }

    // Vérifier les permissions
    if (req.user?.role !== 'admin' && etablissement.gerantId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé',
      });
    }

    // Mock: retourner liste vide
    res.json({
      success: true,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
