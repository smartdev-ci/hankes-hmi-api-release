# Flow — Notifications

> Les notifications sont des alertes in-app liées à l'utilisateur connecté.
> Elles peuvent être générées par le système (validation d'établissement,
> rapport prêt, etc.) et marquées comme lues par l'utilisateur.

---

## 1. Lister les notifications (`GET /notifications`)

```
Client [Bearer token] ?page ?limit ?nonLues
  │
  ├─► Middleware authenticate
  │
  ├─► NotificationService.findByUser(user.id)
  │     Retourne toutes les notifications de l'utilisateur connecté
  │
  ├─► [?nonLues=true] → filtre sur notification.estLue === false
  │
  ├─► Pagination (limit max: 100)
  │
  └─► 200 OK
        { data: [ { id, titre, message, estLue, createdAt } ],
          pagination: { page, limit, total, totalPages } }
```

---

## 2. Marquer toutes comme lues (`POST /notifications/lire-tout`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► NotificationService.markAllAsRead(user.id)
  │     Met à jour estLue = true pour toutes les notifications de l'utilisateur
  │
  └─► 200 OK { message: "Toutes les notifications marquées comme lues", count: N }
```

---

## 3. Marquer une notification comme lue (`POST /notifications/:id/lire`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► NotificationService.findById(id)
  │
  ├─► Contrôle d'appartenance :
  │     └─ (non trouvée OU notification.userId ≠ user.id) → 404
  │
  ├─► NotificationService.markAsRead(id)
  │     → estLue = true
  │
  └─► 200 OK { message: "Notification marquée comme lue" }
```

---

## Intégration côté front-end

```
Au chargement de l'app :
  │
  ├─► GET /notifications?nonLues=true&limit=5
  │     → Afficher le badge de compteur (nombre retourné)
  │
  ├─► Clic sur le centre de notifications
  │     GET /notifications?page=1&limit=20
  │
  ├─► Clic sur une notification → POST /notifications/:id/lire
  │
  └─► Bouton "Tout marquer comme lu" → POST /notifications/lire-tout
```

---

## Structure d'une notification

```json
{
  "id": "uuid",
  "userId": "uuid",
  "titre": "Établissement validé",
  "message": "Votre établissement \"Le Maquis du Plateau\" a été validé.",
  "estLue": false,
  "createdAt": "2024-03-15T10:00:00.000Z"
}
```

---

## Événements déclencheurs (générés par le système)

| Événement                          | Destinataire              |
|------------------------------------|---------------------------|
| Établissement validé               | Gérant de l'établissement |
| Établissement suspendu             | Gérant de l'établissement |
| Rapport prêt à télécharger         | Auteur du rapport         |
| Nouvelle capture traitée (échec)   | Recenseur / gérant        |
| Compte créé (bienvenue)            | Nouvel utilisateur        |
