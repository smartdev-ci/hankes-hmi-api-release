interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    deviceId: string | null;
    expiresAt: Date;
    createdAt: Date;
}
interface RefreshTokenInsert {
    userId: string;
    tokenHash: string;
    deviceId?: string | null;
    expiresAt: Date;
}
export declare class RefreshTokenService {
    static create(data: RefreshTokenInsert): Promise<RefreshToken>;
    static findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
    static delete(id: string): Promise<void>;
    static deleteExpired(): Promise<void>;
    static findByUserId(userId: string): Promise<RefreshToken[]>;
    static revokeUserTokens(userId: string): Promise<void>;
}
export {};
