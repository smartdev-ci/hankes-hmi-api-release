# Script de Création d'Administrateur

Ce script permet de créer un utilisateur administrateur dans la base de données.

## 🚀 Utilisation

### Méthode 1 : Avec les valeurs par défaut
```bash
npm run create-admin
```

**Valeurs par défaut :**
- Email : `admin@hmis.ci`
- Mot de passe : `Admin@123456`
- Nom : `Administrateur`
- Prénom : `Principal`
- Téléphone : `+2250100000001`

### Méthode 2 : Avec des variables d'environnement personnalisées
```bash
ADMIN_EMAIL="mon.email@exemple.com" \
ADMIN_PASSWORD="MonMotDePasse123!" \
ADMIN_NOM="Kouamé" \
ADMIN_PRENOM="Jean" \
ADMIN_TELEPHONE="+2250707070707" \
npm run create-admin
```

### Méthode 3 : Via un fichier .env temporaire
Créez un fichier `.env.admin` à la racine :
```env
ADMIN_EMAIL="votre.email@exemple.com"
ADMIN_PASSWORD="VotreMotDePasse123!"
ADMIN_NOM="VotreNom"
ADMIN_PRENOM="VotrePrénom"
ADMIN_TELEPHONE="+225XXXXXXXXX"
```

Puis exécutez :
```bash
dotenv -e .env.admin -- npm run create-admin
```

## 🔒 Sécurité

⚠️ **IMPORTANT** : 
- Changez le mot de passe après la première connexion !
- Ne commitez jamais le fichier `.env.admin` dans Git
- Utilisez des mots de passe forts (majuscules, minuscules, chiffres, caractères spéciaux)

## 📝 Sortie attendue

Le script affichera :
```
🔐 Création d'un utilisateur administrateur...

📋 Informations:
   Email: admin@hmis.ci
   Nom: Administrateur
   Prénom: Principal
   Téléphone: +2250100000001

🔒 Hachage du mot de passe...
💾 Création de l'utilisateur dans la base de données...

✅ Administrateur créé avec succès!

📄 Détails:
   ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Email: admin@hmis.ci
   Nom: Administrateur Principal
   Téléphone: +2250100000001
   Rôle: admin
   Vérifié: true
   Actif: true

🔑 Identifiants de connexion:
   Email: admin@hmis.ci
   Mot de passe: Admin@123456

⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!

🌐 Endpoint de connexion: POST /auth/login
```

## 🔍 Connexion ensuite

Utilisez l'endpoint `/auth/login` pour obtenir vos tokens :

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hmis.ci",
    "password": "Admin@123456"
  }'
```

## ❌ Résolution de problèmes

### "Un utilisateur administrateur existe déjà"
Si un admin existe déjà, le script vous avertira. Pour créer un autre admin, utilisez un email différent via `ADMIN_EMAIL`.

### "L'email ou le téléphone est déjà utilisé"
Changez les valeurs `ADMIN_EMAIL` et/ou `ADMIN_TELEPHONE` pour utiliser des valeurs uniques.

### Erreur de connexion à la base de données
Vérifiez que votre variable `DATABASE_URL` est correctement configurée dans votre fichier `.env`.
