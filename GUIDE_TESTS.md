# 🧪 Guide de Test - HMIS API

## 📋 Vue d'ensemble

Ce document explique comment exécuter les tests de l'API HMIS et comprendre la stratégie de test mise en place.

---

## 🚀 Installation des Dépendances de Test

Les dépendances de test sont déjà incluses dans `package.json` :

```bash
npm install
```

**Dépendances installées :**
- `jest` : Framework de test
- `ts-jest` : Support TypeScript pour Jest
- `supertest` : Test des endpoints HTTP
- `@types/jest` : Types TypeScript pour Jest
- `@types/supertest` : Types TypeScript pour Supertest
- `eslint` : Linting du code

---

## ▶️ Commandes de Test

### Exécuter tous les tests
```bash
npm test
```

### Mode watch (re-exécution automatique)
```bash
npm run test:watch
```

### Avec couverture de code
```bash
npm run test:coverage
```
→ Génère un rapport HTML dans `coverage/`

### Tests unitaires uniquement
```bash
npm run test:unit
```

### Tests d'intégration uniquement
```bash
npm run test:integration
```

### Pour CI/CD
```bash
npm run test:ci
```
→ Mode CI avec couverture et exécution séquentielle

---

## 📁 Structure des Tests

```
src/
└── __tests__/
    ├── unit/              # Tests unitaires
    │   └── auth.utils.test.ts
    └── integration/       # Tests d'intégration
        └── health.test.ts
```

### Conventions de nommage
- Fichiers de test : `*.test.ts`
- Location : `__tests__/unit/` ou `__tests__/integration/`
- Pattern Jest : `**/__tests__/**/*.test.ts`

---

## ✅ Tests Implémentés

### 1. Tests Unitaires (`auth.utils.test.ts`)

**Fonctions testées :**
- `hashPassword()` : Hashage bcrypt avec salt
- `verifyPassword()` : Vérification mot de passe
- `generateOTP()` : Génération code 6 chiffres
- `generateAccessToken()` : Création JWT access token
- `generateRefreshToken()` : Création JWT refresh token

**Couverture :**
- ✅ Hashage correct avec bcrypt
- ✅ Salts uniques à chaque hash
- ✅ Validation mot de passe correct/incorrect
- ✅ Format OTP 6 chiffres
- ✅ Unicité des OTPs
- ✅ Tokens JWT valides (3 parties)

### 2. Tests d'Intégration (`health.test.ts`)

**Endpoints testés :**
- `GET /v1/health` : Statut API
- `GET /v1/health/database` : Connexion DB

**Vérifications :**
- ✅ Status code 200
- ✅ Structure de réponse (success, data)
- ✅ Présence des champs requis (status, timestamp, version)
- ✅ Format de version sémantique

---

## 🔧 Configuration Jest

**Fichier :** `jest.config.js`

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/app.ts',
    '!src/database/client.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['dotenv/config'],
}
```

**TypeScript :** `tsconfig.json`
```json
{
  "compilerOptions": {
    "types": ["node", "jest"],
    "isolatedModules": true
  }
}
```

---

## 📊 Couverture de Code

La couverture est générée avec :
```bash
npm run test:coverage
```

**Rapports générés :**
- `coverage/lcov.info` : Format LCOV pour CI
- `coverage/index.html` : Rapport HTML interactif
- Terminal : Résumé textuel

**Fichiers exclus :**
- `index.ts` : Point d'entrée
- `app.ts` : Configuration Express
- `database/client.ts` : Client Prisma

---

## 🧩 Écrire de Nouveaux Tests

### Template de Test Unitaire

```typescript
import { maFonction } from '../../chemin/vers/module';

describe('Nom du Module', () => {
  describe('nomDeLaFonction', () => {
    it('devrait faire quelque chose', async () => {
      const resultat = await maFonction(param);
      expect(resultat).toBe(valeurAttendue);
    });

    it('devrait gérer le cas d\'erreur', async () => {
      await expect(maFonction(invalidParam)).rejects.toThrow();
    });
  });
});
```

### Template de Test d'Intégration

```typescript
import request from 'supertest';
import { app } from '../../app';

describe('Nom de la Route', () => {
  describe('GET /v1/endpoint', () => {
    it('devrait retourner 200', async () => {
      const response = await request(app)
        .get('/v1/endpoint')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('devrait nécessiter une authentification', async () => {
      const response = await request(app)
        .post('/v1/endpoint')
        .expect(401);

      expect(response.body.error).toBe('Token non fourni');
    });
  });
});
```

---

## 🔐 Tests avec Authentification

Pour tester les endpoints protégés :

```typescript
import { generateAccessToken } from '../../middleware/auth';

const createAuthHeader = (userId: string, role: string) => {
  const token = generateAccessToken({
    userId,
    email: 'test@example.com',
    role: role as any,
  });
  return `Bearer ${token}`;
};

// Utilisation
const response = await request(app)
  .get('/v1/etablissements')
  .set('Authorization', createAuthHeader('user-123', 'admin'))
  .expect(200);
```

---

## 🎯 Bonnes Pratiques

### 1. Nommage des Tests
```typescript
// ✅ Bon
it('devrait retourner une erreur 404 si l\'établissement n\'existe pas');

// ❌ Mauvais
it('test 404');
```

### 2. Arrange-Act-Assert
```typescript
it('devrait créer un établissement', async () => {
  // Arrange
  const data = { nom: 'Test Bar', ville: 'Abidjan' };

  // Act
  const response = await request(app)
    .post('/v1/etablissements')
    .send(data);

  // Assert
  expect(response.body.data.nom).toBe('Test Bar');
});
```

### 3. Isolation des Tests
- Utiliser des données de test uniques
- Nettoyer après chaque test (`afterEach`)
- Ne pas dépendre de l'ordre des tests

### 4. Mocking
```typescript
// Mock d'un service externe
jest.mock('../../services/acrcloud.service', () => ({
  recognizeTrack: jest.fn().mockResolvedValue({ titre: 'Test' }),
}));
```

---

## 🐛 Dépannage

### Erreur : "Cannot find name 'describe'"
→ Vérifier que `@types/jest` est installé  
→ Ajouter `"jest"` dans `tsconfig.json > compilerOptions > types`

### Erreur : "TypeError: Cannot read properties of undefined (reading 'address')"
→ Exporter `{ app }` depuis `app.ts` : `export { app };`

### Tests lents
→ Augmenter `testTimeout` dans `jest.config.js`  
→ Utiliser `--runInBand` pour exécution séquentielle

### Problèmes de coverage
→ Vérifier `collectCoverageFrom` dans `jest.config.js`  
→ Exclure les fichiers non testables

---

## 📈 Métriques de Qualité

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| Tests unitaires | 50+ | 11 |
| Tests intégration | 30+ | 3 |
| Coverage | 80%+ | ~15% |
| Temps d'exécution | < 30s | ~11s |

---

## 🔄 Intégration Continue (CI/CD)

Exemple GitHub Actions (`.github/workflows/test.yml`) :

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Ressources

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/writingtests/tests.md)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Dernière mise à jour :** Janvier 2026  
**Version HMIS API :** 2.0.0
