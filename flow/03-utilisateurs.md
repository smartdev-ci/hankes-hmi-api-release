# Flow — Utilisateurs

> Toutes les routes de ce module sont protégées. La plupart sont réservées au rôle `admin`.

---

## 1. Lister les utilisateurs (`GET /utilisateurs`)

```
Client [Bearer token : admin]
  │
  ├─► Middleware authenticate + authorize("admin")
  │     └─ Autre rôle → 403
  │
  ├─► Chargement :
  │     ├─ [?role fourni] UserService.findByRole(role)
  │     └─ [Sinon]        UserService.findAll()
  │
  ├─► [?actif=true/false] filtre sur isActive
  │
  ├─► Pagination manuelle (slice)
  │
  └─► 200 OK
        { data[]: { id, email, nom, telephone, role, isVerified, isActive,
                    etablissementId, createdAt },
          pagination: { page, limit, total, totalPages } }
```

---

## 2. Créer un utilisateur (`POST /utilisateurs`)

```
Client [Bearer token : admin] { email, password, nom, telephone, role, isVerified?, isActive? }
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► Validation Zod (createUserSchema)
  │     role ∈ [admin, etablissement, partenaire, recenseur, artiste]
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
  │
  └─► 201 Created
        { user: { id, email, nom, telephone, role, isVerified, isActive } }
```

---

## 3. Créer un utilisateur gérant/partenaire (`POST /utilisateurs/etablissement`)

```
Client [Bearer token : admin ou recenseur]
  │     { email, password, nom, telephone, role?, isVerified?, isActive? }
  │
  ├─► Middleware authenticate
  │
  ├─► Vérification manuelle du rôle (admin ou recenseur)
  │     └─ Autre → 403
  │
  ├─► Validation Zod (createEtablissementUserSchema)
  │     role ∈ [etablissement, partenaire], défaut "etablissement"
  │
  ├─► Vérification email + téléphone uniques (en parallèle Promise.all)
  │     └─ Doublon → 409
  │
  ├─► Hash du mot de passe + UserService.create
  │     etablissementId: null (à lier ensuite via POST /etablissements)
  │
  └─► 201 Created { data: { id, email, nom, telephone, role, isVerified, isActive } }
```

> Cas d'usage typique : créer le gérant d'abord, puis utiliser son UUID
> dans `POST /etablissements` avec le champ `gerantId`.

---

## 4. Créer un agent recenseur (`POST /utilisateurs/recenseur`)

```
Client [Bearer token : admin]
  │     { email, password, nom, prenom, telephone,
  │       numeroPiece, typePiece, dateNaissance, photoIdentiteUrl }
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► Validation Zod (createRecenseurUserSchema)
  │     typePiece ∈ [cni, passeport, titre_sejour, carte_consulaire]
  │     dateNaissance format YYYY-MM-DD
  │
  ├─► Vérification email + téléphone uniques
  │     └─ Doublon → 409
  │
  ├─► Hash du mot de passe
  │
  ├─► UserService.create
  │     role: "recenseur", isVerified: false, isActive: true
  │     nom: `${prenom} ${nom}`
  │
  ├─► RecenseurProfileService.create
  │     { userId, numeroPiece, typePiece, dateNaissance, photoIdentiteUrl,
  │       creePar: req.user.id }
  │
  └─► 201 Created { user: {...}, profile: { id, numeroPiece, typePiece, dateNaissance } }
```

---

## 5. Lister les agents recenseurs (`GET /utilisateurs/recenseurs`)

```
Client [Bearer token : admin]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► RecenseurProfileService.findAll
  │     (retourne les profils avec les informations utilisateur jointes)
  │
  └─► 200 OK { data[], total }
```

---

## 6. Établissements d'un recenseur (`GET /utilisateurs/recenseurs/:id/etablissements`)

```
Client [Bearer token : admin]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► RecenseurProfileService.findByUserId(recenseurId)
  │     └─ Non trouvé → 404
  │
  ├─► RecenseurProfileService.getEtablissementsCreesParRecenseur(recenseurId)
  │     (filtre sur etablissement.creePar = recenseurId)
  │
  └─► 200 OK { data[], total }
```

---

## 7. Détails d'un utilisateur (`GET /utilisateurs/:userId`)

```
Client [Bearer token : admin]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► UserService.findById(userId)
  │     └─ Non trouvé → 404
  │
  └─► 200 OK
        { user: { id, email, nom, telephone, role, etablissementId,
                  isVerified, isActive, createdAt } }
```

---

## 8. Modifier un utilisateur (`PATCH /utilisateurs/:userId`)

```
Client [Bearer token : admin]
  │     { nom?, telephone?, role?, etablissementId?, isActive? }
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► Validation Zod (updateUserSchema, tous champs optionnels)
  │
  ├─► UserService.findById → 404 si absent
  │
  ├─► UserService.update (seuls les champs présents sont modifiés)
  │
  └─► 200 OK { user: {...} }
```

---

## 9. Désactiver un utilisateur (`DELETE /utilisateurs/:userId`)

```
Client [Bearer token : admin]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► UserService.findById → 404 si absent
  │
  ├─► UserService.toggleActiveStatus(userId, false)
  │     Soft-delete : isActive = false, compte conservé en base
  │
  └─► 200 OK { message: "Utilisateur désactivé" }
```

---

## Rôles et permissions résumés

| Rôle         | Créer établissement | Gérer utilisateurs | Voir dashboard | Capturer audio |
|--------------|:-------------------:|:------------------:|:--------------:|:--------------:|
| `admin`      | ✅                  | ✅                 | ✅             | ✅             |
| `recenseur`  | ✅ (ses propres)    | ❌                 | ❌             | ✅             |
| `etablissement` | ❌               | ❌                 | ❌             | ✅             |
| `partenaire` | ❌                  | ❌                 | ❌             | ❌             |
| `artiste`    | ❌                  | ❌                 | ❌             | ❌             |
