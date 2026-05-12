/**
 * Services de base de données pour HMIS API
 * Utilisant PostgreSQL natif via Prisma ORM
 */

// Export du client Prisma et des utilitaires de connexion
export { prisma, connectDatabase, disconnectDatabase } from '../index';

// Export des services métier
export { UserService } from './user.service';
export { EtablissementService } from './etablissement.service';
export { AudioCaptureService } from './audio-capture.service';
export { MusicRecognitionService } from './music-recognition.service';
export { DiffusionService } from './diffusion.service';
export { DeviceService } from './device.service';
export { OTPService } from './otp.service';
export { RefreshTokenService } from './refresh-token.service';
export { NotificationService } from './notification.service';
export { RapportService } from './rapport.service';
