# Flow — Dashboard & Statistiques

> Les endpoints dashboard agrègent les données de diffusion pour produire
> des indicateurs exploitables. Certains sont réservés aux admins.

---

## 1. KPIs globaux (`GET /dashboard/kpis`)

```
Client [Bearer token : admin] ?startDate ?endDate
  │
  ├─► Middleware authenticate + authorize("admin")
  │     └─ Autre rôle → 403
  │
  ├─► Parsing de la période (parseDateRange)
  │     └─ Dates absentes → période par défaut (30 derniers jours)
  │
  ├─► SupabasePrismaService.getDashboardKpis({ startDate, endDate })
  │     Calcule en base :
  │     ├─ Nombre d'établissements actifs
  │     ├─ Total de diffusions sur la période
  │     ├─ Nombre de musiques uniques
  │     └─ Nombre d'artistes uniques
  │
  └─► 200 OK
        { data: { ...kpis, periode: { startDate, endDate } } }
```

---

## 2. Données cartographiques (`GET /dashboard/carte`)

```
Client [Bearer token] ?statut ?ville
  │
  ├─► Middleware authenticate (tous les rôles)
  │
  ├─► SupabasePrismaService.getMapData({ statut?, ville? })
  │     Retourne les établissements avec :
  │     ├─ nom, type, adresse, ville
  │     ├─ latitude, longitude (coordonnées GPS)
  │     ├─ isActive, isVerified
  │     └─ compteur de diffusions récentes (optionnel)
  │
  └─► 200 OK { data: [ { id, nom, latitude, longitude, ... } ] }
```

> Utilisé pour alimenter une carte interactive (Leaflet, Mapbox, etc.)
> avec les marqueurs des établissements.

---

## 3. Top musiques (`GET /dashboard/top-musiques`)

```
Client [Bearer token] ?limit ?startDate ?endDate
  │
  ├─► Middleware authenticate
  │
  ├─► Validation du limit : borné entre 5 et 50 (défaut: 10)
  │
  ├─► Parsing de la période (dates optionnelles)
  │
  ├─► SupabasePrismaService.getTopMusiques(limit, { startDate, endDate })
  │     Agrège les diffusions par titre/artiste, trie par nb de plays DESC
  │
  └─► 200 OK
        { data: {
            classement: [ { rang, titre, artiste, nbPlays, isrc } ],
            periode: { startDate, endDate }
          }
        }
```

---

## 4. Top artistes (`GET /dashboard/top-artistes`)

```
Client [Bearer token] ?limit ?startDate ?endDate
  │
  ├─► Middleware authenticate
  │
  ├─► Validation du limit : borné entre 5 et 50 (défaut: 10)
  │
  ├─► SupabasePrismaService.getTopArtistes(limit, { startDate, endDate })
  │     Agrège par artiste, trie par nb de plays DESC
  │
  └─► 200 OK
        { data: {
            classement: [ { rang, artiste, nbPlays, nbMusiques } ],
            periode: { startDate, endDate }
          }
        }
```

---

## 5. Évolution des diffusions (`GET /dashboard/evolution`)

```
Client [Bearer token] ?startDate ?endDate
  │
  ├─► Middleware authenticate
  │
  ├─► Parsing de la période
  │
  ├─► SupabasePrismaService.getDiffusionEvolution({ startDate, endDate })
  │     Retourne une série temporelle : 1 point par jour
  │     [ { date: "2024-01-01", nbDiffusions: 142 }, ... ]
  │
  └─► 200 OK
        { data: {
            evolution: [ { date, nbDiffusions } ],
            periode: { startDate, endDate, granularite: "jour" }
          }
        }
```

> Utilisé pour tracer un graphique en courbe sur le front-end (Chart.js, Recharts…).

---

## Permissions par endpoint

| Endpoint                    | Rôles autorisés       |
|-----------------------------|-----------------------|
| `GET /dashboard/kpis`       | `admin` uniquement    |
| `GET /dashboard/carte`      | Tous authentifiés     |
| `GET /dashboard/top-musiques` | Tous authentifiés   |
| `GET /dashboard/top-artistes` | Tous authentifiés   |
| `GET /dashboard/evolution`  | Tous authentifiés     |

---

## Exemple de requête complète — Vue mensuelle

```
# KPIs du mois de mars 2024
GET /dashboard/kpis?startDate=2024-03-01T00:00:00Z&endDate=2024-03-31T23:59:59Z

# Top 20 musiques du mois
GET /dashboard/top-musiques?limit=20&startDate=2024-03-01T00:00:00Z&endDate=2024-03-31T23:59:59Z

# Courbe d'évolution journalière du mois
GET /dashboard/evolution?startDate=2024-03-01T00:00:00Z&endDate=2024-03-31T23:59:59Z
```
