# 🚀 Guide de Configuration Prisma + Supabase pour HMIS API

## 📋 Prérequis

- Compte Supabase créé sur [supabase.com](https://supabase.com)
- Node.js 18+ installé
- Prisma CLI installé globalement ou localement

---

## 🔧 Étape 1 : Créer votre projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com)
2. Cliquez sur **"New Project"**
3. Remplissez les informations :
   - **Name** : `hmis-api` (ou votre choix)
   - **Database Password** : ⚠️ **Notez-le précieusement !**
   - **Region** : Choisissez la plus proche (ex: `eu-west-1` pour Europe)
4. Cliquez sur **"Create new project"** et attendez ~2 minutes

---

## 🔑 Étape 2 : Récupérer les credentials

### 2.1 URL et Clés API

Dans le dashboard Supabase :
1. Allez dans **Settings** (roue dentée en bas à gauche)
2. Cliquez sur **API**
3. Copiez les valeurs suivantes :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon/public key** : `eyJhbG...` (clé publique)
   - **service_role key** : `eyJhbG...` (clé secrète ⚠️)

### 2.2 Connection String PostgreSQL

1. Toujours dans **Settings**, cliquez sur **Database**
2. Dans l'onglet **Connection string**, copiez :
   - **URI** (Pooler mode) : pour `DATABASE_URL`
   - **Direct connection** : pour `DIRECT_URL`

⚠️ **Important** : Remplacez `[YOUR-PASSWORD]` par votre mot de passe noté à l'étape 1

---

## 📝 Étape 3 : Configurer le fichier .env

Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Puis éditez `.env` avec vos valeurs Supabase :

```bash
# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Database URLs (remplacez les placeholders)
DATABASE_URL="postgresql://postgres.xxxxx:VOTRE_MDP@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.xxxxx:VOTRE_MDP@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require"

# JWT (génère une clé aléatoire)
JWT_SECRET=$(openssl rand -base64 64)
```

---

## 🗄️ Étape 4 : Initialiser Prisma avec Supabase

### 4.1 Installer les dépendances

```bash
npm install
```

### 4.2 Générer le client Prisma

```bash
npx prisma generate
```

### 4.3 Créer les tables dans Supabase

**Option A : Via Prisma Migrate (Recommandé)**

```bash
npx prisma migrate dev --name init
```

Cela va :
- Créer les tables dans Supabase
- Générer les migrations
- Créer le client Prisma

**Option B : Via SQL Direct (Alternative)**

Si vous préférez créer les tables manuellement :

1. Allez dans **SQL Editor** sur Supabase Dashboard
2. Copiez le contenu généré par Prisma :
   ```bash
   npx prisma db execute --file ./prisma/schema.prisma --stdin
   ```
3. Ou utilisez l'outil de migration intégré

---

## ✅ Étape 5 : Vérifier la connexion

Créez un fichier de test `test-db.ts` :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Test de connexion
    await prisma.$connect();
    console.log('✅ Connexion à Supabase réussie!');
    
    // Vérifier les tables
    const usersCount = await prisma.user.count();
    console.log(`📊 Utilisateurs existants: ${usersCount}`);
    
    const etablissementsCount = await prisma.etablissement.count();
    console.log(`📊 Établissements existants: ${etablissementsCount}`);
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

Exécutez le test :

```bash
npx ts-node test-db.ts
```

---

## 🎯 Étape 6 : Activer Row Level Security (RLS) - Optionnel mais recommandé

Supabase permet d'activer RLS pour sécuriser l'accès aux données.

### Exemple pour la table `users` :

```sql
-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique : Les admins voient tout
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Politique : Chaque utilisateur peut voir ses propres données
CREATE POLICY "Users can view own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid()::text = id);
```

---

## 📦 Commandes Prisma Utiles

```bash
# Générer le client Prisma
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_de_la_migration

# Appliquer les migrations en production
npx prisma migrate deploy

# Ouvrir Prisma Studio (GUI pour la BDD)
npx prisma studio

# Formater le schema
npx prisma format

# Valider le schema
npx prisma validate

# Reset de la base de données (⚠️ efface tout)
npx prisma migrate reset
```

---

## 🔍 Dépannage

### Erreur : "Can't reach database server"

✅ Vérifiez que :
- Le mot de passe est correct dans `DATABASE_URL`
- Le SSL est activé (`sslmode=require`)
- Votre IP n'est pas bloquée (Supabase autorise toutes les IPs par défaut)

### Erreur : "relation does not exist"

✅ Exécutez les migrations :
```bash
npx prisma migrate deploy
```

### Erreur : "Certificate verification failed"

✅ Assurez-vous que l'URL contient `?sslmode=require`

---

## 📚 Ressources

- [Documentation Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Documentation Supabase](https://supabase.com/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## ✨ Prochaines étapes

1. ✅ Tester les CRUD avec Prisma Client
2. ✅ Mettre à jour les services pour utiliser Prisma
3. ✅ Implémenter l'authentification Supabase Auth (optionnel)
4. ✅ Configurer Supabase Storage pour les fichiers audio
5. ✅ Mettre en place les indexes pour les performances
