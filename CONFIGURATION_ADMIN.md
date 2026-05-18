# 📝 Configuration de l'Administrateur

## ⚠️ IMPORTANT : Configurer la Base de Données

Le script `create-admin` nécessite une connexion valide à votre base de données Supabase.

### Étape 1 : Configurer DATABASE_URL

1. **Récupérez vos identifiants Supabase :**
   - Allez sur https://supabase.com
   - Sélectionnez votre projet HMIS
   - Menu **Settings** > **Database**
   - Copiez l'URL de connexion

2. **Mettez à jour le fichier `.env` :**

```bash
# Remplacez ces valeurs par celles de votre projet Supabase
DATABASE_URL="postgresql://postgres:[VOTRE_MDP]@db.[VOTRE_PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[VOTRE_MDP]@db.[VOTRE_PROJECT_REF].supabase.co:5432/postgres"
```

### Étape 2 : Exécuter les migrations Prisma

Avant de créer l'admin, assurez-vous que la base de données est initialisée :

```bash
# Appliquer les migrations
npx prisma migrate deploy

# OU pour le développement (avec reset si nécessaire)
npx prisma migrate dev
```

### Étape 3 : Créer l'administrateur

**Option A : Valeurs par défaut**
```bash
npm run create-admin
```

**Option B : Personnaliser les informations**
```bash
ADMIN_EMAIL="votre.email@exemple.com" \
ADMIN_PASSWORD="VotreMotDePasse123!" \
ADMIN_NOM="VotreNom" \
ADMIN_TELEPHONE="+225XXXXXXXXX" \
npm run create-admin
```

## 🔒 Recommandations de Sécurité

1. **Changez le mot de passe après la première connexion**
2. **Utilisez un mot de passe fort** (12+ caractères, majuscules, minuscules, chiffres, symboles)
3. **Ne commitez jamais `.env` dans Git** (déjà dans `.gitignore`)
4. **En production**, utilisez des variables d'environnement sécurisées

## 🧪 Vérification

Après création, testez la connexion :

```bash
# Démarrer le serveur
npm run dev

# Dans un autre terminal, testez le login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hmis.ci",
    "password": "Admin@123456"
  }'
```

Vous devriez recevoir un token JWT.

## ❌ Résolution de Problèmes

### Erreur : "Can't reach database server"
- Vérifiez que `DATABASE_URL` est correcte
- Testez la connexion avec `psql` ou un client SQL

### Erreur : "relation 'public.users' does not exist"
- Exécutez les migrations : `npx prisma migrate deploy`

### Erreur : "Unique constraint failed on the fields: (`email`)"
- Un admin existe déjà avec cet email
- Utilisez un email différent ou connectez-vous avec l'existant

## 📚 Documentation Complète

- [GUIDE_DEMARRAGE.md](./Documentation/GUIDE_DEMARRAGE.md) - Guide complet de démarrage
- [PRISMA_SUPABASE_README.md](./Documentation/PRISMA_SUPABASE_README.md) - Configuration Prisma + Supabase
- [README.md](./README.md) - Documentation principale
