import { Router } from 'express';
import { authenticate, authorize, hashPassword } from '../middleware/auth';
import { validateRequest } from '../middleware';
import {
  assignEtablissementUserSchema,
  createEtablissementSchema,
  updateEtablissementSchema,
} from '../utils/validators';
import { DiffusionService, EtablissementService } from '../database/services';
import { UserRole } from '../types';

const router = Router();

const getParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

const sendRouteError = (res: any, error: any) => {
  const statusByName: Record<string, number> = {
    ValidationError: 400,
    NotFoundError: 404,
  };

  return res.status(statusByName[error?.name] || 500).json({
    success: false,
    error: error.message,
  });
};

const canManageEtablissement = (
  user: Express.Request['user'],
  etablissement: { gerantId: string; creePar?: string | null }
): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (etablissement.gerantId === user.id) return true;
  return user.role === 'recenseur' && etablissement.creePar === user.id;
};

/**
 * GET /etablissements
 * Liste des etablissements avec filtres simples.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const ville = req.query.ville as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    let etablissements = await EtablissementService.findAll();

    if (req.user?.role === 'recenseur') {
      etablissements = etablissements.filter((e) => e.creePar === req.user?.id);
    }

    if (ville) {
      etablissements = etablissements.filter((e) => e.ville === ville);
    }
    if (type) {
      etablissements = etablissements.filter((e) => e.type === type);
    }
    if (search) {
      const normalizedSearch = search.toLowerCase();
      etablissements = etablissements.filter((e) =>
        e.nom.toLowerCase().includes(normalizedSearch) ||
        e.adresse.toLowerCase().includes(normalizedSearch)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedResults = etablissements.slice(startIndex, startIndex + limit);

    return res.json({
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
    return sendRouteError(res, error);
  }
});

/**
 * POST /etablissements
 * Cree un etablissement avec un gerant existant ou un gerant cree dans la meme transaction.
 */
