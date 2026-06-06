-- ============================================================
-- HMIS - Migration : reconnaissance musicale hybride locale
-- ============================================================

-- ------------------------------------------------------------
-- ETAPE 1 : Bibliotheque musicale proprietaire
-- ------------------------------------------------------------

CREATE TABLE "tracks" (
  "id"            TEXT NOT NULL,
  "titre"         VARCHAR(255) NOT NULL,
  "artiste"       VARCHAR(255) NOT NULL,
  "album"         VARCHAR(255),
  "isrc"          VARCHAR(50),
  "genre"         VARCHAR(255),
  "annee"         INTEGER,
  "normalizedKey" TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracks_normalizedKey_key"
  ON "tracks"("normalizedKey");

CREATE INDEX "tracks_isrc_idx"
  ON "tracks"("isrc");

CREATE INDEX "tracks_artiste_idx"
  ON "tracks"("artiste");

-- ------------------------------------------------------------
-- ETAPE 2 : Alias de titres/artistes
-- ------------------------------------------------------------

CREATE TABLE "track_aliases" (
  "id"              TEXT NOT NULL,
  "trackId"         TEXT NOT NULL,
  "alias"           VARCHAR(255) NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "track_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "track_aliases_trackId_normalizedAlias_key"
  ON "track_aliases"("trackId", "normalizedAlias");

CREATE INDEX "track_aliases_normalizedAlias_idx"
  ON "track_aliases"("normalizedAlias");

-- ------------------------------------------------------------
-- ETAPE 3 : Lien optionnel reconnaissance -> track
-- ------------------------------------------------------------

ALTER TABLE "music_recognitions"
  ADD COLUMN "trackId" TEXT;

CREATE INDEX "music_recognitions_trackId_idx"
  ON "music_recognitions"("trackId");

-- ------------------------------------------------------------
-- ETAPE 4 : Empreintes audio locales
-- ------------------------------------------------------------

CREATE TABLE "fingerprints" (
  "id"              TEXT NOT NULL,
  "fingerprint"     TEXT NOT NULL,
  "fingerprintHash" TEXT NOT NULL,
  "algorithm"       TEXT NOT NULL DEFAULT 'sha256_fallback',
  "recognitionId"   TEXT NOT NULL,
  "trackId"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fingerprints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fingerprints_fingerprintHash_idx"
  ON "fingerprints"("fingerprintHash");

CREATE INDEX "fingerprints_trackId_idx"
  ON "fingerprints"("trackId");

-- ------------------------------------------------------------
-- ETAPE 5 : Cles etrangeres
-- ------------------------------------------------------------

ALTER TABLE "track_aliases"
  ADD CONSTRAINT "track_aliases_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "music_recognitions"
  ADD CONSTRAINT "music_recognitions_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fingerprints"
  ADD CONSTRAINT "fingerprints_recognitionId_fkey"
    FOREIGN KEY ("recognitionId") REFERENCES "music_recognitions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fingerprints"
  ADD CONSTRAINT "fingerprints_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
