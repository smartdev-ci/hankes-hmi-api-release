import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    deviceId?: string | undefined;
}, {
    email: string;
    password: string;
    deviceId?: string | undefined;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    nom: z.ZodString;
    telephone: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["admin", "etablissement", "partenaire"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "admin" | "etablissement" | "partenaire";
    password: string;
    nom: string;
    telephone: string;
}, {
    email: string;
    password: string;
    nom: string;
    telephone: string;
    role?: "admin" | "etablissement" | "partenaire" | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const otpRequestSchema: z.ZodObject<{
    phone: z.ZodString;
    purpose: z.ZodEnum<["REGISTER", "LOGIN", "PASSWORD_RESET", "TWO_FACTOR"]>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    purpose: "REGISTER" | "LOGIN" | "PASSWORD_RESET" | "TWO_FACTOR";
}, {
    phone: string;
    purpose: "REGISTER" | "LOGIN" | "PASSWORD_RESET" | "TWO_FACTOR";
}>;
export declare const otpVerifySchema: z.ZodObject<{
    phone: z.ZodString;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    otp: string;
}, {
    phone: string;
    otp: string;
}>;
export declare const passwordResetRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const passwordResetConfirmSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
}>;
export declare const updateUserSchema: z.ZodObject<{
    nom: z.ZodOptional<z.ZodString>;
    telephone: z.ZodOptional<z.ZodString>;
    etablissementId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nom?: string | undefined;
    telephone?: string | undefined;
    etablissementId?: string | undefined;
}, {
    nom?: string | undefined;
    telephone?: string | undefined;
    etablissementId?: string | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    nom: z.ZodString;
    telephone: z.ZodString;
    role: z.ZodEnum<["admin", "etablissement", "partenaire", "recenseur", "artiste"]>;
    isVerified: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "admin" | "etablissement" | "partenaire" | "recenseur" | "artiste";
    password: string;
    nom: string;
    telephone: string;
    isVerified: boolean;
    isActive: boolean;
}, {
    email: string;
    role: "admin" | "etablissement" | "partenaire" | "recenseur" | "artiste";
    password: string;
    nom: string;
    telephone: string;
    isVerified?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export declare const createRecenseurUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    nom: z.ZodString;
    prenom: z.ZodString;
    telephone: z.ZodString;
    numeroPiece: z.ZodString;
    typePiece: z.ZodEnum<["cni", "passeport", "titre_sejour", "carte_consulaire"]>;
    dateNaissance: z.ZodString;
    photoIdentiteUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    nom: string;
    telephone: string;
    prenom: string;
    numeroPiece: string;
    typePiece: "cni" | "passeport" | "titre_sejour" | "carte_consulaire";
    dateNaissance: string;
    photoIdentiteUrl: string;
}, {
    email: string;
    password: string;
    nom: string;
    telephone: string;
    prenom: string;
    numeroPiece: string;
    typePiece: "cni" | "passeport" | "titre_sejour" | "carte_consulaire";
    dateNaissance: string;
    photoIdentiteUrl: string;
}>;
export declare const createArtisteProfileSchema: z.ZodObject<{
    nomArtiste: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    isrc: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nomArtiste: string;
    bio?: string | undefined;
    isrc?: string | undefined;
}, {
    nomArtiste: string;
    bio?: string | undefined;
    isrc?: string | undefined;
}>;
export declare const createEtablissementSchema: z.ZodObject<{
    nom: z.ZodString;
    type: z.ZodEnum<["bar", "maquis", "cave", "boite_de_nuit", "restaurant", "hotel"]>;
    adresse: z.ZodString;
    ville: z.ZodString;
    region: z.ZodString;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    telephone: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    capacite: z.ZodOptional<z.ZodNumber>;
    licence: z.ZodOptional<z.ZodString>;
    gerantEmail: z.ZodOptional<z.ZodString>;
    gerantNom: z.ZodOptional<z.ZodString>;
    gerantTelephone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "bar" | "maquis" | "cave" | "boite_de_nuit" | "restaurant" | "hotel";
    nom: string;
    telephone: string;
    adresse: string;
    ville: string;
    region: string;
    email?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacite?: number | undefined;
    licence?: string | undefined;
    gerantEmail?: string | undefined;
    gerantNom?: string | undefined;
    gerantTelephone?: string | undefined;
}, {
    type: "bar" | "maquis" | "cave" | "boite_de_nuit" | "restaurant" | "hotel";
    nom: string;
    telephone: string;
    adresse: string;
    ville: string;
    region: string;
    email?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacite?: number | undefined;
    licence?: string | undefined;
    gerantEmail?: string | undefined;
    gerantNom?: string | undefined;
    gerantTelephone?: string | undefined;
}>;
export declare const updateEtablissementSchema: z.ZodObject<{
    nom: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["bar", "maquis", "cave", "boite_de_nuit", "restaurant", "hotel"]>>;
    adresse: z.ZodOptional<z.ZodString>;
    ville: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    telephone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    capacite: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    licence: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gerantEmail: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gerantNom: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gerantTelephone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    type?: "bar" | "maquis" | "cave" | "boite_de_nuit" | "restaurant" | "hotel" | undefined;
    nom?: string | undefined;
    telephone?: string | undefined;
    adresse?: string | undefined;
    ville?: string | undefined;
    region?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacite?: number | undefined;
    licence?: string | undefined;
    gerantEmail?: string | undefined;
    gerantNom?: string | undefined;
    gerantTelephone?: string | undefined;
}, {
    email?: string | undefined;
    type?: "bar" | "maquis" | "cave" | "boite_de_nuit" | "restaurant" | "hotel" | undefined;
    nom?: string | undefined;
    telephone?: string | undefined;
    adresse?: string | undefined;
    ville?: string | undefined;
    region?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacite?: number | undefined;
    licence?: string | undefined;
    gerantEmail?: string | undefined;
    gerantNom?: string | undefined;
    gerantTelephone?: string | undefined;
}>;
export declare const audioCaptureSchema: z.ZodObject<{
    etablissementId: z.ZodString;
    duree: z.ZodNumber;
    format: z.ZodString;
    taille: z.ZodNumber;
    deviceId: z.ZodString;
    capturedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    etablissementId: string;
    duree: number;
    format: string;
    taille: number;
    capturedAt: string;
}, {
    deviceId: string;
    etablissementId: string;
    duree: number;
    format: string;
    taille: number;
    capturedAt: string;
}>;
export declare const audioSyncSchema: z.ZodObject<{
    captures: z.ZodArray<z.ZodObject<{
        etablissementId: z.ZodString;
        duree: z.ZodNumber;
        format: z.ZodString;
        taille: z.ZodNumber;
        deviceId: z.ZodString;
        capturedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        deviceId: string;
        etablissementId: string;
        duree: number;
        format: string;
        taille: number;
        capturedAt: string;
    }, {
        deviceId: string;
        etablissementId: string;
        duree: number;
        format: string;
        taille: number;
        capturedAt: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    captures: {
        deviceId: string;
        etablissementId: string;
        duree: number;
        format: string;
        taille: number;
        capturedAt: string;
    }[];
}, {
    captures: {
        deviceId: string;
        etablissementId: string;
        duree: number;
        format: string;
        taille: number;
        capturedAt: string;
    }[];
}>;
export declare const createDiffusionSchema: z.ZodObject<{
    etablissementId: z.ZodString;
    musicId: z.ZodString;
    titre: z.ZodString;
    artiste: z.ZodString;
    playedAt: z.ZodString;
    duree: z.ZodNumber;
    source: z.ZodEnum<["capture", "manual", "playlist"]>;
}, "strip", z.ZodTypeAny, {
    artiste: string;
    etablissementId: string;
    duree: number;
    musicId: string;
    titre: string;
    playedAt: string;
    source: "capture" | "manual" | "playlist";
}, {
    artiste: string;
    etablissementId: string;
    duree: number;
    musicId: string;
    titre: string;
    playedAt: string;
    source: "capture" | "manual" | "playlist";
}>;
export declare const registerDeviceSchema: z.ZodObject<{
    deviceId: z.ZodString;
    platform: z.ZodEnum<["ios", "android"]>;
    appVersion: z.ZodString;
    osVersion: z.ZodString;
    pushToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
    platform: "ios" | "android";
    appVersion: string;
    osVersion: string;
    pushToken?: string | undefined;
}, {
    deviceId: string;
    platform: "ios" | "android";
    appVersion: string;
    osVersion: string;
    pushToken?: string | undefined;
}>;
export declare const createDeviceSchema: z.ZodObject<{
    nom: z.ZodString;
    type: z.ZodEnum<["mobile", "tablette", "desktop", "autre"]>;
    etablissementId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "mobile" | "tablette" | "desktop" | "autre";
    nom: string;
    etablissementId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    type: "mobile" | "tablette" | "desktop" | "autre";
    nom: string;
    etablissementId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const updateDeviceSchema: z.ZodObject<{
    nom: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nom?: string | undefined;
    isActive?: boolean | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    nom?: string | undefined;
    isActive?: boolean | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const generateRapportSchema: z.ZodObject<{
    type: z.ZodEnum<["etablissement", "periode", "artiste"]>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    etablissementId: z.ZodOptional<z.ZodString>;
    artiste: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodEnum<["pdf", "excel"]>>;
}, "strip", z.ZodTypeAny, {
    type: "etablissement" | "artiste" | "periode";
    format: "pdf" | "excel";
    startDate: string;
    endDate: string;
    artiste?: string | undefined;
    etablissementId?: string | undefined;
}, {
    type: "etablissement" | "artiste" | "periode";
    startDate: string;
    endDate: string;
    artiste?: string | undefined;
    etablissementId?: string | undefined;
    format?: "pdf" | "excel" | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
