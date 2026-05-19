-- ============================================================
-- HMIS — Migration : Recenseurs, Artistes, Etablissement_Users
-- ============================================================

-- ------------------------------------------------------------
-- ÉTAPE 1 : Nouveaux types ENUM
-- ------------------------------------------------------------

CREATE TYPE "PieceIdentiteType" AS ENUM (
  'cni',
  'passeport',
  'titre_sejour',
  'carte_consulaire'
);

CREATE TYPE "CreatorRole" AS ENUM (
  'admin',
  'recenseur'
);

-- Ajout des nouveaux rôles dans l'enum existant
-- PostgreSQL ne permet pas ALTER TYPE ... ADD VALUE dans une transaction,
-- donc on recrée l'enum proprement via une migration Prisma (voir schema.prisma)
-- Pour une exécution directe SQL :
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'recenseur';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'artiste';

-- ------------------------------------------------------------
-- ÉTAPE 2 : Table recenseur_profiles
-- ------------------------------------------------------------

CREATE TABLE "recenseur_profiles" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "numeroPiece"      TEXT NOT NULL,
  "typePiece"        "PieceIdentiteType" NOT NULL,
  "dateNaissance"    DATE NOT NULL,
  "photoIdentiteUrl" TEXT NOT NULL,
  "creePar"          TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recenseur_profiles_pkey" PRIMARY KEY ("id")
);

-- Un utilisateur ne peut avoir qu'un seul profil recenseur
CREATE UNIQUE INDEX "recenseur_profiles_userId_key"
  ON "recenseur_profiles"("userId");

-- ------------------------------------------------------------
-- ÉTAPE 3 : Table artiste_profiles
-- ------------------------------------------------------------

CREATE TABLE "artiste_profiles" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "nomArtiste"  TEXT NOT NULL,
  "bio"         TEXT,
  "isrc"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "artiste_profiles_pkey" PRIMARY KEY ("id")
);

-- Un utilisateur ne peut avoir qu'un seul profil artiste
CREATE UNIQUE INDEX "artiste_profiles_userId_key"
  ON "artiste_profiles"("userId");

-- ------------------------------------------------------------
-- ÉTAPE 4 : Table etablissement_users
-- (plusieurs utilisateurs liés à un établissement, hors gérant)
-- ------------------------------------------------------------

CREATE TABLE "etablissement_users" (
  "id"               TEXT NOT NULL,
  "etablissementId"  TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "role"             TEXT NOT NULL DEFAULT 'staff',
  "assigneAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignePar"       TEXT NOT NULL,

  CONSTRAINT "etablissement_users_pkey" PRIMARY KEY ("id")
);

-- Un user ne peut être lié qu'une seule fois au même établissement
CREATE UNIQUE INDEX "etablissement_users_etablissementId_userId_key"
  ON "etablissement_users"("etablissementId", "userId");

-- ------------------------------------------------------------
-- ÉTAPE 5 : Table artiste_musiques
-- (lien artiste <-> music_recognitions via nom ET isrc)
-- ------------------------------------------------------------

CREATE TABLE "artiste_musiques" (
  "id"                  TEXT NOT NULL,
  "artisteUserId"       TEXT NOT NULL,
  "musicRecognitionId"  TEXT,
  "isrc"                TEXT,
  "nomArtiste"          TEXT NOT NULL,
  "verifie"             BOOLEAN NOT NULL DEFAULT false,
  "revendiqueAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "artiste_musiques_pkey" PRIMARY KEY ("id")
);

-- Un artiste ne peut revendiquer la même reconnaissance qu'une seule fois
CREATE UNIQUE INDEX "artiste_musiques_artisteUserId_musicRecognitionId_key"
  ON "artiste_musiques"("artisteUserId", "musicRecognitionId");

-- Index pour accélérer la recherche par ISRC (utilisé pour le matching)
CREATE INDEX "artiste_musiques_isrc_idx"
  ON "artiste_musiques"("isrc");

-- Index pour accélérer la recherche par nom d'artiste (matching texte)
CREATE INDEX "artiste_musiques_nomArtiste_idx"
  ON "artiste_musiques"("nomArtiste");

-- ------------------------------------------------------------
-- ÉTAPE 6 : Modifications table etablissements
-- (traçabilité de la création par admin ou recenseur)
-- ------------------------------------------------------------

