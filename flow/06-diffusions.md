# Flow — Diffusions Musicales

> Une diffusion représente un événement de lecture musicale identifié
> dans un établissement à un instant précis.

---

## 1. Lister les diffusions (`GET /diffusions`)

```
Client [Bearer token] ?page ?limit ?etablissementId ?startDate ?endDate ?artiste
  │
  ├─► Middleware authenticate
  │
  ├─► Chargement :
  │     ├─ [?etablissementId fourni] DiffusionService.findByEtablissement(etablissementId)
  │     └─ [Sinon]                   DiffusionService.findAll()
  │
  ├─► Filtres optionnels (en mémoire) :
  │     ├─ startDate → d.playedAt >= startDate
  │     ├─ endDate   → d.playedAt <= endDate
  │     └─ artiste   → d.artiste.toLowerCase().includes(artiste.toLowerCase())
  │
  ├─► Pagination (limit max: 100)
  │
  └─► 200 OK
        { data[], pagination: { page, limit, total, totalPages } }
```

**Note sur les permissions** : tous les utilisateurs authentifiés peuvent accéder
à cette liste. Le filtrage par rôle est géré en amont au niveau des établissements.

---

## 2. Détails d'une diffusion (`GET /diffusions/:diffusionId`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► DiffusionService.findById(diffusionId)
  │     └─ Non trouvé → 404
  │
  └─► 200 OK { data: diffusion }
```

### Structure d'une diffusion

```json
{
  "id": "uuid",
  "etablissementId": "uuid",
  "musicId": "uuid",
  "titre": "Nom de la musique",
  "artiste": "Nom de l'artiste",
  "playedAt": "2024-03-15T21:30:00.000Z",
  "duree": 210,
  "source": "capture | manual | playlist",
  "isrc": "CI-A01-24-00001",
  "label": "Label Records",
  "confidence": 0.98
}
```

---

## Sources de diffusion

| Source      | Description                                                        |
|-------------|--------------------------------------------------------------------|
| `capture`   | Identifiée automatiquement via ACRCloud (POST /audio/capturer)     |
| `manual`    | Saisie manuellement par le gérant                                  |
| `playlist`  | Extraite d'une playlist programmée                                 |

---

## Relation avec les autres modules

```
POST /audio/capturer
  │  (identification ACRCloud réussie)
  ▼
MusicRecognitionService.create
  │  (stocke titre, artiste, isrc, confidence...)
  ▼
DiffusionService (enregistrement automatique)
  │
  ├─► GET /diffusions                         → liste globale
  ├─► GET /diffusions/:id                     → détail
  ├─► GET /etablissements/:id/diffusions      → par établissement
  ├─► GET /artistes/me/diffusions             → par artiste connecté
  └─► GET /dashboard/top-musiques            → classement global
```

---

## Filtrage par période — Exemples pratiques

```
# Diffusions du mois de janvier 2024
GET /diffusions?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z

# Diffusions d'un artiste dans un établissement
GET /diffusions?etablissementId=<uuid>&artiste=Serge+Beynaud

# Dernières 20 diffusions (défaut)
GET /diffusions

# Page 3, 50 résultats par page
GET /diffusions?page=3&limit=50
```
