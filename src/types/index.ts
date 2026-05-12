export type UserRole = 'admin' | 'etablissement' | 'partenaire';

export interface User {
  id: string;
  email: string;
  nom: string;
  telephone: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  etablissementId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Etablissement {
  id: string;
  nom: string;
  type: 'bar' | 'maquis' | 'cave' | 'boite_de_nuit' | 'restaurant' | 'hotel';
  adresse: string;
  ville: string;
  region: string;
  latitude?: number;
  longitude?: number;
  telephone: string;
  email?: string;
  gerantId: string;
  isActive: boolean;
  isVerified: boolean;
  capacite?: number;
  licence?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioCapture {
  id: string;
  etablissementId: string;
  userId: string;
  audioUrl: string;
  duree: number;
  format: string;
  taille: number;
  statut: 'pending' | 'processing' | 'identified' | 'failed';
  deviceId: string;
  capturedAt: Date;
  syncedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
}

export interface MusicRecognition {
  id: string;
  captureId: string;
  titre: string;
  artiste: string;
  album?: string;
  isrc?: string;
  label?: string;
  genre?: string;
  annee?: number;
  confidence: number;
  source: 'acrcloud' | 'audd';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Diffusion {
  id: string;
  etablissementId: string;
  musicId: string;
  titre: string;
  artiste: string;
  playedAt: Date;
  duree: number;
  source: 'capture' | 'manual' | 'playlist';
  createdAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  osVersion: string;
  pushToken?: string;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OTP {
  phone: string;
  code: string;
  purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
