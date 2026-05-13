# 📮 Collection Postman - HMIS API

Ce guide vous permet d'importer et tester l'API HMIS avec Postman.

## Installation de Postman

1. Téléchargez Postman : https://www.postman.com/downloads/
2. Créez un compte gratuit (optionnel mais recommandé pour sync)

## Import de la Collection

### Option 1 : Import Direct (Recommandé)

1. Ouvrez Postman
2. Cliquez sur **Import** (en haut à gauche)
3. Sélectionnez **Upload Files**
4. Choisissez le fichier `hmis-api.postman_collection.json`

### Option 2 : Copier-Coller Raw

1. Copiez le contenu du fichier `hmis-api.postman_collection.json`
2. Dans Postman : **Import** → **Raw text**
3. Collez le JSON et cliquez **Continue** → **Import**

---

## Configuration de l'Environnement

### Créer un Environment "HMIS Dev"

1. Cliquez sur l'icône **Environments** (sidebar gauche)
2. **Add** → Nommez "HMIS Dev"
3. Ajoutez les variables suivantes :

| Variable | Valeur Initiale | Type |
|----------|-----------------|------|
| `baseUrl` | `http://localhost:3000` | Default |
| `accessToken` | _(vide)_ | Secret |
| `refreshToken` | _(vide)_ | Secret |
| `userId` | _(vide)_ | Default |
| `etablissementId` | _(vide)_ | Default |

4. Sauvegardez

### Variables Automatiques

Les requêtes d'authentification mettront automatiquement à jour :
- `accessToken` après login/register
- `refreshToken` après login
- `userId` après registration
- `etablissementId` après création établissement

---

## Workflows de Test

### Workflow 1 : Inscription Complète

1. **Register User** → Notez le `userId`
2. **Verify OTP** → Utilisez le code affiché dans les logs console (dev)
3. **Login** → Les tokens sont automatiquement sauvegardés
4. **Create Établissement** → Liez l'établissement à votre compte
5. **Get Current User** → Vérifiez votre profil

### Workflow 2 : Testing Auth Flow

1. **Login** → Obtenez tokens
2. **Get Current User** → Vérifiez auth
3. **Refresh Token** → Rafraîchissez avant expiration
4. **Get Current User** → Vérifiez avec nouveau token
5. **Logout** → Déconnectez-vous
6. **Get Current User** → Doit retourner 401

### Workflow 3 : CRUD Établissement

1. **Login** (si pas déjà fait)
2. **Create Établissement** → Créez un nouvel établissement
3. **List Établissements** → Vérifiez qu'il apparaît
4. **Get Établissement by ID** → Récupérez les détails
5. **Update Établissement** → Modifiez une propriété
6. **Get Établissement Stats** → Consultez les stats

---

## Tests Automatisés avec Newman

Newman est l'outil CLI de Postman pour exécuter des collections en CI/CD.

### Installation

```bash
npm install -g newman
```

### Exécuter la Collection

```bash
newman run hmis-api.postman_collection.json \
  --environment hmis-dev.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

---

## Dépannage

### Erreur 401 Non Authentifié

- Vérifiez que `accessToken` est défini dans l'environnement
- Re-exécutez la requête **Login**
- Vérifiez que le token n'est pas expiré (15 min)

### Erreur 403 Non Autorisé

- Vérifiez que votre utilisateur a le rôle requis
- Certaines routes nécessitent le rôle `admin`

### Variables Non Définies

- Vérifiez que l'environnement "HMIS Dev" est sélectionné (dropdown en haut à droite)
- Ré-exécutez les requêtes qui peuplent les variables (Login, Create, etc.)

---

📧 support@hmis-project.ci  
📚 Documentation complète : `README.md`
