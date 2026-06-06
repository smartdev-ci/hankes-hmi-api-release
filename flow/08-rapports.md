# Flow — Rapports

> La génération de rapport est **asynchrone** : la requête retourne immédiatement
> un rapport en statut `en_cours`. Le fichier final (PDF ou Excel) est
> disponible après interrogation de l'endpoint de statut.

---

## 1. Générer un rapport (`POST /rapports`)

```
Client [Bearer token]
  │     { type, dateDebut, dateFin, format?, etablissementId?, metadata? }
  │
  ├─► Middleware authenticate
  │
  ├─► Extraction des paramètres :
  │     type     ∈ [etablissement, periode, artiste]
  │     format   ∈ [pdf, excel], défaut "pdf"
  │     dateDebut / dateFin : dates ISO 8601
  │
  ├─► RapportService.create
  │     { type, dateDebut, dateFin, format,
  │       statut: "en_cours",
  │       generePar: user.id,
  │       etablissementId: (optionnel),
  │       metadata: (optionnel) }
  │
  └─► 202 Accepted
        { message: "Rapport en cours de génération", data: rapport }
```

### Types de rapport

| Type            | Description                                              |
|-----------------|----------------------------------------------------------|
| `etablissement` | Détail des diffusions pour un établissement spécifique   |
| `periode`       | Vue globale sur une période (tous établissements)        |
| `artiste`       | Diffusions centrées sur un artiste                       |

---

## 2. Lister les rapports (`GET /rapports`)

```
Client [Bearer token] ?page ?limit ?typeRapport ?startDate ?endDate
  │
  ├─► Middleware authenticate
  │
  ├─► RapportService.findAll()
  │
  ├─► Filtre par rôle :
  │     ├─ admin   → voit tous les rapports
  │     └─ autres  → voit uniquement ses propres rapports (generePar === user.id)
  │
  ├─► Filtres optionnels (en mémoire) :
  │     ├─ type      → rapport.type === typeRapport
  │     ├─ startDate → rapport.dateGeneration >= startDate
  │     └─ endDate   → rapport.dateGeneration <= endDate
  │
  ├─► Pagination (limit max: 100)
  │
  └─► 200 OK { data[], pagination }
```

---

## 3. Détails d'un rapport (`GET /rapports/:rapportId`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► RapportService.findById(rapportId)
  │
  ├─► Contrôle d'accès :
  │     └─ (rapport absent OU (non admin ET generePar ≠ user.id)) → 404
  │
  └─► 200 OK
        { data: { id, type, statut, format, dateDebut, dateFin,
                  fichierUrl, dateGeneration } }
```

---

## 4. Télécharger un rapport (`GET /rapports/:rapportId/telecharger`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► RapportService.findById(rapportId)
  │
  ├─► Contrôle d'accès (même règle que GET /:id) → 404
  │
  ├─► Vérification statut :
  │     └─ statut ≠ "termine" OU fichierUrl absent → 409 Conflict
  │
  └─► 200 OK
        { data: { url: "https://...", format: "pdf" } }
```

---

## Cycle de vie d'un rapport

```
POST /rapports
  │   statut: "en_cours"
  │
  ├─► Traitement asynchrone (background job)
  │     ├─ Récupération des données (DiffusionService, EtablissementService...)
  │     ├─ Génération du fichier (PDF via librairie / Excel via xlsx)
  │     └─ Upload sur S3 / Supabase Storage → fichierUrl renseigné
  │
  ├─► statut: "termine"  → fichierUrl disponible
  │
  └─► statut: "erreur"   → fichierUrl null
```

```
Polling côté front-end :
  │
  ├─► POST /rapports → { id, statut: "en_cours" }
  │
  ├─► GET  /rapports/:id (toutes les 3s)
  │     └─ statut "en_cours" → attendre
  │     └─ statut "termine"  → continuer
  │     └─ statut "erreur"   → afficher l'erreur
  │
  └─► GET /rapports/:id/telecharger → { url }
        Rediriger l'utilisateur vers l'URL pour téléchargement
```

---

## Permissions

| Action                        | Rôles autorisés                        |
|-------------------------------|----------------------------------------|
| Générer un rapport            | Tous les authentifiés                  |
| Lister les rapports           | Admin (tous) / Autres (les leurs)      |
| Voir détails / télécharger    | Admin (tous) / Auteur du rapport       |
