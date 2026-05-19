/**
 * Service de gestion des OTP
 * Opérations CRUD sur la table otps via Prisma
 */
interface OTP {
    id: string;
    phone: string;
    code: string;
    purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
    expiresAt: Date;
    attempts: number;
    isUsed: boolean;
    createdAt: Date;
}
interface OTPInsert {
    phone: string;
    code: string;
    purpose: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET' | 'TWO_FACTOR';
    expiresAt: Date;
    attempts?: number;
    isUsed?: boolean;
}
export declare class OTPService {
    static create(data: OTPInsert): Promise<OTP>;
    static findByPhoneAndCode(phone: string, code: string): Promise<OTP | null>;
    static markAsUsed(id: string): Promise<OTP>;
    static deleteExpired(): Promise<void>;
    static findValidOTP(phone: string, code: string): Promise<OTP | null>;
    static delete(id: string): Promise<void>;
}
export {};
