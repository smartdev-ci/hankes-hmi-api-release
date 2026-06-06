import { z } from 'zod';

const phoneE164 = /^\+[1-9]\d{7,14}$/;

// ==================== AUTHENTIFICATION ====================

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
  deviceId: z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/).optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
  nom: z.string().max(255, 'Le nom est trop long'),
  telephone: z.string().regex(phoneE164, 'Numero de telephone invalide (format E.164 requis)'),
  role: z.enum(['admin', 'etablissement', 'partenaire']).default('etablissement'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(phoneE164, 'Numero de telephone invalide (format E.164 requis)'),
  purpose: z.enum(['REGISTER', 'LOGIN', 'PASSWORD_RESET', 'TWO_FACTOR']),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(phoneE164, 'Numero de telephone invalide'),
  otp: z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Email invalide'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, 'Le mot de passe actuel doit contenir au moins 8 caracteres'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caracteres'),
});

// ==================== UTILISATEURS ====================

export const updateUserSchema = z.object({
  nom: z.string().max(255).optional(),
  telephone: z.string().regex(phoneE164).optional(),
  etablissementId: z.string().uuid().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().max(255),
  telephone: z.string().regex(phoneE164),
  role: z.enum(['admin', 'etablissement', 'partenaire', 'recenseur', 'artiste']),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createEtablissementUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().max(255),
  telephone: z.string().regex(phoneE164),
  role: z.enum(['etablissement', 'partenaire']).default('etablissement'),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createRecenseurUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().max(255),
  prenom: z.string().max(255),
  telephone: z.string().regex(phoneE164),
  numeroPiece: z.string().min(3).max(50),
  typePiece: z.enum(['cni', 'passeport', 'titre_sejour', 'carte_consulaire']),
  dateNaissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  photoIdentiteUrl: z.string().url(),
});

export const createArtisteProfileSchema = z.object({
  nomArtiste: z.string().min(1).max(255),
  bio: z.string().max(1000).optional(),
  isrc: z.string().max(50).optional(),
});

// ==================== ETABLISSEMENTS ====================

const etablissementPayloadSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(255),
  type: z.enum(['bar', 'maquis', 'cave', 'boite_de_nuit', 'restaurant', 'hotel']),
  adresse: z.string().min(1, 'Adresse requise'),
  ville: z.string().min(1, 'Ville requise'),
  region: z.string().min(1, 'Region requise'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  telephone: z.string().regex(phoneE164, 'Numero de telephone invalide'),
  email: z.string().email().optional(),
  capacite: z.number().int().positive().optional(),
  licence: z.string().optional(),
  gerantId: z.string().uuid().optional(),
  gerantEmail: z.string().email().optional(),
  gerantNom: z.string().optional(),
  gerantTelephone: z.string().regex(phoneE164).optional(),
  gerantPassword: z.string().min(8).optional(),
});

export const createEtablissementSchema = etablissementPayloadSchema.refine(
  (data) => Boolean(data.gerantId) || Boolean(data.gerantEmail && data.gerantNom && data.gerantTelephone && data.gerantPassword),
  {
    message: 'Fournir gerantId ou les informations completes du gerant a creer',
    path: ['gerantId'],
  }
).refine(
  (data) => !(data.gerantId && (data.gerantEmail || data.gerantNom || data.gerantTelephone || data.gerantPassword)),
  {
    message: 'Utiliser soit gerantId, soit les informations de creation du gerant',
    path: ['gerantId'],
  }
);

export const updateEtablissementSchema = etablissementPayloadSchema.omit({
  gerantId: true,
  gerantEmail: true,
  gerantNom: true,
  gerantTelephone: true,
  gerantPassword: true,
}).partial();

export const assignEtablissementUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1).max(50).default('staff'),
});

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
  userId: z.string().uuid().nullable().optional(),
  captureId: z.string().uuid().nullable().optional(),
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
  deviceId: z.string().regex(/^[a-zA-Z0-9\-_]{16,64}$/),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string(),
  osVersion: z.string(),
  etablissementId: z.string().uuid().optional(),
  pushToken: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  etablissementId: z.string().uuid().nullable().optional(),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
  pushToken: z.string().nullable().optional(),
  lastActiveAt: z.string().datetime().optional(),
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
