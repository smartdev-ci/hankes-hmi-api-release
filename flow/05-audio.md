# Flow — Capture Audio & Reconnaissance Musicale

---

## 1. Configuration de capture (`GET /audio/config`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  └─► 200 OK (statique)
        { dureeExtraitSecondes: 15, formatAudio: "wav",
          frequenceEchantillonnage: 44100, canaux: 1, bitrate: 128,
          tailleMaxMo: 10, providers: ["acrcloud"], providerDefaut: "acrcloud" }
```

> À appeler au démarrage de l'application mobile pour configurer le recorder
> avec les bons paramètres avant toute capture.

---

## 2. Capture en temps réel (`POST /audio/capturer`)

```
Client [Bearer token]
  │     Multipart/form-data : audio (fichier), etablissementId, deviceId?, duree, capturedAt?
  │
  ├─► Middleware authenticate
  │
  ├─► Validation multer
  │     ├─ Fichier audio manquant → 400
  │     ├─ Mauvais mimetype (non audio/*) → 400
  │     └─ Taille > 10 MB → 400
  │
  ├─► Validation manuelle : etablissementId requis → 400 si absent
  │
  ├─► AudioCaptureService.create (statut: "processing")
  │     Stocke les métadonnées de capture en base
  │     audioUrl = "memory://<filename>" (buffer en RAM, pas encore sur S3)
  │
  ├─► acrcloudService.identify(audioFile.buffer, filename)
  │     ├─ [Succès] → MusicRecognitionService.create
  │     │     { captureId, titre, artiste, isrc, label, annee, genre,
  │     │       confidence, source: "acrcloud", metadata }
  │     │   → AudioCaptureService.markAsProcessed(capture.id)
  │     │   → 200 OK { captureId, statut: "processed", resultat: recognition }
  │     │
  │     ├─ [Aucune correspondance] → AudioCaptureService.markAsFailed
  │     │   → 200 OK { captureId, statut: "failed", resultat: null }
  │     │
  │     └─ [Erreur ACRCloud] → AudioCaptureService.markAsFailed
  │         → 502 Bad Gateway { error, captureId }
```

### États possibles d'une capture

| Statut       | Signification                                       |
|--------------|-----------------------------------------------------|
| `processing` | Capture créée, identification en cours              |
| `processed`  | Musique identifiée avec succès                      |
| `failed`     | Aucune correspondance trouvée ou erreur ACRCloud     |
| `pending`    | En attente de traitement (mode offline via /sync)   |

---

## 3. Synchronisation hors-ligne (`POST /audio/sync`)

```
Client [Bearer token]
  │     { captures: [ AudioSyncItem, ... ] }
  │
  ├─► Middleware authenticate
  │
  ├─► Validation : tableau non vide → sinon 400
  │
  ├─► Pour chaque capture (Promise.all) :
  │     AudioCaptureService.create
  │       { etablissementId, userId, audioUrl: "offline://<localId>",
  │         duree, format, taille, statut: "pending",
  │         deviceId, capturedAt, syncedAt: now() }
  │
  └─► 202 Accepted
        { message: "N captures synchronisées", data: [ captures créées ] }
```

> Utilisé quand l'appareil n'a pas de connexion au moment de la capture.
> Les captures `pending` sont traitées ultérieurement (traitement différé non implémenté).

---

## 4. Statut d'une capture (`GET /audio/statut/:captureId`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► AudioCaptureService.findById(captureId)
  │     └─ Non trouvé → 404
  │
  └─► 200 OK { data: capture }
        { id, etablissementId, statut, duree, format, capturedAt, syncedAt }
```

---

## Schéma de décision — Mode de capture

```
App mobile
  │
  ├─► Connexion disponible ?
  │     OUI ──► POST /audio/capturer (identification immédiate ACRCloud)
  │               │
  │               └─ Réponse instantanée avec titre + artiste identifiés
  │
  └─► NON ──► Enregistrement local (buffer + métadonnées)
                │
                └─► Reconnexion ──► POST /audio/sync (batch)
                                      statut: "pending"
                                      (traitement différé)
```

---

## Schéma d'identification ACRCloud

```
Buffer audio (WAV, 15s)
  │
  ├─► acrcloudService.identify
  │     API : identify-eu-west-1.acrcloud.com
  │
  ├─► Réponse ACRCloud
  │     { title, artist, isrc, label, releaseDate, genres[], confidence }
  │
  ├─► MusicRecognitionService.create
  │     Stocke la reconnaissance liée à la capture
  │
  └─► Diffusion créée (lien entre établissement + musique + date)
```
