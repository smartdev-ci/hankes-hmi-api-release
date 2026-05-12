import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { createUserSchema, updateUserSchema } from '../utils/validators';

const router = Router();

// Mock database
const users: any[] = [];

/**
 * GET /utilisateurs
 * Lister les utilisateurs (admin uniquement)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const actif = req.query.actif === 'true';

    let filtered = [...users];

    // Filtres
    if (role) {
      filtered = filtered.filter(u => u.role === role);
    }
    if (actif !== undefined) {
      filtered = filtered.filter(u => u.isActive === actif);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
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
    const { email, password, nom, telephone, role, etablissementId } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Email déjà utilisé',
      });
      return;
    }

    // Hash du mot de passe
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = {
      id: require('uuid').v4(),
      email,
      password: hashedPassword,
      nom,
      telephone,
      role,
      etablissementId,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(user);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        etablissementId: user.etablissementId,
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
 * GET /utilisateurs/:userId
 * Récupérer les détails d'un utilisateur (admin uniquement)
 */
router.get('/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
      return;
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
    const { userId } = req.params;
    const { nom, telephone, role, etablissementId, isActive } = req.body;
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
      return;
    }

    // Mettre à jour les champs
    if (nom !== undefined) user.nom = nom;
    if (telephone !== undefined) user.telephone = telephone;
    if (role !== undefined) user.role = role;
    if (etablissementId !== undefined) user.etablissementId = etablissementId;
    if (isActive !== undefined) user.isActive = isActive;
    user.updatedAt = new Date();

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        etablissementId: user.etablissementId,
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
 * DELETE /utilisateurs/:userId
 * Désactiver un utilisateur (admin uniquement)
 */
router.delete('/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
      return;
    }

    // Désactiver l'utilisateur (soft delete)
    user.isActive = false;
    user.updatedAt = new Date();

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
