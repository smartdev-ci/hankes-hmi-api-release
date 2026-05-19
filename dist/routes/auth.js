"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../middleware/index");
const validators_1 = require("../utils/validators");
const user_service_1 = require("../database/services/user.service");
const otp_service_1 = require("../database/services/otp.service");
const refresh_token_service_1 = require("../database/services/refresh-token.service");
const etablissement_service_1 = require("../database/services/etablissement.service");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const router = (0, express_1.Router)();
// ─── Helper : cast config strings → StringValue pour jsonwebtoken ────────────
// jsonwebtoken >= 9.x exige StringValue (ex: "15m", "7d") et non string brut.
// Le cast via `as unknown as` est le pattern recommandé quand la config est typée string.
const accessExpiresIn = config_1.config.jwt.expiresIn;
const refreshExpiresIn = config_1.config.jwt.refreshExpiresIn;
/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', (0, index_1.validateRequest)(validators_1.registerSchema), async (req, res) => {
    try {
        const { email, password, nom, telephone, role, etablissement } = req.body;
        // Vérifier si l'email existe déjà
        const existingUser = await user_service_1.UserService.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email déjà utilisé',
            });
        }
        // Vérifier si le téléphone existe déjà
        const existingPhone = await user_service_1.UserService.findByTelephone(telephone);
        if (existingPhone) {
            return res.status(409).json({
                success: false,
                error: 'Numéro de téléphone déjà utilisé',
            });
        }
        // Hash du mot de passe
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Créer l'utilisateur
        const user = await user_service_1.UserService.create({
            email,
            password: hashedPassword,
            nom,
            telephone,
            role: role,
            etablissementId: null,
        });
        // Créer l'établissement si fourni (pour rôle etablissement)
        let etablissementId = null;
        if (role === 'etablissement' && etablissement) {
            const newEtablissement = await etablissement_service_1.EtablissementService.create({
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
        await otp_service_1.OTPService.create({
            phone: telephone, // ← était `telephone`
            code: otpCode,
            purpose: 'REGISTER',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        // TODO: Envoyer SMS via Twilio
        console.log(`OTP pour ${telephone}: ${otpCode}`);
        // Mettre à jour l'utilisateur avec etablissementId si applicable
        if (etablissementId) {
            await user_service_1.UserService.update(user.id, { etablissementId });
        }
        return res.status(201).json({
            success: true,
            message: `Compte créé. Un code OTP a été envoyé au ${telephone}.`,
            userId: user.id,
            otpExpireIn: 600,
        });
    }
    catch (error) {
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
router.post('/login', (0, index_1.validateRequest)(validators_1.loginSchema), async (req, res) => {
    try {
        const { email, password, deviceId } = req.body;
        const user = await user_service_1.UserService.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
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
        const jwtOptions = { expiresIn: accessExpiresIn };
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, jwtOptions);
        const refreshJwtOptions = { expiresIn: refreshExpiresIn };
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, refreshJwtOptions);
        const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, 12);
        await refresh_token_service_1.RefreshTokenService.create({
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
    }
    catch (error) {
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
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.id) {
            await refresh_token_service_1.RefreshTokenService.revokeUserTokens(req.user.id);
        }
        return res.json({ success: true, message: 'Déconnexion réussie' });
    }
    catch (error) {
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
router.post('/refresh', (0, index_1.validateRequest)(validators_1.refreshTokenSchema), async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.secret);
        const storedToken = await refresh_token_service_1.RefreshTokenService.findByUserId(decoded.userId);
        if (!storedToken || storedToken.length === 0) {
            return res.status(401).json({ success: false, error: 'Refresh token invalide ou révoqué' });
        }
        // FIX #5 : le champ s'appelle `tokenHash` dans RefreshToken, pas `token`
        const isValid = await bcryptjs_1.default.compare(refreshToken, storedToken[0].tokenHash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Refresh token invalide' });
        }
        if (new Date() > storedToken[0].expiresAt) {
            await refresh_token_service_1.RefreshTokenService.delete(storedToken[0].id);
            return res.status(401).json({ success: false, error: 'Refresh token expiré' });
        }
        await refresh_token_service_1.RefreshTokenService.delete(storedToken[0].id);
        // FIX #6 : utilisation des helpers castés pour expiresIn
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: decoded.userId, email: decoded.email, role: decoded.role }, config_1.config.jwt.secret, { expiresIn: accessExpiresIn });
        const newRefreshToken = jsonwebtoken_1.default.sign({ userId: decoded.userId, email: decoded.email, role: decoded.role }, config_1.config.jwt.secret, { expiresIn: refreshExpiresIn });
        const newRefreshTokenHash = await bcryptjs_1.default.hash(newRefreshToken, 12);
        await refresh_token_service_1.RefreshTokenService.create({
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
    }
    catch (error) {
        console.error('Erreur refresh:', error);
        return res.status(401).json({ success: false, error: 'Refresh token invalide ou expiré' });
    }
});
/**
 * POST /auth/otp/envoyer
 */
router.post('/otp/envoyer', (0, index_1.validateRequest)(validators_1.otpRequestSchema), async (req, res) => {
    try {
        const { phone, purpose } = req.body;
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // FIX #2 (bis) : le champ OTPInsert est `phone`, cohérent avec le reste du service
        await otp_service_1.OTPService.create({
            phone: phone,
            code: otpCode,
            purpose: purpose,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        console.log(`OTP pour ${phone} (${purpose}): ${otpCode}`);
        return res.json({
            success: true,
            message: `Code OTP envoyé au ${phone}`,
            otpExpireIn: 600,
        });
    }
    catch (error) {
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
router.post('/otp/verifier', (0, index_1.validateRequest)(validators_1.otpVerifySchema), async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const otpRecord = await otp_service_1.OTPService.findValidOTP(phone, otp);
        if (!otpRecord) {
            return res.status(400).json({ success: false, error: 'Code OTP invalide ou expiré' });
        }
        await otp_service_1.OTPService.delete(otpRecord.id);
        if (otpRecord.purpose === 'REGISTER') {
            const user = await user_service_1.UserService.findByTelephone(phone);
            if (user) {
                await user_service_1.UserService.update(user.id, { isVerified: true });
            }
        }
        return res.json({ success: true, message: 'Code OTP vérifié avec succès' });
    }
    catch (error) {
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
router.post('/password/reset', (0, index_1.validateRequest)(validators_1.passwordResetRequestSchema), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await user_service_1.UserService.findByEmail(email);
        if (user) {
            console.log(`Demande de reset pour: ${email}`);
            // TODO: Générer un token signé et envoyer par email
        }
        return res.json({
            success: true,
            message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
        });
    }
    catch (error) {
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
router.post('/password/reset/confirmer', (0, index_1.validateRequest)(validators_1.passwordResetConfirmSchema), async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // TODO: Vérifier le token et mettre à jour le mot de passe
        console.log('Reset password avec token:', token);
        return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    }
    catch (error) {
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
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await user_service_1.UserService.findById(req.user.id);
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
    }
    catch (error) {
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
router.patch('/changer-password', auth_1.authenticate, (0, index_1.validateRequest)(validators_1.changePasswordSchema), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await user_service_1.UserService.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' });
        }
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await user_service_1.UserService.update(user.id, { password: hashedNewPassword });
        await refresh_token_service_1.RefreshTokenService.revokeUserTokens(user.id);
        return res.json({
            success: true,
            message: 'Mot de passe changé avec succès. Veuillez vous reconnecter.',
        });
    }
    catch (error) {
        console.error('Erreur changement password:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors du changement du mot de passe',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map