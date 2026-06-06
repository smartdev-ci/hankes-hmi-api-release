# Flow — Artistes

---

## 1. Inscription d'un artiste (`POST /artistes/register`)

```
Client (public, sans token)
  │     { email, password, nom, telephone, nomArtiste, bio?, isrc? }
  │
  ├─► Validation Zod
  │     email valide, password ≥ 8 chars, téléphone E.164
  │     nomArtiste ≤ 255 chars, bio ≤ 1000 chars, isrc ≤ 50 chars
  │
  ├─► Vérification email unique (UserService.findByEmail)
  │     └─ Doublon → 409
  │
  ├─► Vérification téléphone unique (UserService.findByTelephone)
  │     └─ Doublon → 409
  │
  ├─► Hash du mot de passe (bcrypt)
  │
  ├─► UserService.create
  │     { role: "artiste", isVerified: false, isActive: true }
  │
  ├─► ArtisteProfileService.create
  │     { userId, nomArtiste, bio, isrc }
  │
  └─► 201 Created
        { user: { id, email, nom, telephone, role },
          profile: { id, nomArtiste, bio, isrc } }
```

> Route publique : aucun token nécessaire.
> Le compte démarre non vérifié (`isVerified: false`). Utiliser `POST /auth/otp/verifier` pour valider.

---

## 2. Consulter son profil (`GET /artistes/me`)

```
Client [Bearer token : artiste uniquement]
  │
  ├─► Middleware authenticate
  │
  ├─► Vérification manuelle du rôle
  │     └─ role ≠ "artiste" → 403
  │
  ├─► ArtisteProfileService.findByUserId(user.id)
  │     └─ Non trouvé → 404
  │
  └─► 200 OK
        { data: { user: { id, email, role }, profile: { nomArtiste, bio, isrc, ... } } }
```

---

## 3. Mettre à jour son profil (`PUT /artistes/me`)

```
Client [Bearer token : artiste] { nomArtiste?, bio?, isrc? }
  │
  ├─► Middleware authenticate
  │
  ├─► Vérification rôle "artiste" → sinon 403
  │
  ├─► Validation Zod (createArtisteProfileSchema.partial(), tous champs optionnels)
  │
  ├─► ArtisteProfileService.findByUserId → 404 si absent
  │
  ├─► ArtisteProfileService.update(profile.id, { nomArtiste, bio, isrc })
  │
  └─► 200 OK { data: profilMisAJour }
```

---

## 4. Diffusions de l'artiste (`GET /artistes/me/diffusions`)

```
Client [Bearer token : artiste] ?page ?limit ?startDate ?endDate
  │
  ├─► Middleware authenticate + vérification rôle "artiste"
  │
  ├─► ArtisteProfileService.findByUserId → 404 si absent
  │
  ├─► ArtisteProfileService.getDiffusionsRecap(user.id, { page, limit, startDate, endDate })
  │     Retourne :
  │     ├─ stats    : totaux agrégés (nb plays, établissements, période)
  │     ├─ diffusions : liste paginée avec établissement + date
  │     └─ total    : nombre total de résultats
  │
  └─► 200 OK
        { data: {
            stats: { ... },
            diffusions: [ { titre, artiste, etablissement, playedAt, ... } ],
            pagination: { page, limit, total, totalPages, hasPreviousPage, hasNextPage }
          }
        }
```

---

## 5. Musiques revendiquées (`GET /artistes/me/musiques`)

```
Client [Bearer token : artiste]
  │
  ├─► Middleware authenticate + vérification rôle "artiste"
  │
  ├─► ArtisteProfileService.getMusiquesRevendiquees(user.id)
  │     Retourne les reconnaissances musicales liées à l'artiste
  │     via la table de revendications
  │
  └─► 200 OK { data[], total }
```

---

## 6. Revendiquer une musique (`POST /artistes/me/revendiquer`)

```
Client [Bearer token : artiste]
  │     { musicRecognitionId? | isrc?, nomArtiste? }
  │
  ├─► Middleware authenticate + vérification rôle "artiste"
  │
  ├─► Validation manuelle :
  │     └─ ni musicRecognitionId ni isrc fourni → 400
  │
  ├─► ArtisteProfileService.revendiquerMusique(user.id, musicRecognitionId, isrc, nomArtiste)
  │     ├─ [Via musicRecognitionId] : lie la reconnaissance à l'artiste
  │     └─ [Via isrc] : recherche et lie toutes les reconnaissances avec cet ISRC
  │
  └─► 201 Created { data: revendication }
```

> L'artiste peut revendiquer une musique par son `musicRecognitionId` (UUID de la
> reconnaissance spécifique) **ou** par son code ISRC (revendication globale).
> Les deux champs sont mutuellement optionnels mais au moins un est obligatoire.

---

## Cycle de vie d'un profil artiste

```
POST /artistes/register
  │  (compte isVerified: false)
  ▼
POST /auth/otp/verifier
  │  (isVerified: true → connexion possible)
  ▼
POST /auth/login → accessToken
  │
  ├─► GET  /artistes/me           → voir son profil
  ├─► PUT  /artistes/me           → modifier nomArtiste / bio / isrc
  ├─► GET  /artistes/me/diffusions → voir où ses musiques ont été jouées
  ├─► GET  /artistes/me/musiques   → voir ses revendications actives
  └─► POST /artistes/me/revendiquer → réclamer une reconnaissance musicale
```
