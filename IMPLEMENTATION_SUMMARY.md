# Résumé de l'implémentation - HMIS API

## Fonctionnalités implémentées

### 1. Gestion des Agents Recenseurs

#### Création d'un agent recenseur par un administrateur
- **Endpoint**: `POST /utilisateurs/recenseur`
- **Rôle requis**: `admin`
- **Informations requises**:
  - Email
  - Mot de passe
  - Nom
  - Prénom
  - Téléphone
  - Numéro de pièce d'identité
  - Type de pièce (CNI, passeport, titre de séjour, carte consulaire)
  - Date de naissance
  - URL de la photo d'identité

#### Liste des agents recenseurs
- **Endpoint**: `GET /utilisateurs/recenseurs`
- **Rôle requis**: `admin`

#### Établissements créés par un recenseur
- **Endpoint**: `GET /utilisateurs/recenseurs/:recenseurId/etablissements`
- **Rôle requis**: `admin`
- Permet de savoir quels établissements ont été créés par un recenseur donné

### 2. Gestion des Établissements

#### Création d'un établissement
- **Endpoint**: `POST /etablissements`
- **Rôles autorisés**: `admin`, `recenseur`
- **Fonctionnalité**: 
  - Crée l'établissement
  - Crée automatiquement un utilisateur gérant lié à l'établissement
  - Enregistre qui a créé l'établissement (admin ou recenseur)
- **Informations requises**:
  - Nom, type, adresse, ville, région
  - Téléphone, email (optionnel)
  - Capacité, licence (optionnel)
  - **Informations du gérant** (obligatoires):
    - Email du gérant
    - Nom du gérant
    - Téléphone du gérant

#### Suivi du créateur
- Chaque établissement contient:
  - `creePar`: ID de l'utilisateur qui a créé l'établissement
  - `roleCreateur`: Rôle du créateur ('admin' ou 'recenseur')

### 3. Gestion des Artistes

#### Inscription publique
- Les artistes peuvent s'inscrire eux-mêmes via l'endpoint public d'inscription
- **Rôle**: `artiste`

#### Profil artiste
- Service `ArtisteProfileService` pour gérer les profils artistes
- Un artiste peut créer son profil après inscription

#### Récapitulatif des diffusions pour un artiste
- **Fonctionnalité**: `ArtisteProfileService.getDiffusionsRecap()`
- **Données retournées**:
  - Liste des musiques diffusées dont l'artiste est le propriétaire/chanteur
  - Pour chaque diffusion:
    - Titre de la musique
    - Artiste
    - Établissement où la musique a été jouée (nom, ville, région)
    - Date et heure de diffusion (`playedAt`)
    - Durée
  - Statistiques:
    - Nombre total de diffusions
    - Nombre d'établissements différents
    - Nombre de villes différentes

#### Revendication de musiques
- Un artiste peut revendiquer une musique reconnue
- **Endpoint**: `ArtisteProfileService.revendiquerMusique()`
- Permet de lier une musique reconnue à un artiste

### 4. Services Créés

#### RecenseurProfileService
- `findAll()`: Liste tous les profils recenseurs
- `findById(id)`: Récupère un profil par ID
- `findByUserId(userId)`: Récupère un profil par ID utilisateur
- `create(data)`: Crée un profil recenseur (réservé aux admins)
- `update(id, data)`: Met à jour un profil
- `delete(id)`: Supprime un profil
- `getEtablissementsCreesParRecenseur(recenseurUserId)`: Liste les établissements créés
- `count()`: Compte le nombre de recenseurs

#### ArtisteProfileService
- `findAll()`: Liste tous les profils artistes
- `findById(id)`: Récupère un profil par ID
- `findByUserId(userId)`: Récupère un profil par ID utilisateur
- `create(data)`: Crée un profil artiste (inscription publique)
- `update(id, data)`: Met à jour un profil
- `delete(id)`: Supprime un profil
- `getDiffusionsRecap(artisteUserId, options)`: Récapitulatif des diffusions
- `revendiquerMusique()`: Revendique une musique
- `getMusiquesRevendiquees()`: Liste les musiques revendiquées
- `count()`: Compte le nombre d'artistes

