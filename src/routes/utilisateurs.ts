import { Router } from 'express';
import { authenticate, authorize, hashPassword } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createUserSchema, updateUserSchema, createRecenseurUserSchema } from '../utils/validators';
import { UserService, RecenseurProfileService, EtablissementService } from '../database/services';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /utilisateurs
 * Lister les utilisateurs (admin uniquement)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as UserRole;
    const actif = req.query.actif === 'true';

    let users;
    if (role) {
      users = await UserService.findByRole(role);
    } else {
      users = await UserService.findAll();
    }

    // Filtrer par statut actif si spécifié
    if (actif !== undefined) {
      users = users.filter(u => u.isActive === actif);
    }

    // Pagination manuelle
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = users.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults.map(u => ({
        id: u.id,
        email: u.email,
        nom: u.nom,
        telephone: u.telephone,
        role: u.role,
        isVerified: u.isVerified,
        isActive: u.isActive,
        etablissementId: u.etablissementId,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
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
 * POST /utilisateurs
 * Créer un utilisateur (admin uniquement)
 */
router.post('/', authenticate, authorize('admin'), validateRequest(createUserSchema), async (req, res) => {
  try {
    const { email, password, nom, telephone, role, isVerified, isActive } = req.body;

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

    // Créer l'utilisateur
    const user = await UserService.create({
      email,
      password: hashedPassword,
      nom,
      telephone,
      role: role as UserRole,
      isVerified,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
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
 * POST /utilisateurs/recenseur
 * Créer un utilisateur recenseur avec son profil (admin uniquement)
 */
router.post('/recenseur', authenticate, authorize('admin'), validateRequest(createRecenseurUserSchema), async (req, res) => {
  try {
    const { email, password, nom, prenom, telephone, numeroPiece, typePiece, dateNaissance, photoIdentiteUrl } = req.body;

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

    // Créer l'utilisateur avec le rôle recenseur
    const user = await UserService.create({
      email,
      password: hashedPassword,
      nom: `${prenom} ${nom}`,
      telephone,
      role: UserRole.recenseur,
      isVerified: false,
      isActive: true,
    });

    // Créer le profil recenseur
    const recenseurProfile = await RecenseurProfileService.create({
      userId: user.id,
      numeroPiece,
      typePiece,
      dateNaissance: new Date(dateNaissance),
      photoIdentiteUrl,
      creePar: req.user!.id, // L'admin connecté
    });

    res.status(201).json({
      success: true,
      message: 'Agent recenseur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
      },
      profile: {
        id: recenseurProfile.id,
        numeroPiece: recenseurProfile.numeroPiece,
        typePiece: recenseurProfile.typePiece,
        dateNaissance: recenseurProfile.dateNaissance,
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
 * GET /utilisateurs/recenseurs
 * Lister tous les agents recenseurs (admin uniquement)
 */
router.get('/recenseurs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const recenseurs = await RecenseurProfileService.findAll();

    res.json({
      success: true,
      data: recenseurs,
      total: recenseurs.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /utilisateurs/recenseurs/:recenseurId/etablissements
 * Récupérer les établissements créés par un recenseur
 */
router.get('/recenseurs/:recenseurId/etablissements', authenticate, authorize('admin'), async (req, res) => {
  try {
    const recenseurId = Array.isArray(req.params.recenseurId) ? req.params.recenseurId[0] : req.params.recenseurId;

    // Vérifier que le recenseur existe
    const recenseur = await RecenseurProfileService.findByUserId(recenseurId);
    if (!recenseur) {
      return res.status(404).json({
        success: false,
        error: 'Recenseur non trouvé',
      });
    }

    const etablissements = await RecenseurProfileService.getEtablissementsCreesParRecenseur(recenseurId);

    res.json({
      success: true,
      data: etablissements,
      total: etablissements.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /utilisateurs/:userId
 * Récupérer les détails d'un utilisateur (admin uniquement)
 */
router.get('/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    
    const user = await UserService.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        etablissementId: user.etablissementId,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
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
 * PATCH /utilisateurs/:userId
 * Modifier un utilisateur (admin uniquement)
 */
router.patch('/:userId', authenticate, authorize('admin'), validateRequest(updateUserSchema), async (req, res) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { nom, telephone, role, etablissementId, isActive } = req.body;
    
    const user = await UserService.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Mettre à jour les champs
    const updatedUser = await UserService.update(userId, {
      nom,
      telephone,
      role: role as UserRole,
      etablissementId,
      isActive,
    });

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nom: updatedUser.nom,
        telephone: updatedUser.telephone,
        role: updatedUser.role,
        etablissementId: updatedUser.etablissementId,
        isActive: updatedUser.isActive,
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
 * DELETE /utilisateurs/:userId
 * Désactiver un utilisateur (admin uniquement)
 */
router.delete('/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    
    const user = await UserService.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Désactiver l'utilisateur (soft delete)
    await UserService.toggleActiveStatus(userId, false);

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
