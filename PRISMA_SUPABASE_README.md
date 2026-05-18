# 🎉 Configuration Prisma + Supabase Terminée !

## ✅ Ce qui a été réalisé

### 1. **Schema Prisma Optimisé pour Supabase**
- 📄 Fichier : `prisma/schema.prisma`
- ✨ 10 modèles de données (User, Etablissement, AudioCapture, etc.)
- 🔗 Relations complètes avec cascades appropriées
- ⚡ Enums pour la validation des données
- 🎯 Compatible avec PostgreSQL/Supabase

### 2. **Fichiers de Configuration**

#### `.env` (mis à jour)
```bash
# URLs de connexion Supabase configurées
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:5432/postgres"
```

#### `.env.example` (nouveau)
- Template complet avec tous les variables nécessaires
- Commentaires détaillés pour chaque section
- Instructions pour récupérer les credentials Supabase

#### `SUPABASE_SETUP.md` (nouveau)
- Guide étape-par-étape complet
- Instructions pour créer le projet Supabase
- Récupération des clés API et URLs
- Commands Prisma essentielles
- Section dépannage incluse

---

## 📋 Prochaines Étapes (À faire MANUELLEMENT)

### Étape 1 : Créer votre projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"New Project"**
3. Remplissez :
   - **Name** : `hmis-api` (ou votre choix)
   - **Database Password** : ⚠️ **Notez-le !**
   - **Region** : Plus proche de vous (ex: `eu-west-1`)
4. Attendez ~2 minutes que le projet soit prêt

### Étape 2 : Récupérer les URLs de connexion

Dans le dashboard Supabase :

1. **Settings** → **API**
   - Copiez `Project URL`
   - Copiez `service_role key` (secrète !)

2. **Settings** → **Database**
   - Copiez l'URI de connexion (Pooler mode, port 6543)
   - Copiez l'URI de connexion directe (port 5432)

### Étape 3 : Mettre à jour `.env`

Éditez `/workspace/hmi-api/.env` et remplacez :

```bash
# Remplacez ces valeurs par les vôtres
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Remplacez [YOUR-PASSWORD] par votre mot de passe Supabase
DATABASE_URL="postgresql://postgres.VOTRE_PROJET:VOTRE_MDP@aws-0-VOTRE_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

DIRECT_URL="postgresql://postgres.VOTRE_PROJET:VOTRE_MDP@db.VOTRE_PROJET.supabase.co:5432/postgres?sslmode=require"
```

### Étape 4 : Initialiser la base de données

Une fois `.env` configuré, exécutez :

```bash
cd /workspace/hmi-api

# Générer le client Prisma
npx prisma generate

# Créer les tables dans Supabase
npx prisma migrate dev --name init

# (Optionnel) Ouvrir Prisma Studio pour voir les données
npx prisma studio
```

---

## 📊 Structure de la Base de Données

### Tables créées :

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (admins, gérants, partenaires) |
| `etablissements` | Bars, maquis, boîtes de nuit |
| `devices` | Appareils mobiles enregistrés |
| `audio_captures` | Captures audio pour reconnaissance |
| `music_recognitions` | Résultats reconnaissance ACRCloud |
| `diffusions` | Historique des diffusions musicales |
| `otps` | Codes OTP pour vérification SMS |
| `refresh_tokens` | Tokens de session JWT |
| `notifications` | Notifications push/in-app |
| `rapports` | Rapports générés (PDF, Excel) |

### Relations principales :

```
User (1) ── (1) Etablissement
User (1) ── (N) Device
User (1) ── (N) AudioCapture
Etablissement (1) ── (N) Device
Etablissement (1) ── (N) Diffusion
AudioCapture (1) ── (1) MusicRecognition
MusicRecognition (1) ── (N) Diffusion
```

---

## 🔧 Commandes Prisma Utiles

```bash
# Valider le schema
npx prisma validate

# Générer le client TypeScript
npx prisma generate

# Créer une migration
npx prisma migrate dev --name nom_migration

# Appliquer en production
npx prisma migrate deploy

# Voir les données (GUI)
npx prisma studio

# Reset complet (⚠️ efface tout)
npx prisma migrate reset
```

---

## ⚠️ Points d'Attention

### 1. Espace Disque Insuffisant
Le serveur actuel n'a pas assez d'espace pour générer le client Prisma.
**Solution** : Exécutez `npx prisma generate` sur votre machine locale après avoir cloné le projet.

### 2. DIRECT_URL Requise
Prisma Migrate nécessite `DIRECT_URL` pour fonctionner avec Supabase.
**Pourquoi** : Supabase utilise PgBouncer (pooler) qui n'est pas compatible avec certaines opérations de migration.

### 3. SSL Obligatoire
Toutes les connexions à Supabase doivent utiliser SSL (`sslmode=require`).

### 4. Row Level Security (RLS)
Par défaut, Prisma utilise le `service_role key` qui contourne le RLS.
**Recommandation** : Pour la production, implémentez des politiques RLS dans Supabase.

---

## 📚 Ressources

- [Guide complet SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- [Documentation Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## ✨ Après la Configuration

Une fois la base de données initialisée, vous pourrez :

1. ✅ Créer des utilisateurs avec Prisma Client
2. ✅ Enregistrer des établissements
3. ✅ Stocker les captures audio
4. ✅ Suivre les diffusions musicales
5. ✅ Générer des rapports
6. ✅ Envoyer des notifications

**Le schema est validé et prêt à l'emploi !** 🚀
