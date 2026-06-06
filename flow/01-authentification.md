# Flow — Authentification

## 1. Inscription (`POST /auth/register`)

```
Client
  │
  ├─► Validation Zod (email, password ≥8 chars, téléphone E.164, rôle)
  │     └─ KO → 400 Bad Request
  │
  ├─► Vérification email unique (UserService.findByEmail)
  │     └─ KO → 409 Conflict
  │
  ├─► Vérification téléphone unique (UserService.findByTelephone)
  │     └─ KO → 409 Conflict
  │
  ├─► Hash du mot de passe (bcrypt, cost 12)
  │
  ├─► Création de l'utilisateur (UserService.create)
  │     isVerified: false, isActive: true
  │
  ├─► [Si rôle = "etablissement" ET établissement fourni]
  │     └─ Création de l'établissement lié (EtablissementService.create)
  │
  ├─► Génération OTP 6 chiffres, expiration 10 min (OTPService.create)
  │
  └─► 201 Created
        { userId, message, otpExpireIn: 600 }
```

**Règle importante** : le compte est créé avec `isVerified: false`. La connexion sera refusée tant que l'OTP n'est pas validé.

---

## 2. Vérification OTP (`POST /auth/otp/verifier`)

```
Client { phone, otp }
  │
  ├─► Validation Zod (phone E.164, otp = 6 chiffres)
  │
  ├─► Recherche de l'OTP valide (OTPService.findValidOTP)
  │     └─ KO → 400 (invalide ou expiré)
  │
  ├─► Suppression de l'OTP consommé (OTPService.delete)
  │
  ├─► [Si purpose = "REGISTER"]
  │     └─ Mise à jour du compte : isVerified = true (UserService.update)
  │
  └─► 200 OK { message: "Code OTP vérifié avec succès" }
```

---

## 3. Connexion (`POST /auth/login`)

```
Client { email, password, deviceId? }
  │
  ├─► Validation Zod
  │
  ├─► Recherche utilisateur par email (UserService.findByEmail)
  │     └─ KO → 401
  │
  ├─► Comparaison mot de passe (bcrypt.compare)
  │     └─ KO → 401
  │
  ├─► Vérification isVerified
  │     └─ false → 403 "Compte non vérifié"
  │
  ├─► Vérification isActive
  │     └─ false → 403 "Compte suspendu"
  │
  ├─► Génération accessToken JWT (expire 15 min)
  │     payload: { userId, email, role }
  │
  ├─► Génération refreshToken JWT (expire 7 jours)
  │
  ├─► Hash du refreshToken + stockage en base (RefreshTokenService.create)
  │     avec deviceId si fourni
  │
  └─► 200 OK
        { accessToken, refreshToken, expiresIn: 900, tokenType: "Bearer", user }
```

---

## 4. Renouvellement du token (`POST /auth/refresh`)

```
Client { refreshToken }
  │
  ├─► Vérification signature JWT (jwt.verify)
  │     └─ KO → 401
  │
  ├─► Recherche en base par userId (RefreshTokenService.findByUserId)
  │     └─ Aucun → 401
  │
  ├─► Comparaison hash (bcrypt.compare token ↔ tokenHash)
  │     └─ KO → 401
  │
  ├─► Vérification expiration
  │     └─ Expiré → suppression + 401
  │
  ├─► Suppression de l'ancien refreshToken (rotation)
  │
  ├─► Génération nouveaux accessToken + refreshToken
  │
  ├─► Stockage nouveau refreshToken hashé
  │
  └─► 200 OK { accessToken, refreshToken, expiresIn: 900 }
```

---

## 5. Déconnexion (`POST /auth/logout`)

```
Client [Bearer token requis]
  │
  ├─► Middleware authenticate (vérification JWT)
  │
  ├─► Révocation de tous les refresh tokens de l'utilisateur
  │     (RefreshTokenService.revokeUserTokens)
  │
  └─► 200 OK { message: "Déconnexion réussie" }
```

---

## 6. Envoi OTP à la demande (`POST /auth/otp/envoyer`)

```
Client { phone, purpose }
  │     purpose ∈ [REGISTER, LOGIN, PASSWORD_RESET, TWO_FACTOR]
  │
  ├─► Validation Zod
  │
  ├─► Génération OTP 6 chiffres, expiration 10 min (OTPService.create)
  │
  └─► 200 OK { message, otpExpireIn: 600 }
```

---

## 7. Réinitialisation mot de passe (`POST /auth/password/reset`)

```
Client { email }
  │
  ├─► Validation Zod
  │
  ├─► Recherche utilisateur par email (UserService.findByEmail)
  │     └─ Non trouvé → réponse identique (sécurité : ne pas révéler l'existence du compte)
  │
  ├─► [Si compte trouvé] → génération token signé + envoi email (TODO)
  │
  └─► 200 OK { message générique }
```

---

## 8. Confirmation réinitialisation (`POST /auth/password/reset/confirmer`)

```
Client { token, newPassword }
  │
  ├─► Validation Zod (token non vide, newPassword ≥ 8 chars)
  │
  ├─► Vérification et application du token (TODO en cours d'implémentation)
  │
  └─► 200 OK { message: "Mot de passe réinitialisé" }
```

---

## 9. Changement de mot de passe (`PATCH /auth/changer-password`)

```
Client [Bearer token] { currentPassword, newPassword }
  │
  ├─► Middleware authenticate
  │
  ├─► Validation Zod (≥ 8 chars chacun)
  │
  ├─► Récupération de l'utilisateur (UserService.findById)
  │     └─ Non trouvé → 404
  │
  ├─► Vérification de l'ancien mot de passe (bcrypt.compare)
  │     └─ KO → 400 "Mot de passe actuel incorrect"
  │
  ├─► Hash du nouveau mot de passe (bcrypt)
  │
  ├─► Mise à jour en base (UserService.update)
  │
  ├─► Révocation de tous les refresh tokens (déconnexion forcée)
  │
  └─► 200 OK { message: "Veuillez vous reconnecter" }
```

---

## 10. Profil connecté (`GET /auth/me`)

```
Client [Bearer token]
  │
  ├─► Middleware authenticate
  │
  ├─► Récupération de l'utilisateur (UserService.findById)
  │     └─ Non trouvé → 404
  │
  └─► 200 OK { id, email, nom, telephone, role, isVerified, etablissementId, createdAt }
```

---

## Schéma global des tokens

```
Connexion
   │
   ├─► accessToken  (JWT, 15 min) ────► À envoyer dans chaque requête
   │                                    Header: Authorization: Bearer <token>
   │
   └─► refreshToken (JWT, 7 jours) ───► À stocker de façon sécurisée
                                        Utiliser POST /auth/refresh avant expiration
```
