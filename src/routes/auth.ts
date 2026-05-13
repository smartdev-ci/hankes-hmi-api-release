import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/index';
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
import { UserService } from '../database/services/user.service';
import { OTPService } from '../database/services/otp.service';
import { RefreshTokenService } from '../database/services/refresh-token.service';
import { EtablissementService } from '../database/services/etablissement.service';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, OtpPurpose } from '@prisma/client';

const router = Router();

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, nom, telephone, role, etablissement } = req.body;

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
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'établissement si fourni (pour rôle etablissement)
    let etablissementId = null;
    if (role === UserRole.etablissement && etablissement) {
      const newEtablissement = await EtablissementService.create({
        nom: etablissement.nom,
        type: etablissement.type,
        ville: etablissement.ville,
        adresse: etablissement.adresse,
        telephone: telephone,
        gerantId: '', // Sera mis à jour après création user
      });
      etablissementId = newEtablissement.id;
    }

    // Créer l'utilisateur
    const user = await UserService.create({
      email,
      password: hashedPassword,
      nom,
      telephone,
      role: role as UserRole,
      etablissementId,
    });

    // Générer et envoyer OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTPService.create({
      telephone,
      code: otpCode,
      purpose: OtpPurpose.REGISTER,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // TODO: Envoyer SMS via Twilio
    console.log(`OTP pour ${telephone}: ${otpCode}`);

    // Si établissement créé, mettre à jour avec le gerantId
    if (etablissementId) {
      await EtablissementService.update(etablissementId, { gerantId: user.id });
    }

    return res.status(201).json({
      success: true,
      message: `Compte créé. Un code OTP a été envoyé au ${telephone}.`,
      userId: user.id,
      otpExpireIn: 600,
    });
  } catch (error: any) {
    console.error('Erreur inscription:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'inscription',
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
    const user = await UserService.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides',
      });
    }

    // Vérifier si le compte est vérifié
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Compte non vérifié',
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Compte suspendu',
      });
    }

    // Générer les tokens JWT
    const jwtOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      jwtOptions
    );

    const refreshJwtOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn };
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      refreshJwtOptions
    );

    // Stocker le refresh token hashé dans la base
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await RefreshTokenService.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceId: deviceId || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    });

    return res.json({
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
    console.error('Erreur login:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la connexion',
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
      await RefreshTokenService.revokeUserTokens(req.user.id);
    }

    return res.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error: any) {
    console.error('Erreur logout:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la déconnexion',
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
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;
    
    // Vérifier si le token existe en base
    const storedToken = await RefreshTokenService.findByUserId(decoded.userId);
    if (!storedToken || storedToken.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide ou révoqué',
      });
    }

    // Vérifier si le token est valide (comparer le hash)
    const isValid = await bcrypt.compare(refreshToken, storedToken[0].token);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token invalide',
      });
    }

    // Vérifier si le token est expiré
    if (new Date() > storedToken[0].expiresAt) {
      await RefreshTokenService.delete(storedToken[0].id);
      return res.status(401).json({
        success: false,
        error: 'Refresh token expiré',
      });
    }

    // Révoquer l'ancien token (rotation)
    await RefreshTokenService.delete(storedToken[0].id);

    // Générer de nouveaux tokens
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Stocker le nouveau refresh token
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
    await RefreshTokenService.create({
      userId: decoded.userId,
      tokenHash: newRefreshTokenHash,
      deviceId: storedToken[0].deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    });
  } catch (error: any) {
    console.error('Erreur refresh:', error);
    return res.status(401).json({
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
    
    await OTPService.create({
      phone: phone,
      code: otpCode,
      purpose: purpose as OtpPurpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // TODO: Envoyer SMS via Twilio
    console.log(`OTP pour ${phone} (${purpose}): ${otpCode}`);

    return res.json({
      success: true,
      message: `Code OTP envoyé au ${phone}`,
      otpExpireIn: 600,
    });
  } catch (error: any) {
    console.error('Erreur envoi OTP:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'OTP',
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

    const otpRecord = await OTPService.findValidOTP(phone, otp);
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Code OTP invalide ou expiré',
      });
    }

    // OTP valide - marquer comme utilisé et supprimer
    await OTPService.delete(otpRecord.id);

    // Si c'est pour REGISTER, vérifier l'utilisateur et le marquer comme vérifié
    if (otpRecord.purpose === OtpPurpose.REGISTER) {
      const user = await UserService.findByTelephone(phone);
      if (user) {
        await UserService.update(user.id, { isVerified: true });
      }
    }

    return res.json({
      success: true,
      message: 'Code OTP vérifié avec succès',
    });
  } catch (error: any) {
    console.error('Erreur vérification OTP:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la vérification de l\'OTP',
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

    const user = await UserService.findByEmail(email);
    
    // Toujours retourner succès pour éviter le fishing
    // TODO: Envoyer un email avec lien de reset si utilisateur existe
    if (user) {
      console.log(`Demande de reset pour: ${email}`);
      // Générer un token et envoyer par email
    }
    
    return res.json({
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
    });
  } catch (error: any) {
    console.error('Erreur reset password:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la demande de réinitialisation',
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
    // Pour l'instant, retour succès
    console.log('Reset password avec token:', token);
    
    return res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur confirmation reset:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la réinitialisation du mot de passe',
    });
  }
});

/**
 * GET /auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await UserService.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    return res.json({
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
    console.error('Erreur récupération profil:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération du profil',
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
    
    const user = await UserService.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe actuel incorrect',
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await UserService.update(user.id, { password: hashedNewPassword });

    // Révoquer tous les refresh tokens pour sécurité
    await RefreshTokenService.revokeUserTokens(user.id);

    return res.json({
      success: true,
      message: 'Mot de passe changé avec succès. Veuillez vous reconnecter.',
    });
  } catch (error: any) {
    console.error('Erreur changement password:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du changement du mot de passe',
    });
  }
});

export default router;
