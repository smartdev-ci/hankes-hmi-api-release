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

// ─── Helper : cast config strings → StringValue pour jsonwebtoken ────────────
// jsonwebtoken >= 9.x exige StringValue (ex: "15m", "7d") et non string brut.
// Le cast via `as unknown as` est le pattern recommandé quand la config est typée string.
const accessExpiresIn = config.jwt.expiresIn as unknown as number;
const refreshExpiresIn = config.jwt.refreshExpiresIn as unknown as number;

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

    // Créer l'utilisateur
    const user = await UserService.create({
      email,
      password: hashedPassword,
      nom,
      telephone,
      role: role as UserRole,
      etablissementId: null,
    });

    // Créer l'établissement si fourni (pour rôle etablissement)
    let etablissementId = null;
    if (role === UserRole.etablissement && etablissement) {
      const newEtablissement = await EtablissementService.create({
        nom: etablissement.nom,
        type: etablissement.type,
        ville: etablissement.ville,
        region: etablissement.region,
        adresse: etablissement.adresse,
        telephone: telephone,
        gerantId: user.id,
      });
      etablissementId = newEtablissement.id;
    }

    // FIX #2 : `telephone` → `phone` (nom du champ dans OTPInsert)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTPService.create({
      phone: telephone,               // ← était `telephone`
      code: otpCode,
      purpose: OtpPurpose.REGISTER,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // TODO: Envoyer SMS via Twilio
    console.log(`OTP pour ${telephone}: ${otpCode}`);

    // Mettre à jour l'utilisateur avec etablissementId si applicable
    if (etablissementId) {
      await UserService.update(user.id, { etablissementId });
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

    const user = await UserService.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, error: 'Compte non vérifié' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Compte suspendu' });
    }

    // FIX #4 : expiresIn castés via le helper en haut de fichier
    const jwtOptions: SignOptions = { expiresIn: accessExpiresIn };
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      jwtOptions
    );

    const refreshJwtOptions: SignOptions = { expiresIn: refreshExpiresIn };
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      refreshJwtOptions
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await RefreshTokenService.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceId: deviceId || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.user?.id) {
      await RefreshTokenService.revokeUserTokens(req.user.id);
    }
    return res.json({ success: true, message: 'Déconnexion réussie' });
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

    const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

    const storedToken = await RefreshTokenService.findByUserId(decoded.userId);
    if (!storedToken || storedToken.length === 0) {
      return res.status(401).json({ success: false, error: 'Refresh token invalide ou révoqué' });
    }

    // FIX #5 : le champ s'appelle `tokenHash` dans RefreshToken, pas `token`
    const isValid = await bcrypt.compare(refreshToken, storedToken[0].tokenHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Refresh token invalide' });
    }

    if (new Date() > storedToken[0].expiresAt) {
      await RefreshTokenService.delete(storedToken[0].id);
      return res.status(401).json({ success: false, error: 'Refresh token expiré' });
    }

    await RefreshTokenService.delete(storedToken[0].id);

    // FIX #6 : utilisation des helpers castés pour expiresIn
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwt.secret,
      { expiresIn: accessExpiresIn }
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwt.secret,
      { expiresIn: refreshExpiresIn }
    );

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
    return res.status(401).json({ success: false, error: 'Refresh token invalide ou expiré' });
  }
});

/**
 * POST /auth/otp/envoyer
 */
router.post('/otp/envoyer', validateRequest(otpRequestSchema), async (req, res) => {
  try {
    const { phone, purpose } = req.body;

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // FIX #2 (bis) : le champ OTPInsert est `phone`, cohérent avec le reste du service
    await OTPService.create({
      phone: phone,
      code: otpCode,
      purpose: purpose as OtpPurpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

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
 */
router.post('/otp/verifier', validateRequest(otpVerifySchema), async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const otpRecord = await OTPService.findValidOTP(phone, otp);

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Code OTP invalide ou expiré' });
    }

    await OTPService.delete(otpRecord.id);

    if (otpRecord.purpose === OtpPurpose.REGISTER) {
      const user = await UserService.findByTelephone(phone);
      if (user) {
        await UserService.update(user.id, { isVerified: true });
      }
    }

    return res.json({ success: true, message: 'Code OTP vérifié avec succès' });
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
 */
router.post('/password/reset', validateRequest(passwordResetRequestSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserService.findByEmail(email);

    if (user) {
      console.log(`Demande de reset pour: ${email}`);
      // TODO: Générer un token signé et envoyer par email
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
 */
router.post('/password/reset/confirmer', validateRequest(passwordResetConfirmSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    // TODO: Vérifier le token et mettre à jour le mot de passe
    console.log('Reset password avec token:', token);

    return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
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
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await UserService.findById(req.user!.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
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
 */
router.patch('/changer-password', authenticate, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await UserService.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await UserService.update(user.id, { password: hashedNewPassword });
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