ALTER TABLE "etablissements"
  ADD COLUMN "creePar"      TEXT,
  ADD COLUMN "roleCreateur" "CreatorRole";

-- Index pour lister facilement les établissements créés par un recenseur
CREATE INDEX "etablissements_creePar_idx"
  ON "etablissements"("creePar");

-- ------------------------------------------------------------
-- ÉTAPE 7 : Modifications table diffusions
-- (ajout captureId manquant — présent dans le swagger mais absent de la BDD)
-- ------------------------------------------------------------

ALTER TABLE "diffusions"
  ADD COLUMN "captureId" TEXT;

-- ------------------------------------------------------------
-- ÉTAPE 8 : Suppression du UNIQUE sur music_recognitions.isrc
-- La même chanson (même ISRC) peut être capturée plusieurs fois
-- dans des établissements différents → le UNIQUE bloque les insertions
-- ------------------------------------------------------------

DROP INDEX IF EXISTS "music_recognitions_isrc_key";

-- On ajoute un index simple (non unique) pour garder les performances
-- sur les recherches/matching par ISRC
CREATE INDEX "music_recognitions_isrc_idx"
  ON "music_recognitions"("isrc");

-- ------------------------------------------------------------
-- ÉTAPE 9 : Suppression du UNIQUE sur users.etablissementId
-- (un user pourra être lié à plusieurs établissements via etablissement_users)
-- ------------------------------------------------------------

DROP INDEX IF EXISTS "users_etablissementId_key";

-- On garde la colonne etablissementId pour la compatibilité,
-- mais elle n'est plus unique. La relation multi-établissements
-- passe désormais par la table etablissement_users.

-- ------------------------------------------------------------
-- ÉTAPE 10 : Clés étrangères — recenseur_profiles
-- ------------------------------------------------------------

ALTER TABLE "recenseur_profiles"
  ADD CONSTRAINT "recenseur_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recenseur_profiles"
  ADD CONSTRAINT "recenseur_profiles_creePar_fkey"
    FOREIGN KEY ("creePar") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- ÉTAPE 11 : Clés étrangères — artiste_profiles
-- ------------------------------------------------------------

ALTER TABLE "artiste_profiles"
  ADD CONSTRAINT "artiste_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- ÉTAPE 12 : Clés étrangères — etablissement_users
-- ------------------------------------------------------------

ALTER TABLE "etablissement_users"
  ADD CONSTRAINT "etablissement_users_etablissementId_fkey"
    FOREIGN KEY ("etablissementId") REFERENCES "etablissements"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "etablissement_users"
  ADD CONSTRAINT "etablissement_users_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "etablissement_users"
  ADD CONSTRAINT "etablissement_users_assignePar_fkey"
    FOREIGN KEY ("assignePar") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- ÉTAPE 13 : Clés étrangères — artiste_musiques
-- ------------------------------------------------------------

ALTER TABLE "artiste_musiques"
  ADD CONSTRAINT "artiste_musiques_artisteUserId_fkey"
    FOREIGN KEY ("artisteUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artiste_musiques"
  ADD CONSTRAINT "artiste_musiques_musicRecognitionId_fkey"
    FOREIGN KEY ("musicRecognitionId") REFERENCES "music_recognitions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- ÉTAPE 14 : Clés étrangères — etablissements (nouvelles colonnes)
-- ------------------------------------------------------------

ALTER TABLE "etablissements"
  ADD CONSTRAINT "etablissements_creePar_fkey"
    FOREIGN KEY ("creePar") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- ÉTAPE 15 : Clé étrangère — diffusions (captureId)
-- ------------------------------------------------------------

ALTER TABLE "diffusions"
  ADD CONSTRAINT "diffusions_captureId_fkey"
    FOREIGN KEY ("captureId") REFERENCES "audio_captures"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Index pour accélérer les requêtes du récap artiste
-- (toutes les diffusions d'une musique dans tous les établissements)
CREATE INDEX "diffusions_musicId_playedAt_idx"
  ON "diffusions"("musicId", "playedAt" DESC);

CREATE INDEX "diffusions_etablissementId_playedAt_idx"
  ON "diffusions"("etablissementId", "playedAt" DESC);

