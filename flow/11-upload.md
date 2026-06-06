# Flow — Upload d'Images

---

## 1. Uploader une image (`POST /upload/image`)

```
Client [Bearer token]
  │     Multipart/form-data : image (JPEG, PNG ou WebP)
  │
  ├─► Middleware authenticate
  │
  ├─► Filtrage multer
  │     ├─ Fichier absent → 400 "Aucune image fournie"
  │     ├─ Mimetype non autorisé (≠ image/jpeg, image/png, image/webp) → 400
  │     └─ Taille > 5 MB → 400 "Image trop volumineuse"
  │
  ├─► [Stockage non configuré] → 501 Not Implemented
  │     (S3 / Supabase Storage à brancher avant de mettre en production)
  │
  └─► [Stockage configuré]
        ├─ Upload vers S3 ou Supabase Storage
        └─ 200 OK { url: "https://storage.../image.jpg" }
```

---

## Contraintes techniques

| Paramètre         | Valeur                        |
|-------------------|-------------------------------|
| Champ formulaire  | `image`                       |
| Formats acceptés  | `image/jpeg`, `image/png`, `image/webp` |
| Taille maximale   | 5 MB                          |
| Stockage          | En RAM (buffer) → S3 / Supabase Storage |
| Statut actuel     | 501 (stockage non configuré en dev) |

---

## Cas d'usage

```
Upload photo d'identité recenseur :
  │  POST /upload/image (image de la pièce d'identité)
  │  → { url: "https://..." }
  └─► Utiliser l'URL dans POST /utilisateurs/recenseur { photoIdentiteUrl: url }

Upload photo d'établissement :
  │  POST /upload/image
  │  → { url: "https://..." }
  └─► Utiliser l'URL dans PUT /etablissements/:id { photoUrl: url }
```

---

## Configuration requise pour la production

```
# Variables d'environnement à configurer (S3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=hmis-uploads
AWS_REGION=eu-west-1

# Ou Supabase Storage
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_STORAGE_BUCKET=uploads
```
