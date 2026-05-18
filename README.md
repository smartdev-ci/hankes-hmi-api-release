# HMIS API - Hankes Music Intelligence System

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/hankes/hmis-api)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Confidential-red.svg)](LICENSE)

API RESTful sécurisée pour le recensement des établissements musicaux et le tracking des diffusions musicales en Côte d'Ivoire (BURIDA).

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Démarrage](#-démarrage)
- [Sécurité OWASP](#-sécurité-owasp)
- [API Reference](#-api-reference)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Structure du Projet](#-structure-du-projet)

---

## ✨ Fonctionnalités

### Authentification & Autorisation
- ✅ JWT Access Token (15 min) + Refresh Token (7 jours)
- ✅ OTP SMS via Twilio pour vérification
- ✅ RBAC (Role-Based Access Control) : admin, etablissement, partenaire
- ✅ Hashage bcrypt (12 rounds) des mots de passe
- ✅ Rate limiting par IP

### Gestion des Établissements
- ✅ CRUD complet (bars, maquis, caves, boîtes de nuit, restaurants, hôtels)
- ✅ Validation administrative par admin
- ✅ Suspension/activation des comptes
- ✅ Géolocalisation (latitude/longitude)

### Reconnaissance Musicale
- ✅ ACRCloud (primaire) + AudD (fallback)
- ✅ Capture audio 10-30s depuis mobile
- ✅ Stockage temporaire S3
- ✅ Matching ISRC, titre, artiste, label, genre

### Tracking des Diffusions
- ✅ Historique complet des plays
- ✅ Source identification (capture, manual, playlist)
- ✅ Statistiques par période, établissement, artiste

### Dashboard & Rapports
- ✅ KPIs en temps réel
- ✅ Top musiques, artistes, établissements
- ✅ Export PDF/Excel
- ✅ Carte interactive des établissements

### Notifications
- ✅ Push notifications (FCM/APNs)
- ✅ SMS via Twilio
- ✅ Emails via AWS SES

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTS                                │
│         Mobile (iOS/Android) | Web Admin | Partner          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER                            │
│                   (Nginx / AWS ALB)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    HMIS API (Express)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  Auth    │ │ Routes   │ │Services  │ │  Middleware  │   │
│  │  JWT+OTP │ │ 12 APIs  │ │  Prisma  │ │Security/Logs │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  Redis    │  │  AWS S3   │  │  Twilio   │  │  ACRCloud │
│  (Cache)  │  │ (Storage) │  │  (SMS)    │  │  (Music)  │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
        │
        ▼
┌───────────────────┐
│   Supabase        │
│   (PostgreSQL)    │
│   + Prisma ORM    │
└───────────────────┘
```

### Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Runtime | Node.js | 18+ |
| Langage | TypeScript | 5.8.3 |
| Framework | Express | 5.1.0 |
| ORM | Prisma | 5.22.0 |
| Database | PostgreSQL (Supabase) | 15+ |
| Cache | Redis | 7+ |
| Auth | JWT + OTP | - |
| Storage | AWS S3 | - |
| SMS | Twilio | - |
| Email | AWS SES | - |
| Music Recognition | ACRCloud + AudD | - |

---

## 📦 Prérequis

- **Node.js** >= 18.x ([Télécharger](https://nodejs.org/))
- **npm** >= 9.x (inclus avec Node.js)
- **Supabase** compte gratuit ou payant ([supabase.com](https://supabase.com))
- **Redis** (optionnel pour dev, requis pour prod)
- **Comptes externes** (voir Configuration)

---

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/hankes/hmis-api.git
cd hmis-api
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
```

Éditez `.env` avec vos credentials (voir [Configuration](#-configuration)).

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations (dev)
npx prisma migrate dev

# OU pour production
npx prisma migrate deploy
```

### 5. Démarrer le serveur

```bash
# Développement (avec hot-reload)
npm run dev

# Production
npm run build
npm start
```

L'API est accessible sur `http://localhost:3000`

---

## ⚙️ Configuration

### Variables d'Environnement Obligatoires

Copiez `.env.example` vers `.env` et configurez :

#### 🔐 JWT Security
```bash
# Générer un secret fort : openssl rand -hex 64
JWT_SECRET=votre-secret-tres-long-et-securise
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### 🗄️ Supabase Database
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **Settings > Database**
3. Copiez les URLs de connexion :

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

#### 📱 Twilio SMS (OTP)
1. Créez un compte sur [twilio.com](https://twilio.com)
2. Récupérez vos credentials :

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

#### 🎵 ACRCloud (Reconnaissance Musicale)
1. Inscrivez-vous sur [acrcloud.com](https://acrcloud.com)
2. Créez un projet "Audio Fingerprint"
3. Récupérez les clés :

```bash
ACRCLOUD_API_KEY=votre_api_key
ACRCLOUD_API_SECRET=votre_api_secret
ACRCLOUD_HOST=identify-eu-west-1.acrcloud.com
```

#### ☁️ AWS S3 (Storage Audio)
```bash
AWS_S3_BUCKET=hmis-uploads
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
```

#### 📧 AWS SES (Emails)
```bash
SES_FROM_EMAIL=noreply@hmis-project.ci
```

#### 🚦 Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🎯 Démarrage

### Commandes Disponibles

```bash
# Développement
npm run dev              # Lance avec nodemon + ts-node

# Build production
npm run build            # Compile TypeScript + Prisma generate

# Production
npm start                # Lance le serveur compilé

# Prisma
npx prisma studio        # GUI pour explorer la BDD
npx prisma migrate dev   # Crée et applique une migration
npx prisma migrate deploy # Applique les migrations en prod
npx prisma validate      # Valide le schema.prisma
```

### Vérifier que l'API fonctionne

```bash
curl http://localhost:3000/
```

Réponse attendue :
```json
{
  "success": true,
  "message": "HMIS API - Hankes Music Intelligence System",
  "version": "2.0.0",
  "documentation": "/api-docs"
}
```

### Health Check

```bash
curl http://localhost:3000/v1/health
```

---

## 🔒 Sécurité OWASP

Cette API implémente les meilleures pratiques de sécurité conformes aux recommandations OWASP :

### OWASP Top 10 Mitigations

| Vulnérabilité | Mitigation Implémentée |
|---------------|------------------------|
| **A01: Broken Access Control** | ✅ RBAC middleware, vérification propriétaire ressources |
| **A02: Cryptographic Failures** | ✅ HTTPS obligatoire, bcrypt 12 rounds, secrets forts |
| **A03: Injection** | ✅ Prisma ORM (paramétré), validation Zod stricte |
| **A04: Insecure Design** | ✅ Rate limiting, OTP expiration, token refresh rotation |
| **A05: Security Misconfiguration** | ✅ Helmet.js headers, CORS configuré, env séparés |
| **A06: Vulnerable Components** | ✅ npm audit CI, dépendances à jour |
| **A07: Auth Failures** | ✅ JWT court (15min), refresh tokens hashés, OTP 6 chiffres |
| **A08: Data Integrity** | ✅ Validation input/output, checksums S3 |
| **A09: Logging Failures** | ✅ Morgan + logger structuré, pas de données sensibles |
| **A10: SSRF** | ✅ URLs whitelistées, pas de fetch utilisateur |

### Mesures de Sécurité Additionnelles

#### 🔐 Authentification
- JWT Access Token : 15 minutes maximum
- Refresh Token : 7 jours, hashé en BDD, rotation à chaque usage
- OTP SMS : 6 chiffres, expiration 10 min, max 3 tentatives
- Password policy : min 8 caractères (renforçable)

#### 🛡️ Headers HTTP (Helmet.js)
```typescript
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

#### 🚦 Rate Limiting
- Par défaut : 100 requêtes / minute / IP
- Endpoints sensibles (/auth/*) : limites renforcées
- Header `Retry-After` sur réponse 429

#### 📝 Logging Sécurisé
- Pas de mots de passe, tokens, PII dans les logs
- Correlation ID par requête
- Logs structurés JSON en production

#### 🔒 Chiffrement
- TLS 1.3 requis en production
- bcrypt 12 rounds pour mots de passe
- HMAC-SHA1 pour signatures ACRCloud

### Checklist Sécurité Production

- [ ] HTTPS activé (certificat Let's Encrypt ou AWS ACM)
- [ ] Secrets stockés dans AWS Secrets Manager / Vault
- [ ] Firewall restreint aux IPs nécessaires
- [ ] Backup automatique BDD (Supabase inclus)
- [ ] Monitoring activé (Prometheus + Grafana)
- [ ] Alertes configurées (erreurs 5xx, auth failures)

---

## 📚 API Reference

### Documentation Complète

La documentation OpenAPI 3.0 est disponible dans :
- **Fichier YAML** : [`api-hankees.yaml`](./api-hankees.yaml)
- **Swagger UI** : `/api-docs` (après configuration)

### Endpoints Principaux

#### Authentification (`/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Inscription utilisateur + OTP |
| POST | `/login` | ❌ | Connexion (retourne JWT) |
| POST | `/logout` | ✅ | Déconnexion |
| POST | `/refresh` | ❌ | Rafraîchir access token |
| POST | `/otp/envoyer` | ❌ | Envoyer code SMS |
| POST | `/otp/verifier` | ❌ | Vérifier code OTP |
| GET | `/me` | ✅ | Profil utilisateur connecté |
| PATCH | `/changer-password` | ✅ | Changer mot de passe |

#### Établissements (`/v1/etablissements`)

| Method | Endpoint | Auth | Rôles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | ✅ | Tous | Liste (paginée, filtres) |
| POST | `/` | ✅ | admin, etablissement | Créer |
| GET | `/:id` | ✅ | Propriétaire ou admin | Détails |
| PUT | `/:id` | ✅ | Propriétaire ou admin | Mettre à jour |
| DELETE | `/:id` | ✅ | admin | Supprimer |
| POST | `/:id/valider` | ✅ | admin | Valider établissement |
| POST | `/:id/suspendre` | ✅ | admin | Suspendre |
| GET | `/:id/stats` | ✅ | Propriétaire ou admin | Statistiques |

#### Diffusions (`/v1/diffusions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Historique (filtres, pagination) |
| POST | `/` | ✅ | Logger une diffusion |
| GET | `/top/musiques` | ✅ | Top 50 musiques |
| GET | `/top/artistes` | ✅ | Top 50 artistes |
| GET | `/top/etablissements` | ✅ | Top 50 établissements |

#### Dashboard (`/v1/dashboard`)

| Method | Endpoint | Auth | Rôles | Description |
|--------|----------|------|-------|-------------|
| GET | `/kpi` | ✅ | admin | KPIs globaux |
| GET | `/carte` | ✅ | admin | Établissements géolocalisés |
| GET | `/evolution` | ✅ | admin | Courbe d'évolution |

#### Audio (`/v1/audio`)

| Method | Endpoint | Auth | Rôles | Description |
|--------|----------|------|-------|-------------|
| POST | `/capture` | ✅ | etablissement | Upload sample audio |
| POST | `/sync` | ✅ | etablissement | Sync batch captures |
| GET | `/statut/:id` | ✅ | Propriétaire | Statut reconnaissance |

### Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 201 | Créé |
| 400 | Requête invalide (validation échouée) |
| 401 | Non authentifié (token manquant/invalide) |
| 403 | Non autorisé (rôle insuffisant) |
| 404 | Ressource non trouvée |
| 409 | Conflit (email déjà utilisé) |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

### Format des Réponses

**Succès :**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optionnel"
}
```

**Erreur :**
```json
{
  "success": false,
  "error": "Description de l'erreur",
  "code": "CODE_ERREUR_OPTIONNEL"
}
```

**Validation échouée :**
```json
{
  "success": false,
  "error": "Validation échouée",
  "errors": [
    { "field": "email", "message": "Email invalide" },
    { "field": "password", "message": "Min 8 caractères" }
  ]
}
```

---

## 🧪 Tests

### Lancer les Tests

```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:coverage

# Tests d'intégration
npm run test:integration
```

### Structure des Tests

```
tests/
├── unit/           # Tests unitaires services
├── integration/    # Tests API endpoints
├── e2e/           # Tests bout-en-bout
└── fixtures/      # Données de test
```

---

## 🚀 Déploiement

### Option 1 : Docker

```bash
# Build image
docker build -t hmis-api .

# Run container
docker run -p 3000:3000 --env-file .env hmis-api
```

### Option 2 : PM2 (Production)

```bash
# Installer PM2
npm install -g pm2

# Démarrer
pm2 start dist/index.js --name hmis-api

# Cluster mode (CPU cores)
pm2 start dist/index.js -i max --name hmis-api

# Sauvegarder config
pm2 save

# Startup systemd
pm2 startup
```

### Option 3 : AWS ECS / Kubernetes

Voir [`DEPLOYMENT.md`](./DEPLOYMENT.md) pour guide détaillé.

---

## 📂 Structure du Projet

```
/workspace/
├── src/
│   ├── config/          # Configuration environnement
│   │   └── index.ts
│   ├── middleware/      # Middleware Express
│   │   ├── auth.ts      # JWT, RBAC
│   │   └── index.ts     # Errors, validation, logging
│   ├── routes/          # Routeurs API (12 modules)
│   │   ├── auth.ts
│   │   ├── etablissements.ts
│   │   ├── diffusions.ts
│   │   ├── dashboard.ts
│   │   ├── utilisateurs.ts
│   │   ├── rapports.ts
│   │   ├── devices.ts
│   │   ├── notifications.ts
│   │   ├── audio.ts
│   │   ├── upload.ts
│   │   ├── health.ts
│   │   └── index.ts
│   ├── services/        # Services métier
│   │   └── acrcloud.service.ts
│   ├── database/
│   │   ├── services/    # CRUD Prisma (10 services)
│   │   │   ├── user.service.ts
│   │   │   ├── etablissement.service.ts
│   │   │   ├── audio-capture.service.ts
│   │   │   ├── music-recognition.service.ts
│   │   │   ├── diffusion.service.ts
│   │   │   ├── device.service.ts
│   │   │   ├── otp.service.ts
│   │   │   ├── refresh-token.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── rapport.service.ts
│   │   ├── errors.ts    # Gestion erreurs Prisma
│   │   └── index.ts     # Client Prisma singleton
│   ├── types/           # Types TypeScript
│   │   └── index.ts
│   ├── utils/           # Utilitaires
│   │   └── validators.ts # Schémas Zod
│   ├── app.ts           # Configuration Express
│   └── index.ts         # Point d'entrée
├── prisma/
│   ├── schema.prisma    # Modèles de données
│   └── migrations/      # Migrations auto-générées
├── tests/               # Tests automatisés
├── .env.example         # Template configuration
├── api-hankees.yaml     # Spec OpenAPI 3.0
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📞 Support

- **Email** : support@hmis-project.ci
- **Documentation** : `/api-docs`
- **Status Page** : status.hmis-project.ci

---

## ⚖️ Licence

**Confidentiel — HANKES Technologies**

© 2025 HANKES Technologies. Tous droits réservés.

Ce logiciel est propriétaire et confidentiel. Toute reproduction, distribution ou utilisation non autorisée est interdite.

---
**Développé avec ❤️ par HANKES Technologies**
