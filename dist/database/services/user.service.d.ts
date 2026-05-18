/**
 * Service de gestion des utilisateurs
 * Opérations CRUD sur la table users via Prisma
 */
import { UserRole } from '@prisma/client';
interface User {
    id: string;
    email: string;
    password: string;
    nom: string;
    telephone: string;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
    etablissementId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
interface UserInsert {
    email: string;
    password: string;
    nom: string;
    telephone: string;
    role?: UserRole;
    isVerified?: boolean;
    isActive?: boolean;
    etablissementId?: string | null;
}
interface UserUpdate {
    email?: string;
    password?: string;
    nom?: string;
    telephone?: string;
    role?: UserRole;
    isVerified?: boolean;
    isActive?: boolean;
    etablissementId?: string | null;
}
export declare class UserService {
    static findAll(): Promise<User[]>;
    static findById(id: string): Promise<User | null>;
    static findByEmail(email: string): Promise<User | null>;
    static create(userData: UserInsert): Promise<User>;
    static update(id: string, userData: UserUpdate): Promise<User>;
    static delete(id: string): Promise<void>;
    static verifyUser(id: string): Promise<User>;
    static toggleActiveStatus(id: string, isActive: boolean): Promise<User>;
    static findByRole(role: UserRole): Promise<User[]>;
    static count(): Promise<number>;
    static findByTelephone(telephone: string): Promise<User | null>;
}
export {};