#### EtablissementService (mis à jour)
- Ajout des champs `creePar` et `roleCreateur`
- Nouvelle méthode `findByCreateur(createurId)`: Liste les établissements créés par un utilisateur

### 5. Schéma de Base de Données (Prisma)

#### Enums ajoutés
```prisma
enum UserRole {
  admin
  etablissement
  partenaire
  recenseur
  artiste
}

enum PieceIdentiteType {
  cni
  passeport
  titre_sejour
  carte_consulaire
}

enum CreatorRole {
  admin
  recenseur
}
```

#### Modèles ajoutés
```prisma
model RecenseurProfile {
  id               String             @id @default(uuid())
  userId           String             @unique
  numeroPiece      String             @unique
  typePiece        PieceIdentiteType
  dateNaissance    DateTime
  photoIdentiteUrl String
  creePar          String // ID de l'admin qui a créé le recenseur
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  
  user             User               @relation("RecenseurProfile", fields: [userId], references: [id])
  admin            User               @relation("AdminRecenseur", fields: [creePar], references: [id])
}

model ArtisteProfile {
  id           String   @id @default(uuid())
  userId       String   @unique
  nomArtiste   String
  bio          String?
  isrc         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user         User     @relation("ArtisteProfile", fields: [userId], references: [id])
}

model ArtisteMusique {
  id                 String            @id @default(uuid())
  artisteUserId      String
  musicRecognitionId String?
  isrc               String?
  nomArtiste         String
  verifie            Boolean           @default(false)
  revendiqueAt       DateTime          @default(now())
  
  artiste            User              @relation(fields: [artisteUserId], references: [id])
  musicRecognition   MusicRecognition? @relation(fields: [musicRecognitionId], references: [id])
  
  @@unique([artisteUserId, musicRecognitionId])
}
```

#### Modifications sur Etablissement
```prisma
model Etablissement {
  // ... champs existants ...
  creePar        String?
  roleCreateur   CreatorRole?
  
  createur       User? @relation("EtablissementsCreés", fields: [creePar], references: [id])
}
```

### 6. Routes API

#### Utilisateurs
- `GET /utilisateurs` - Liste (admin)
- `POST /utilisateurs` - Créer (admin)
- `POST /utilisateurs/recenseur` - Créer un recenseur (admin)
- `GET /utilisateurs/recenseurs` - Liste des recenseurs (admin)
- `GET /utilisateurs/recenseurs/:recenseurId/etablissements` - Établissements créés (admin)
- `GET /utilisateurs/:userId` - Détails (admin)
- `PATCH /utilisateurs/:userId` - Modifier (admin)
- `DELETE /utilisateurs/:userId` - Désactiver (admin)

#### Établissements
- `GET /etablissements` - Liste avec filtres
- `POST /etablissements` - Créer (admin/recenseur) - crée aussi le gérant
- `GET /etablissements/:id` - Détails
- `PUT /etablissements/:id` - Modifier
- `DELETE /etablissements/:id` - Supprimer (admin)
- `POST /etablissements/:id/valider` - Valider (admin)
- `POST /etablissements/:id/suspendre` - Suspendre (admin)

### 7. Validation des données

Nouveaux schémas de validation ajoutés dans `src/utils/validators.ts`:
- `createRecenseurUserSchema`: Validation pour création d'un recenseur
- `createArtisteProfileSchema`: Validation pour création d'un profil artiste
- `createEtablissementSchema`: Mis à jour avec les champs du gérant

## Points clés de l'architecture

1. **Séparation des rôles**: 
   - Admin: Crée les recenseurs, peut tout faire
   - Recenseur: Crée les établissements (et les gérants liés)
   - Artiste: S'inscrit lui-même, voit ses statistiques
   - Gérant: Gère son établissement

2. **Traçabilité**: 
   - On sait qui a créé chaque établissement
   - On sait quel admin a créé chaque recenseur

3. **Lien Établissement-Gérant**:
   - Un établissement a un seul gérant
   - Un gérant peut avoir plusieurs établissements (via le rôle)

4. **Statistiques Artistes**:
   - Récapitulatif complet des diffusions
   - Filtrage par période
   - Pagination supportée

## Build
Le projet compile sans erreur TypeScript.