router.post('/', authenticate, validateRequest(createEtablissementSchema), async (req, res) => {
  try {
    const createurRole = req.user!.role as UserRole;
    if (createurRole !== 'admin' && createurRole !== 'recenseur') {
      return res.status(403).json({
        success: false,
        error: 'Seuls les admins et recenseurs peuvent creer des etablissements',
      });
    }

    const {
      nom,
      type,
      adresse,
      ville,
      region,
      latitude,
      longitude,
      telephone,
      email,
      capacite,
      licence,
      gerantId,
      gerantEmail,
      gerantNom,
      gerantTelephone,
      gerantPassword,
    } = req.body;

    const hashedGerantPassword = gerantPassword ? await hashPassword(gerantPassword) : undefined;

    const etablissement = await EtablissementService.createWithGerant({
      createurId: req.user!.id,
      createurRole: createurRole as 'admin' | 'recenseur',
      gerantId,
      gerant: gerantEmail && gerantNom && gerantTelephone && hashedGerantPassword
        ? {
            email: gerantEmail,
            password: hashedGerantPassword,
            nom: gerantNom,
            telephone: gerantTelephone,
            isVerified: false,
            isActive: true,
          }
        : undefined,
      etablissement: {
        nom,
        type,
        adresse,
        ville,
        region,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        telephone,
        email: email ?? null,
        capacite: capacite ?? null,
        licence: licence ?? null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Etablissement cree avec succes',
      data: etablissement,
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

/**
 * GET /etablissements/:etablissementId/users
 * Liste les utilisateurs lies a un etablissement, hors gerant.
 */
router.get('/:etablissementId/users', authenticate, async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const etablissement = await EtablissementService.findById(etablissementId);

    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    const users = await EtablissementService.findUsers(etablissementId);
    return res.json({ success: true, data: users, total: users.length });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

/**
 * POST /etablissements/:etablissementId/users
 * Associe un utilisateur existant a un etablissement.
 */
router.post('/:etablissementId/users', authenticate, validateRequest(assignEtablissementUserSchema), async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const { userId, role } = req.body;
    const etablissement = await EtablissementService.findById(etablissementId);

    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    const association = await EtablissementService.addUserToEtablissement(
      etablissementId,
      userId,
      role,
      req.user!.id
    );

    return res.status(201).json({
      success: true,
      message: 'Utilisateur lie a l etablissement avec succes',
      data: association,
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

/**
 * DELETE /etablissements/:etablissementId/users/:userId
 * Retire un utilisateur lie a un etablissement.
 */
router.delete('/:etablissementId/users/:userId', authenticate, async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const userId = getParam(req.params.userId);
    const etablissement = await EtablissementService.findById(etablissementId);

    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    await EtablissementService.removeUser(etablissementId, userId);
    return res.json({ success: true, message: 'Utilisateur retire de l etablissement' });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

/**
 * GET /etablissements/:etablissementId
 * Recupere les details d'un etablissement.
 */
router.get('/:etablissementId', authenticate, async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const etablissement = await EtablissementService.findById(etablissementId);

    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    return res.json({ success: true, data: etablissement });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

/**
 * PUT /etablissements/:etablissementId
 */
router.put('/:etablissementId', authenticate, validateRequest(updateEtablissementSchema), async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const etablissement = await EtablissementService.findById(etablissementId);

    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    const {
      nom,
      type,
      adresse,
      ville,
      region,
      latitude,
      longitude,
      telephone,
      email,
      capacite,
      licence,
    } = req.body;

    const updatedEtablissement = await EtablissementService.update(etablissementId, {
      nom,
      type,
      adresse,
      ville,
      region,
      latitude,
      longitude,
      telephone,
      email,
      capacite,
      licence,
    });

    return res.json({
      success: true,
      message: 'Etablissement mis a jour avec succes',
      data: updatedEtablissement,
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

router.delete('/:etablissementId', authenticate, authorize('admin'), async (req, res) => {
  try {
    await EtablissementService.delete(getParam(req.params.etablissementId));
    return res.json({ success: true, message: 'Etablissement supprime avec succes' });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

router.post('/:etablissementId/valider', authenticate, authorize('admin'), async (req, res) => {
  try {
    const etablissement = await EtablissementService.verifyEtablissement(getParam(req.params.etablissementId));
    return res.json({
      success: true,
      message: 'Etablissement valide avec succes',
      data: etablissement,
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

router.post('/:etablissementId/suspendre', authenticate, authorize('admin'), async (req, res) => {
  try {
    const etablissement = await EtablissementService.toggleActiveStatus(getParam(req.params.etablissementId), false);
    return res.json({
      success: true,
      message: 'Etablissement suspendu avec succes',
      data: etablissement,
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

router.get('/:etablissementId/stats', authenticate, async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const etablissement = await EtablissementService.findById(etablissementId);
    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    const diffusions = startDate && endDate
      ? await DiffusionService.findByDateRange(etablissementId, startDate, endDate)
      : await DiffusionService.findByEtablissement(etablissementId);

    const uniqueMusiques = new Set(diffusions.map((d) => d.musicId));
    const uniqueArtistes = new Set(diffusions.map((d) => d.artiste.toLowerCase()));
    const dureeTotaleSecondes = diffusions.reduce((sum, d) => sum + d.duree, 0);

    return res.json({
      success: true,
      data: {
        etablissementId,
        periode: { startDate, endDate },
        totalDiffusions: diffusions.length,
        musiquesUnique: uniqueMusiques.size,
        artistesUnique: uniqueArtistes.size,
        dureeTotaleHeures: Number((dureeTotaleSecondes / 3600).toFixed(2)),
      },
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

router.get('/:etablissementId/diffusions', authenticate, async (req, res) => {
  try {
    const etablissementId = getParam(req.params.etablissementId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const etablissement = await EtablissementService.findById(etablissementId);
    if (!etablissement) {
      return res.status(404).json({ success: false, error: 'Etablissement non trouve' });
    }
    if (!canManageEtablissement(req.user, etablissement)) {
      return res.status(403).json({ success: false, error: 'Acces non autorise' });
    }

    const diffusions = await DiffusionService.findByEtablissement(etablissementId);
    const startIndex = (page - 1) * limit;

    return res.json({
      success: true,
      data: diffusions.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        total: diffusions.length,
        totalPages: Math.ceil(diffusions.length / limit),
      },
    });
  } catch (error: any) {
    return sendRouteError(res, error);
  }
});

export default router;
