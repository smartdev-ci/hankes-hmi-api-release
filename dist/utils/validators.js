"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.generateRapportSchema = exports.updateDeviceSchema = exports.createDeviceSchema = exports.registerDeviceSchema = exports.createDiffusionSchema = exports.audioSyncSchema = exports.audioCaptureSchema = exports.assignEtablissementUserSchema = exports.updateEtablissementSchema = exports.createEtablissementSchema = exports.createArtisteProfileSchema = exports.createRecenseurUserSchema = exports.createEtablissementUserSchema = exports.createUserSchema = exports.updateUserSchema = exports.changePasswordSchema = exports.passwordResetConfirmSchema = exports.passwordResetRequestSchema = exports.otpVerifySchema = exports.otpRequestSchema = exports.refreshTokenSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const phoneE164 = /^\+[1-9]\d{7,14}$/;
// ==================== AUTHENTIFICATION ====================
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide'),
    password: zod_1.z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
    deviceId: zod_1.z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/).optional(),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide'),
    password: zod_1.z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
    nom: zod_1.z.string().max(255, 'Le nom est trop long'),
    telephone: zod_1.z.string().regex(phoneE164, 'Numero de telephone invalide (format E.164 requis)'),
    role: zod_1.z.enum(['admin', 'etablissement', 'partenaire']).default('etablissement'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token requis'),
});
exports.otpRequestSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneE164, 'Numero de telephone invalide (format E.164 requis)'),
    purpose: zod_1.z.enum(['REGISTER', 'LOGIN', 'PASSWORD_RESET', 'TWO_FACTOR']),
});
exports.otpVerifySchema = zod_1.z.object({
    phone: zod_1.z.string().regex(phoneE164, 'Numero de telephone invalide'),
    otp: zod_1.z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
});
exports.passwordResetRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide'),
});
exports.passwordResetConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token requis'),
    newPassword: zod_1.z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres'),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(8, 'Le mot de passe actuel doit contenir au moins 8 caracteres'),
    newPassword: zod_1.z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres'),
});
// ==================== UTILISATEURS ====================
exports.updateUserSchema = zod_1.z.object({
    nom: zod_1.z.string().max(255).optional(),
    telephone: zod_1.z.string().regex(phoneE164).optional(),
    etablissementId: zod_1.z.string().uuid().optional(),
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    nom: zod_1.z.string().max(255),
    telephone: zod_1.z.string().regex(phoneE164),
    role: zod_1.z.enum(['admin', 'etablissement', 'partenaire', 'recenseur', 'artiste']),
    isVerified: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.createEtablissementUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    nom: zod_1.z.string().max(255),
    telephone: zod_1.z.string().regex(phoneE164),
    role: zod_1.z.enum(['etablissement', 'partenaire']).default('etablissement'),
    isVerified: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.createRecenseurUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    nom: zod_1.z.string().max(255),
    prenom: zod_1.z.string().max(255),
    telephone: zod_1.z.string().regex(phoneE164),
    numeroPiece: zod_1.z.string().min(3).max(50),
    typePiece: zod_1.z.enum(['cni', 'passeport', 'titre_sejour', 'carte_consulaire']),
    dateNaissance: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    photoIdentiteUrl: zod_1.z.string().url(),
});
exports.createArtisteProfileSchema = zod_1.z.object({
    nomArtiste: zod_1.z.string().min(1).max(255),
    bio: zod_1.z.string().max(1000).optional(),
    isrc: zod_1.z.string().max(50).optional(),
});
// ==================== ETABLISSEMENTS ====================
const etablissementPayloadSchema = zod_1.z.object({
    nom: zod_1.z.string().min(1, 'Nom requis').max(255),
    type: zod_1.z.enum(['bar', 'maquis', 'cave', 'boite_de_nuit', 'restaurant', 'hotel']),
    adresse: zod_1.z.string().min(1, 'Adresse requise'),
    ville: zod_1.z.string().min(1, 'Ville requise'),
    region: zod_1.z.string().min(1, 'Region requise'),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    telephone: zod_1.z.string().regex(phoneE164, 'Numero de telephone invalide'),
    email: zod_1.z.string().email().optional(),
    capacite: zod_1.z.number().int().positive().optional(),
    licence: zod_1.z.string().optional(),
    gerantId: zod_1.z.string().uuid().optional(),
    gerantEmail: zod_1.z.string().email().optional(),
    gerantNom: zod_1.z.string().optional(),
    gerantTelephone: zod_1.z.string().regex(phoneE164).optional(),
    gerantPassword: zod_1.z.string().min(8).optional(),
});
exports.createEtablissementSchema = etablissementPayloadSchema.refine((data) => Boolean(data.gerantId) || Boolean(data.gerantEmail && data.gerantNom && data.gerantTelephone && data.gerantPassword), {
    message: 'Fournir gerantId ou les informations completes du gerant a creer',
    path: ['gerantId'],
}).refine((data) => !(data.gerantId && (data.gerantEmail || data.gerantNom || data.gerantTelephone || data.gerantPassword)), {
    message: 'Utiliser soit gerantId, soit les informations de creation du gerant',
    path: ['gerantId'],
});
exports.updateEtablissementSchema = etablissementPayloadSchema.omit({
    gerantId: true,
    gerantEmail: true,
    gerantNom: true,
    gerantTelephone: true,
    gerantPassword: true,
}).partial();
exports.assignEtablissementUserSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    role: zod_1.z.string().min(1).max(50).default('staff'),
});
// ==================== AUDIO ====================
exports.audioCaptureSchema = zod_1.z.object({
    etablissementId: zod_1.z.string().uuid(),
    duree: zod_1.z.number().positive(),
    format: zod_1.z.string(),
    taille: zod_1.z.number().positive(),
    deviceId: zod_1.z.string(),
    capturedAt: zod_1.z.string().datetime(),
});
exports.audioSyncSchema = zod_1.z.object({
    captures: zod_1.z.array(exports.audioCaptureSchema),
});
// ==================== DIFFUSIONS ====================
exports.createDiffusionSchema = zod_1.z.object({
    etablissementId: zod_1.z.string().uuid(),
    musicId: zod_1.z.string().uuid(),
    titre: zod_1.z.string(),
    artiste: zod_1.z.string(),
    playedAt: zod_1.z.string().datetime(),
    duree: zod_1.z.number().positive(),
    source: zod_1.z.enum(['capture', 'manual', 'playlist']),
    userId: zod_1.z.string().uuid().nullable().optional(),
    captureId: zod_1.z.string().uuid().nullable().optional(),
});
// ==================== DEVICES ====================
exports.registerDeviceSchema = zod_1.z.object({
    deviceId: zod_1.z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/),
    platform: zod_1.z.enum(['ios', 'android']),
    appVersion: zod_1.z.string(),
    osVersion: zod_1.z.string(),
    pushToken: zod_1.z.string().optional(),
});
exports.createDeviceSchema = zod_1.z.object({
    deviceId: zod_1.z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/),
    platform: zod_1.z.enum(['ios', 'android']),
    appVersion: zod_1.z.string(),
    osVersion: zod_1.z.string(),
    etablissementId: zod_1.z.string().uuid().optional(),
    pushToken: zod_1.z.string().optional(),
});
exports.updateDeviceSchema = zod_1.z.object({
    etablissementId: zod_1.z.string().uuid().nullable().optional(),
    appVersion: zod_1.z.string().optional(),
    osVersion: zod_1.z.string().optional(),
    pushToken: zod_1.z.string().nullable().optional(),
    lastActiveAt: zod_1.z.string().datetime().optional(),
});
// ==================== RAPPORTS ====================
exports.generateRapportSchema = zod_1.z.object({
    type: zod_1.z.enum(['etablissement', 'periode', 'artiste']),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    etablissementId: zod_1.z.string().uuid().optional(),
    artiste: zod_1.z.string().optional(),
    format: zod_1.z.enum(['pdf', 'excel']).default('pdf'),
});
// ==================== PAGINATION ====================
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=validators.js.map