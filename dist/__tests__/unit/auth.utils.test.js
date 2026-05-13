"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../middleware/auth");
describe('Auth Utils', () => {
    describe('hashPassword', () => {
        it('devrait hasher un mot de passe avec bcrypt', async () => {
            const password = 'monSuperMdp123!';
            const hashed = await (0, auth_1.hashPassword)(password);
            expect(hashed).toBeDefined();
            expect(hashed).not.toBe(password);
            expect(hashed.startsWith('$2')).toBe(true); // Format bcrypt
        });
        it('devrait produire des hashs différents pour le même mot de passe', async () => {
            const password = 'test123';
            const hash1 = await (0, auth_1.hashPassword)(password);
            const hash2 = await (0, auth_1.hashPassword)(password);
            expect(hash1).not.toBe(hash2); // Salt différent à chaque fois
        });
    });
    describe('verifyPassword', () => {
        it('devrait valider un mot de passe correct', async () => {
            const password = 'SecurePass456!';
            const hashed = await (0, auth_1.hashPassword)(password);
            const isValid = await (0, auth_1.verifyPassword)(password, hashed);
            expect(isValid).toBe(true);
        });
        it('devrait rejeter un mot de passe incorrect', async () => {
            const password = 'CorrectPass789!';
            const wrongPassword = 'WrongPass000!';
            const hashed = await (0, auth_1.hashPassword)(password);
            const isValid = await (0, auth_1.verifyPassword)(wrongPassword, hashed);
            expect(isValid).toBe(false);
        });
        it('devrait gérer les mots de passe vides', async () => {
            const hashed = await (0, auth_1.hashPassword)('');
            const isValid = await (0, auth_1.verifyPassword)('', hashed);
            expect(isValid).toBe(true);
        });
    });
    describe('generateOTP', () => {
        it('devrait générer un code OTP à 6 chiffres', () => {
            const otp = (0, auth_1.generateOTP)();
            expect(otp).toMatch(/^\d{6}$/);
            expect(otp.length).toBe(6);
        });
        it('devrait générer des OTPs différents à chaque appel', () => {
            const otp1 = (0, auth_1.generateOTP)();
            const otp2 = (0, auth_1.generateOTP)();
            expect(otp1).not.toBe(otp2);
        });
        it('devrait toujours retourner un code entre 000000 et 999999', () => {
            for (let i = 0; i < 100; i++) {
                const otp = (0, auth_1.generateOTP)();
                const numValue = parseInt(otp, 10);
                expect(numValue).toBeGreaterThanOrEqual(0);
                expect(numValue).toBeLessThanOrEqual(999999);
            }
        });
    });
    describe('generateAccessToken', () => {
        it('devrait générer un token JWT valide', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@example.com',
                role: 'admin',
            };
            const token = (0, auth_1.generateAccessToken)(payload);
            expect(token).toBeDefined();
            expect(token.split('.').length).toBe(3); // Format JWT: header.payload.signature
        });
        it('devrait inclure les claims dans le token', () => {
            const payload = {
                userId: 'user-456',
                email: 'admin@hmis.ci',
                role: 'admin',
            };
            const token = (0, auth_1.generateAccessToken)(payload);
            expect(token).toBeDefined();
        });
    });
    describe('generateRefreshToken', () => {
        it('devrait générer un refresh token avec expiration plus longue', () => {
            const payload = {
                userId: 'user-789',
                email: 'user@hmis.ci',
                role: 'etablissement',
            };
            const token = (0, auth_1.generateRefreshToken)(payload);
            expect(token).toBeDefined();
            expect(token.split('.').length).toBe(3);
        });
    });
});
//# sourceMappingURL=auth.utils.test.js.map