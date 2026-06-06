# Flow — Devices (Appareils Mobiles)

> Un `device` représente un appareil mobile (iOS ou Android) utilisé
> pour capturer de l'audio. Son enregistrement permet de gérer les
> push notifications et de tracer les captures par appareil.

---

## 1. Enregistrer / mettre à jour un appareil (`POST /devices`)

```
Client [Bearer token]
  │     { deviceId, platform, appVersion, osVersion, etablissementId?, pushToken? }
  │
  ├─► Middleware authenticate
  │
  ├─► Validation Zod (createDeviceSchema)
  │     deviceId : alphanumérique 16-64 chars
  │     platform ∈ [ios, android]
  │
  ├─► DeviceService.findByDeviceId(deviceId)
  │
  ├─► [Appareil déjà connu] → DeviceService.update
  │     { platform, appVersion, osVersion, etablissementId,
  │       pushToken, lastActiveAt: now() }
  │   → 200 OK { message: "Appareil mis à jour" }
  │
  └─► [Nouvel appareil] → DeviceService.create
  │     { userId: user.id, deviceId, platform, appVersion, osVersion,
  │       etablissementId, pushToken, lastActiveAt: now() }
  └─► 201 Created { message: "Appareil enregistré" }
```

> Appelez cet endpoint à chaque démarrage de l'app pour maintenir
> le `pushToken` à jour (il change après chaque réinstallation).

---

## 2. Lister les appareils (`GET /devices`)

```
Client [Bearer token] ?page ?limit ?etablissementId
  │
  ├─► Middleware authenticate
  │
  ├─► DeviceService.findAll()
  │
  ├─► Filtre par rôle :
  │     ├─ admin  → voit tous les appareils
  │     └─ autres → filtre sur device.userId === user.id
  │
  ├─► [?etablissementId] → filtre supplémentaire sur device.etablissementId
  │
  ├─► Pagination (limit max: 100)
  │
  └─► 200 OK { data[], pagination }
```

---

## 3. Mettre à jour un appareil (`PATCH /devices/:deviceId`)

```
Client [Bearer token]
  │     { etablissementId?, appVersion?, osVersion?, pushToken?, lastActiveAt? }
  │
  ├─► Middleware authenticate
  │
  ├─► Validation Zod (updateDeviceSchema, tous champs optionnels)
  │
  ├─► DeviceService.findById(deviceId)
  │
  ├─► Contrôle d'accès :
  │     └─ (non trouvé OU (non admin ET device.userId ≠ user.id)) → 404
  │
  ├─► DeviceService.update(device.id, { ...champs })
  │
  └─► 200 OK { data: deviceMisAJour }
```

---

## 4. Supprimer un appareil (`DELETE /devices/:deviceId`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► DeviceService.findById(deviceId)
  │
  ├─► Contrôle d'accès :
  │     └─ (non trouvé OU (non admin ET device.userId ≠ user.id)) → 404
  │
  ├─► DeviceService.delete(device.id)
  │
  └─► 200 OK { message: "Appareil supprimé" }
```

---

## Cycle de vie d'un appareil

```
Installation de l'app
  │
  ├─► POST /auth/login → accessToken
  │
  ├─► POST /devices (deviceId unique, pushToken FCM/APNs)
  │     → appareil enregistré, lié à l'utilisateur
  │
  ├─► Utilisation : POST /audio/capturer (deviceId transmis dans le body)
  │     → chaque capture tracée par appareil
  │
  ├─► Mise à jour app → PATCH /devices/:id (appVersion mis à jour)
  │
  ├─► Réinstallation → pushToken change
  │     → POST /devices (met à jour l'existant via deviceId stable)
  │
  └─► Fin d'utilisation → DELETE /devices/:id
```

---

## Champs clés

| Champ           | Description                                                   |
|-----------------|---------------------------------------------------------------|
| `deviceId`      | Identifiant stable de l'appareil (UUID généré côté app, 16-64 chars) |
| `platform`      | `ios` ou `android`                                            |
| `pushToken`     | Token FCM (Android) ou APNs (iOS) pour push notifications     |
| `etablissementId` | Établissement associé à l'appareil (optionnel)              |
| `lastActiveAt`  | Dernière activité de l'appareil                               |
