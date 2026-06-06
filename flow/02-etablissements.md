# Flow — Établissements

## Règle d'accès transversale

```
canManageEtablissement(user, etablissement) → true si :
  ├─ user.role === "admin"             → accès total
  ├─ etablissement.gerantId === user.id → le gérant voit son établissement
  └─ user.role === "recenseur"
       ET etablissement.creePar === user.id → le recenseur voit ce qu'il a créé
```

---

## 1. Lister les établissements (`GET /etablissements`)

```
Client [Bearer token] ?page ?limit ?ville ?type ?search
  │
  ├─► Middleware authenticate
  │
  ├─► Chargement de tous les établissements (EtablissementService.findAll)
  │
  ├─► [Si rôle = "recenseur"] → filtre sur creePar === user.id
  │
  ├─► Filtres optionnels : ville / type / search (nom ou adresse)
  │
  ├─► Pagination manuelle (slice)
  │
  └─► 200 OK { data[], pagination }
```

---

## 2. Créer un établissement (`POST /etablissements`)

```
Client [Bearer token : admin ou recenseur]
  │
  ├─► Middleware authenticate
  │
  ├─► Vérification du rôle (admin ou recenseur)
  │     └─ Autre rôle → 403
  │
  ├─► Validation Zod (createEtablissementSchema)
  │     Règle mutuellement exclusive :
  │     ├─ Mode A : gerantId seul (UUID d'un gérant existant)
  │     └─ Mode B : gerantEmail + gerantNom + gerantTelephone + gerantPassword
  │           └─ Mélanger les deux → 400
  │
  ├─► [Mode B] Hash du mot de passe gérant (bcrypt)
  │
  ├─► EtablissementService.createWithGerant (transaction Prisma)
  │     ├─ [Mode A] Vérification que le gérant existe et est libre
  │     ├─ [Mode B] Création du user gérant (rôle "etablissement")
  │     ├─ Création de l'établissement
  │     │     creePar = user.id, roleCreateur = user.role
  │     │     isVerified = false, isActive = true
  │     └─ Mise à jour du gérant : etablissementId = nouvel ID
  │
  └─► 201 Created { data: etablissement }
```

---

## 3. Détails d'un établissement (`GET /etablissements/:id`)

```
Client [Bearer token]
  │
  ├─► EtablissementService.findById
  │     └─ Non trouvé → 404
  │
  ├─► canManageEtablissement → false → 403
  │
  └─► 200 OK { data: etablissement }
```

---

## 4. Modifier un établissement (`PUT /etablissements/:id`)

```
Client [Bearer token] { nom?, type?, adresse?, ville?, région?, ... }
  │
  ├─► EtablissementService.findById
  │     └─ Non trouvé → 404
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► Validation Zod (updateEtablissementSchema, tous champs optionnels)
  │     Note : les champs gérant sont exclus (gérant non modifiable ici)
  │
  ├─► EtablissementService.update (seuls les champs présents sont mis à jour)
  │
  └─► 200 OK { data: etablissementMisAJour }
```

---

## 5. Supprimer un établissement (`DELETE /etablissements/:id`)

```
Client [Bearer token : admin uniquement]
  │
  ├─► Middleware authenticate + authorize("admin")
  │     └─ Autre rôle → 403
  │
  ├─► EtablissementService.delete (suppression définitive)
  │
  └─► 200 OK { message: "Etablissement supprimé" }
```

---

## 6. Valider un établissement (`POST /etablissements/:id/valider`)

```
Client [Bearer token : admin uniquement]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► EtablissementService.verifyEtablissement
  │     └─ isVerified = true
  │
  └─► 200 OK { data: etablissement }
```

> Un établissement non vérifié n'apparaît pas dans les rapports officiels BURIDA.

---

## 7. Suspendre un établissement (`POST /etablissements/:id/suspendre`)

```
Client [Bearer token : admin uniquement]
  │
  ├─► Middleware authenticate + authorize("admin")
  │
  ├─► EtablissementService.toggleActiveStatus(id, false)
  │     └─ isActive = false
  │
  └─► 200 OK { data: etablissement }
```

---

## 8. Statistiques d'un établissement (`GET /etablissements/:id/stats`)

```
Client [Bearer token] ?startDate ?endDate
  │
  ├─► EtablissementService.findById → 404 si absent
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► Chargement des diffusions
  │     ├─ [Avec dates] DiffusionService.findByDateRange
  │     └─ [Sans dates] DiffusionService.findByEtablissement (tout)
  │
  ├─► Calcul en mémoire :
  │     ├─ totalDiffusions
  │     ├─ musiquesUnique  (Set sur musicId)
  │     ├─ artistesUnique  (Set sur artiste.toLowerCase())
  │     └─ dureeTotaleHeures (Σ duree / 3600)
  │
  └─► 200 OK { etablissementId, periode, totalDiffusions, musiquesUnique,
                artistesUnique, dureeTotaleHeures }
```

---

## 9. Diffusions d'un établissement (`GET /etablissements/:id/diffusions`)

```
Client [Bearer token] ?page ?limit
  │
  ├─► EtablissementService.findById → 404 si absent
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► DiffusionService.findByEtablissement
  │
  ├─► Pagination manuelle
  │
  └─► 200 OK { data[], pagination }
```

---

## 10. Utilisateurs liés (`GET /etablissements/:id/users`)

```
Client [Bearer token]
  │
  ├─► EtablissementService.findById → 404 si absent
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► EtablissementService.findUsers(etablissementId)
  │     Retourne les users de la table de liaison (hors gérant)
  │
  └─► 200 OK { data[], total }
```

---

## 11. Associer un utilisateur (`POST /etablissements/:id/users`)

```
Client [Bearer token] { userId, role? }
  │
  ├─► EtablissementService.findById → 404
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► Validation Zod (userId UUID, role string max 50, défaut "staff")
  │
  ├─► EtablissementService.addUserToEtablissement
  │     Crée l'entrée dans la table de liaison
  │
  └─► 201 Created { data: association }
```

---

## 12. Retirer un utilisateur (`DELETE /etablissements/:id/users/:userId`)

```
Client [Bearer token]
  │
  ├─► EtablissementService.findById → 404
  │
  ├─► canManageEtablissement → false → 403
  │
  ├─► EtablissementService.removeUser(etablissementId, userId)
  │
  └─► 200 OK { message: "Utilisateur retiré" }
```

---

## Cycle de vie d'un établissement

```
[Création]
  isVerified: false ──► [Admin: POST /valider] ──► isVerified: true
  isActive: true    ──► [Admin: POST /suspendre] ─► isActive: false
                    ──► [Admin: DELETE /:id] ──────► Suppression définitive
```
