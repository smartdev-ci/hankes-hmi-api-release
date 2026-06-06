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
          tailleMaxMo: 10, providers: ["local-cache", "local-fingerprint", "acrcloud"], providerDefaut: "local-fingerprint" }
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
  │     Stocke les métadonnées de la capture en base
  │     audioUrl = "memory://<filename>" (buffer en RAM, pas encore sur S3)
  │
  ├─► fingerprintService.generate(audioBuffer, filename)
  │
  ├─► FingerprintRepository.findRecognitionByHash(fingerprintHash)
  │     ├─ Match local trouvé → persistLocalMatch(...)
  │     │     ├─ vérifie doublon via AudioCaptureService.checkDuplicate(...)
  │     │     ├─ crée ou récupère le Track existant
  │     │     ├─ MusicRecognitionService.createFromExisting(...)
  │     │     ├─ enregistre l'empreinte locale
  │     │     ├─ met en cache la reconnaissance
  │     │     ├─ crée une Diffusion dans la table `diffusions`
  │     │     └─ marque la capture comme traitée
  │     │
  │     └─ Pas de match local → persistAcrCloudMatch(...)
  │
  ├─► acrcloudService.identify(audioFile.buffer, filename)
  │     ├─ pas de métadonnées → AudioCaptureService.markAsFailed
  │     │     → réponse avec `no_match`
  │     │
  │     ├─ confiance < minConfidence → AudioCaptureService.markAsFailed
  │     │     → réponse `low_confidence`, rejected: true
  │     │
  │     ├─ doublon détecté → AudioCaptureService.markAsFailed
  │     │     → réponse `duplicate`, duplicate: true
  │     │
  │     └─ correspondance valide → MusicRecognitionService.create(...)
  │           → persist fingerprint, cache recognition, create diffusion
  │           → AudioCaptureService.markAsProcessed(capture.id)
  │           → réponse avec statut `identified`, diffusion, provider: `acrcloud`
```

### États possibles d'une capture

| Statut        | Signification                                           |
|---------------|---------------------------------------------------------|
| `processing`  | Capture créée, identification en cours                  |
| `identified`  | Musique identifiée avec succès                          |
| `failed`      | Capture échouée ou rejetée                              |
| `pending`     | En attente de synchronisation / traitement offline       |

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
  ├─► Pour chaque capture (séquentiellement) :
  │     AudioCaptureService.create
  │       { etablissementId, userId, audioUrl: batch.audioUrl || 'offline://<localId>',
  │         duree, format, taille, statut: 'pending',
  │         deviceId, capturedAt, syncedAt: now() }
  │
  ├─► Si `titre` et `artiste` sont fournis :
  │     TrackService.upsertFromRecognition(...)
  │     MusicRecognitionService.create(...)
  │     DiffusionService.create(...)
  │     FingerprintRepository.create(...) si fingerprint fournie
  │
  └─► 202 Accepted
        { success: true, message: "N capture(s) creee(s)", stats, data: [...] }
```

> Utilisé quand l'appareil n'a pas de connexion au moment de la capture.
> Le batch peut créer des captures `pending` et aussi des reconnaissances + diffusions si les métadonnées sont fournies.

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
  └─► 200 OK { success: true, data: capture }
        { id, etablissementId, statut, duree, format, capturedAt, syncedAt, recognition? }
```

---

## Schéma de décision — Mode de capture

```
App mobile
  │
  ├─► Connexion disponible ?
  │     OUI ──► POST /audio/capturer (identification hybride)
  │               │
  │               ├─► recherche locale par fingerprint
  │               └─► fallback ACRCloud si pas de match local
  │
  └─► NON ──► Enregistrement local (buffer + métadonnées)
                │
                └─► Reconnexion ──► POST /audio/sync (batch)
                                      statut: 'pending' ou reconnaissance enregistrée si données fournies
```

---

## 5. Schéma d'identification hybride

```
Buffer audio (WAV, 15s)
  │
  ├─► fingerprintService.generate
  │
  ├─► FingerprintRepository.findRecognitionByHash
  │     ├─ Match local
  │     │     ├─ MusicRecognitionService.createFromExisting
  │     │     ├─ DiffusionService.create
  │     │     └─ AudioCaptureService.markAsProcessed
  │     └─ Pas de match local
  │           ├─ acrcloudService.identify
  │           ├─ MusicRecognitionService.create
  │           ├─ DiffusionService.create
  │           └─ AudioCaptureService.markAsProcessed
```
