# HMIS API - Hankes Music Intelligence System

API REST Express/TypeScript pour le recensement des etablissements musicaux et le suivi des diffusions en Cote d'Ivoire. Le backend combine authentification JWT/OTP, gestion des roles, base PostgreSQL via Prisma/Supabase, capture audio et reconnaissance musicale hybride.

## Etat du projet

- Version applicative : `2.0.0`
- Runtime : Node.js `>= 18`
- Framework : Express `5.1`
- Langage : TypeScript `5.8`
- ORM : Prisma `6.19`
- Base : PostgreSQL, avec configuration Supabase
- Documentation API : [api-hankees.yaml](./api-hankees.yaml)
- Collection Postman : [hmis-api.postman_collection.json](./hmis-api.postman_collection.json)

## Fonctionnalites principales

- Authentification JWT avec access token court et refresh token stocke en base.
- OTP SMS pour inscription, connexion, reset password ou double facteur.
- Roles applicatifs : `admin`, `recenseur`, `etablissement`, `partenaire`, `artiste`.
- Creation et validation d'etablissements par admin ou recenseur.
- Association d'utilisateurs a un etablissement.
- Inscription publique d'artistes, profil artiste et revendication de musiques reconnues.
- Capture audio mobile avec pipeline hybride : cache local, fingerprint local puis ACRCloud.
- Synchronisation de captures hors ligne avec detection de doublons et seuil de confiance.
- Historique des diffusions, KPIs, carte, classements et evolution quotidienne.
- Rapports asynchrones, telechargement lorsque le rapport est termine.
- Devices mobiles, notifications in-app et endpoints de health/ready/metrics.

## Architecture

```text
Clients mobile/web
  -> API Express / TypeScript
  -> Middlewares security, auth, validation, logs
  -> Services metier
  -> Prisma Client
  -> PostgreSQL / Supabase

Pipeline audio:
Capture mobile -> cache reconnaissance -> fingerprint local -> ACRCloud -> tracks/reconnaissances -> diffusions
```

## Installation

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

L'API ecoute par defaut sur `http://localhost:3000` et les routes versionnees sont sous `/v1`.

## Configuration

Les variables principales sont decrites dans [.env.example](./.env.example).

Variables indispensables en environnement reel :

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

JWT_SECRET=votre-secret-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

