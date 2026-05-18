# 📝 Guide de Création d'Administrateur HMIS

## ✅ Administrateur Créé avec Succès

Un compte administrateur a été créé sur l'API déployée :

### 🔐 Identifiants
- **Email** : `admin3@hmis.ci`
- **Mot de passe** : `Admin@123456`
- **Téléphone** : `+2250102030406`
- **ID Utilisateur** : `847eceab-ebf8-403d-9589-baf5bce4840b`

### ⚠️ Prochaines Étapes Obligatoires

1. **Vérification OTP** (dans les 10 minutes)
   ```bash
   # Remplacez 123456 par le code reçu par SMS
   PHONE="+2250102030406" OTP="123456" npm run verify-otp
   ```

2. **Connexion** après vérification OTP
   ```bash
   curl -X POST https://hankes-hmi-api-release.onrender.com/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin3@hmis.ci",
       "password": "Admin@123456"
     }'
   ```

---

## 🛠️ Scripts Disponibles

### Créer un nouvel administrateur
```bash
# Avec valeurs par défaut
npm run create-admin-api

# Avec personnalisation
ADMIN_EMAIL="votre.email@exemple.com" \
ADMIN_PASSWORD="VotreMotDePasse!" \
ADMIN_NOM="Nom" \
ADMIN_PRENOM="Prénom" \
ADMIN_TELEPHONE="+225XXXXXXXX" \
npm run create-admin-api
```

### Vérifier un code OTP
```bash
PHONE="+225XXXXXXXX" OTP="123456" npm run verify-otp
```

---

## 📋 Informations Importantes

### Sécurité
- Le mot de passe est haché avec bcrypt (12 rounds)
- Un code OTP à 6 chiffres est envoyé par SMS
- Le compte doit être vérifié avant la première connexion
- L'OTP expire après 10 minutes

### Restrictions
- Chaque email et téléphone doit être unique
- La création directe d'admin peut être restreinte en production
- Conservez précieusement les identifiants générés

### API Base URL
- Production : `https://hankes-hmi-api-release.onrender.com/v1`
- Toutes les routes sont préfixées par `/v1`

---

## 🔑 Routes Utiles

| Route | Méthode | Description |
|-------|---------|-------------|
| `/auth/register` | POST | Créer un compte |
| `/auth/otp/verifier` | POST | Vérifier OTP |
| `/auth/login` | POST | Se connecter |
| `/auth/me` | GET | Voir son profil |
| `/utilisateurs/recenseur` | POST | Créer un recenseur (admin) |
| `/etablissements` | POST | Créer un établissement |

---

## 💡 Conseils

1. **Cold Start Render** : L'API peut mettre 30-60s à répondre au premier appel
2. **OTP Non Reçu** : Consultez les logs de l'application (le code est affiché en console)
3. **Token Expiré** : Utilisez `/auth/refresh` pour obtenir un nouveau token
4. **Permissions** : Seul un admin peut créer des recenseurs et valider des établissements

---

**Document généré le** : 2026-05-18  
**Version API** : 2.0.0
