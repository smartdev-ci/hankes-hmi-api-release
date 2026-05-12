import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema, 
  otpRequestSchema, 
  otpVerifySchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema 
} from '../utils/validators';

const router = Router();

// Mock database (à remplacer par PostgreSQL)
const users: any[] = [];
const otps: Map<string, any> = new Map();
const refreshTokens: Map<string, any> = new Map();

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, nom, telephone, role } = req.body;

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
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(user);

    // Générer et envoyer OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(telephone, {
      code: otpCode,
      purpose: 'REGISTER',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
    });

    // TODO: Envoyer SMS via Twilio
    console.log(`OTP pour ${telephone}: ${otpCode}`);

    res.status(201).json({
      success: true,
      message: `Compte créé. Un code OTP a été envoyé au ${telephone}.`,
      userId: user.id,
      otpExpireIn: 600,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/login
 * Connexion utilisateur
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Trouver l'utilisateur
    const user = users.find(u => u.email === email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
      });
      return;
    }

    // Vérifier le mot de passe
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
      });
      return;
    }

    // Vérifier si le compte est vérifié
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        error: 'Compte non vérifié',
      });
      return;
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Compte suspendu',
      });
      return;
    }

    // Générer les tokens JWT
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const cfg = require('../config').config;
    
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      cfg.jwt.secret,
      { expiresIn: cfg.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      cfg.jwt.secret,
      { expiresIn: cfg.jwt.refreshExpiresIn }
    );

    // Stocker le refresh token hashé
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    refreshTokens.set(user.id, {
      tokenHash: refreshTokenHash,
      deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
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
 * POST /auth/logout
 * Déconnexion
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.user?.id) {
      refreshTokens.delete(req.user.id);
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/refresh
 * Rafraîchir le token
 */
router.post('/refresh', validateRequest(refreshTokenSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Vérifier le refresh token
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const config = require('../config').config;

    const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;
    
    // Vérifier si le token existe en base
    const storedToken = refreshTokens.get(decoded.userId);
    if (!storedToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou révoqué',
      });
      return;
    }

    // Générer de nouveaux tokens
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: (decoded as any).email, role: (decoded as any).role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: (decoded as any).email, role: (decoded as any).role },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Refresh token invalide ou expiré',
    });
  }
});

/**
 * POST /auth/otp/envoyer
 * Envoyer un OTP SMS
 */
router.post('/otp/envoyer', validateRequest(otpRequestSchema), async (req, res) => {
  try {
    const { phone, purpose } = req.body;

    // Générer le code OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    otps.set(phone, {
      code: otpCode,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
    });

    // TODO: Envoyer SMS via Twilio
    console.log(`OTP pour ${phone} (${purpose}): ${otpCode}`);

    res.json({
      success: true,
      message: `Code OTP envoyé au ${phone}`,
      otpExpireIn: 600,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/otp/verifier
 * Vérifier un OTP
 */
router.post('/otp/verifier', validateRequest(otpVerifySchema), async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const otpRecord = otps.get(phone);
    
    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: 'Aucun OTP trouvé pour ce numéro',
      });
      return;
    }

    // Vérifier si l'OTP est expiré
    if (new Date() > otpRecord.expiresAt) {
      otps.delete(phone);
      res.status(400).json({
        success: false,
        error: 'Code OTP expiré',
      });
      return;
    }

    // Vérifier le nombre de tentatives
    if (otpRecord.attempts >= 3) {
      otps.delete(phone);
      res.status(400).json({
        success: false,
        error: 'Nombre maximum de tentatives dépassé',
      });
      return;
    }

    // Vérifier le code
    if (otp !== otpRecord.code) {
      otpRecord.attempts++;
      res.status(400).json({
        success: false,
        error: 'Code OTP invalide',
        remainingAttempts: 3 - otpRecord.attempts,
      });
      return;
    }

    // OTP valide - marquer comme utilisé
    otpRecord.isUsed = true;

    // Si c'est pour REGISTER, vérifier l'utilisateur
    if (otpRecord.purpose === 'REGISTER') {
      const user = users.find(u => u.telephone === phone);
      if (user) {
        user.isVerified = true;
        user.updatedAt = new Date();
      }
    }

    otps.delete(phone);

    res.json({
      success: true,
      message: 'Code OTP vérifié avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/password/reset
 * Demander une réinitialisation de mot de passe
 */
router.post('/password/reset', validateRequest(passwordResetRequestSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = users.find(u => u.email === email);
    
    // Toujours retourner succès pour éviter le fishing
    res.json({
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /auth/password/reset/confirmer
 * Confirmer la réinitialisation de mot de passe
 */
router.post('/password/reset/confirmer', validateRequest(passwordResetConfirmSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // TODO: Vérifier le token et mettre à jour le mot de passe
    
    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user?.id);
    
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
        isVerified: user.isVerified,
        etablissementId: user.etablissementId,
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
 * PATCH /auth/changer-password
 * Changer le mot de passe
 */
router.patch('/changer-password', authenticate, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = users.find(u => u.id === req.user?.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
      return;
    }

    // Vérifier le mot de passe actuel
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        error: 'Mot de passe actuel incorrect',
      });
      return;
    }

    // Hasher le nouveau mot de passe
    user.password = await bcrypt.hash(newPassword, 12);
    user.updatedAt = new Date();

    // Révoquer tous les refresh tokens pour sécurité
    refreshTokens.delete(user.id);

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès. Veuillez vous reconnecter.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