ACRCLOUD_API_KEY=
ACRCLOUD_API_SECRET=
ACRCLOUD_HOST=identify-eu-west-1.acrcloud.com
```

Variables utiles pour l'audio :

```bash
AUDIO_MAX_FILE_SIZE_BYTES=10485760
AUDIO_MIN_CONFIDENCE=0.6
AUDIO_DUPLICATE_WINDOW_MINUTES=10
FPCALC_PATH=fpcalc
FINGERPRINT_TIMEOUT_MS=5000
FINGERPRINT_ALLOW_HASH_FALLBACK=true
MUSIC_RECOGNITION_CACHE_ENABLED=true
MUSIC_RECOGNITION_CACHE_TTL_SECONDS=86400
```

Notes :

- `DATABASE_URL` est utilisee par Prisma au runtime.
- `DIRECT_URL` est utilisee par Prisma pour les migrations.
- L'endpoint `POST /v1/upload/image` valide actuellement le fichier mais retourne `501` tant qu'un stockage fichier n'est pas branche.
- Twilio, AudD, S3 et SES sont prevus dans la configuration mais certains flux sont encore des stubs ou des integrations a finaliser selon l'environnement.

## Commandes

```bash
npm run dev              # serveur de developpement avec nodemon + ts-node
npm run build            # prisma generate + compilation TypeScript
npm start                # lance dist/index.js
npm test                 # tests Jest
npm run test:unit        # tests unitaires
npm run test:integration # tests d'integration
npm run test:coverage    # couverture
npm run create-admin     # creation admin via script
npm run verify-otp       # verification OTP via script
```

Commandes Prisma courantes :

```bash
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma validate
npx prisma studio
```

## Routes principales

Toutes les routes ci-dessous sont prefixees par `/v1`.

### Authentification

| Methode | Route | Auth | Description |
|---|---|---:|---|
| POST | `/auth/register` | Non | Cree un compte et genere un OTP |
| POST | `/auth/login` | Non | Retourne access token et refresh token |
| POST | `/auth/logout` | Oui | Revoque les refresh tokens de l'utilisateur |
| POST | `/auth/refresh` | Non | Renouvelle les tokens |
| POST | `/auth/otp/envoyer` | Non | Genere un OTP |
| POST | `/auth/otp/verifier` | Non | Valide un OTP |
| POST | `/auth/password/reset` | Non | Demande de reset password |
| POST | `/auth/password/reset/confirmer` | Non | Confirmation de reset password |
| GET | `/auth/me` | Oui | Profil connecte |
| PATCH | `/auth/changer-password` | Oui | Change le mot de passe |

### Etablissements

| Methode | Route | Auth | Description |
|---|---|---:|---|
| GET | `/etablissements` | Oui | Liste paginee, filtres ville/type/search |
| POST | `/etablissements` | Oui | Cree un etablissement avec gerant existant ou nouveau gerant |
| GET | `/etablissements/{id}` | Oui | Detail, selon droits de gestion |
| PUT | `/etablissements/{id}` | Oui | Mise a jour, selon droits de gestion |
| DELETE | `/etablissements/{id}` | Oui | Suppression admin |
| POST | `/etablissements/{id}/valider` | Oui | Validation admin |
| POST | `/etablissements/{id}/suspendre` | Oui | Suspension admin |
| GET | `/etablissements/{id}/stats` | Oui | Statistiques de diffusion |
| GET | `/etablissements/{id}/diffusions` | Oui | Diffusions de l'etablissement |
| GET | `/etablissements/{id}/users` | Oui | Utilisateurs lies |
| POST | `/etablissements/{id}/users` | Oui | Associe un utilisateur |
| DELETE | `/etablissements/{id}/users/{userId}` | Oui | Retire un utilisateur |

### Utilisateurs et artistes

| Methode | Route | Auth | Description |
|---|---|---:|---|
| GET | `/utilisateurs` | Admin | Liste des utilisateurs |
| POST | `/utilisateurs` | Admin | Cree un utilisateur |
| POST | `/utilisateurs/etablissement` | Admin/recenseur | Cree un utilisateur rattachable a un etablissement |
| POST | `/utilisateurs/recenseur` | Admin | Cree un agent recenseur |
| GET | `/utilisateurs/recenseurs` | Admin | Liste les recenseurs |
| GET | `/utilisateurs/recenseurs/{id}/etablissements` | Admin | Etablissements crees par un recenseur |
| POST | `/artistes/register` | Non | Inscription publique artiste |
| GET | `/artistes/me` | Artiste | Profil artiste |
| PUT | `/artistes/me` | Artiste | Mise a jour profil artiste |
| GET | `/artistes/me/diffusions` | Artiste | Recapitulatif des diffusions |
| GET | `/artistes/me/musiques` | Artiste | Musiques revendiquees |
| POST | `/artistes/me/revendiquer` | Artiste | Revendique une musique reconnue |

### Audio, diffusions et dashboard

| Methode | Route | Auth | Description |
|---|---|---:|---|
| GET | `/audio/config` | Oui | Configuration recommandee de capture |
| POST | `/audio/capturer` | Oui | Upload multipart d'un extrait audio |
| POST | `/audio/sync` | Oui | Synchronise des captures hors ligne |
| GET | `/audio/statut/{captureId}` | Oui | Statut d'une capture |
| GET | `/audio/soiree/stats` | Oui | Statistiques de capture par date |
| GET | `/diffusions` | Oui | Liste paginee des diffusions |
| GET | `/diffusions/{id}` | Oui | Detail d'une diffusion |
| GET | `/dashboard/kpis` | Admin | KPIs globaux |
| GET | `/dashboard/carte` | Oui | Donnees cartographiques |
| GET | `/dashboard/top-musiques` | Oui | Classement des musiques |
| GET | `/dashboard/top-artistes` | Oui | Classement des artistes |
| GET | `/dashboard/evolution` | Oui | Evolution journaliere |

### Autres modules

| Methode | Route | Auth | Description |
|---|---|---:|---|
| GET/POST | `/rapports` | Oui | Liste ou genere un rapport |
| GET | `/rapports/{id}` | Oui | Detail/statut d'un rapport |
| GET | `/rapports/{id}/telecharger` | Oui | URL de telechargement si termine |
| GET/POST | `/devices` | Oui | Liste ou enregistre un appareil |
| PATCH/DELETE | `/devices/{id}` | Oui | Met a jour ou supprime un appareil |
| GET | `/notifications` | Oui | Notifications de l'utilisateur |
| POST | `/notifications/lire-tout` | Oui | Marque tout comme lu |
| POST | `/notifications/{id}/lire` | Oui | Marque une notification comme lue |
| POST | `/upload/image` | Oui | Validation image, stockage non configure |
| GET | `/health` | Non | Sante API |
| GET | `/health/database` | Non | Check PostgreSQL |
| GET | `/health/ready` | Non | Readiness |
| GET | `/health/metrics` | Non | Metriques Prometheus |

## Format des reponses

Succes :

```json
{
  "success": true,
  "data": {}
}
```

Erreur :

```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

Pagination :

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Structure

```text
src/
  app.ts
  index.ts
  config/
  middleware/
  routes/
  services/
  database/
    index.ts
    errors.ts
    services/
  types/
  utils/
  __tests__/
prisma/
  schema.prisma
  migrations/
scripts/
flow/
api-hankees.yaml
```

## Documentation additionnelle

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- [PRISMA_SUPABASE_README.md](./PRISMA_SUPABASE_README.md)
- [GUIDE_TESTS.md](./GUIDE_TESTS.md)
- [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)
- [CONFIGURATION_ADMIN.md](./CONFIGURATION_ADMIN.md)
- [SECURITY.md](./SECURITY.md)

## Licence

Confidentiel - HANKES Technologies. Tous droits reserves.
