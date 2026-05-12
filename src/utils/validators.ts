import { z } from 'zod';

// ==================== AUTHENTIFICATION ====================

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  deviceId: z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/).optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  nom: z.string().max(255, 'Le nom est trop long'),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Numéro de téléphone invalide (format E.164 requis)'),
  role: z.enum(['admin', 'etablissement', 'partenaire']).default('etablissement'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Numéro de téléphone invalide (format E.164 requis)'),
  purpose: z.enum(['REGISTER', 'LOGIN', 'PASSWORD_RESET', 'TWO_FACTOR']),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Numéro de téléphone invalide'),
  otp: z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Email invalide'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, 'Le mot de passe actuel doit contenir au moins 8 caractères'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

// ==================== UTILISATEURS ====================

export const updateUserSchema = z.object({
  nom: z.string().max(255).optional(),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  etablissementId: z.string().uuid().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().max(255),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  role: z.enum(['admin', 'etablissement', 'partenaire']),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// ==================== ETABLISSEMENTS ====================

export const createEtablissementSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(255),
  type: z.enum(['bar', 'maquis', 'cave', 'boite_de_nuit', 'restaurant', 'hotel']),
  adresse: z.string().min(1, 'Adresse requise'),
  ville: z.string().min(1, 'Ville requise'),
  region: z.string().min(1, 'Région requise'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Numéro de téléphone invalide'),
  email: z.string().email().optional(),
  capacite: z.number().int().positive().optional(),
  licence: z.string().optional(),
});

export const updateEtablissementSchema = createEtablissementSchema.partial();

// ==================== AUDIO ====================

export const audioCaptureSchema = z.object({
  etablissementId: z.string().uuid(),
  duree: z.number().positive(),
  format: z.string(),
  taille: z.number().positive(),
  deviceId: z.string(),
  capturedAt: z.string().datetime(),
});

export const audioSyncSchema = z.object({
  captures: z.array(audioCaptureSchema),
});

// ==================== DIFFUSIONS ====================

export const createDiffusionSchema = z.object({
  etablissementId: z.string().uuid(),
  musicId: z.string().uuid(),
  titre: z.string(),
  artiste: z.string(),
  playedAt: z.string().datetime(),
  duree: z.number().positive(),
  source: z.enum(['capture', 'manual', 'playlist']),
});

// ==================== DEVICES ====================

export const registerDeviceSchema = z.object({
  deviceId: z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string(),
  osVersion: z.string(),
  pushToken: z.string().optional(),
});

export const createDeviceSchema = z.object({
  nom: z.string().min(1).max(255),
  type: z.enum(['mobile', 'tablette', 'desktop', 'autre']),
  etablissementId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateDeviceSchema = z.object({
  nom: z.string().min(1).max(255).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// ==================== RAPPORTS ====================

export const generateRapportSchema = z.object({
  type: z.enum(['etablissement', 'periode', 'artiste']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  etablissementId: z.string().uuid().optional(),
  artiste: z.string().optional(),
  format: z.enum(['pdf', 'excel']).default('pdf'),
});

// ==================== PAGINATION ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
