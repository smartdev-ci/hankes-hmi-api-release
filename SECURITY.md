# 🔒 Politique de Sécurité - HMIS API

## OWASP Top 10 Compliance

Cette API suit strictement les recommandations OWASP 2021 pour sécuriser les applications web.

### A01:2021 - Broken Access Control

**Mesures implémentées :**
- ✅ Middleware RBAC (`authorize()`) sur toutes les routes sensibles
- ✅ Vérification de propriété des ressources (user === owner)
- ✅ Principle of Least Privilege appliqué
- ✅ CORS configuré avec whitelist d'origins
- ✅ Headers de sécurité via Helmet.js

**Exemple :**
```typescript
router.get('/:id', authenticate, async (req, res) => {
  const etablissement = await EtablissementService.findById(req.params.id);
  
  // Vérification de propriété
  if (req.user.role !== 'admin' && etablissement.gerantId !== req.user.id) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
});
```

### A02:2021 - Cryptographic Failures

**Mesures implémentées :**
- ✅ HTTPS obligatoire en production (HSTS activé)
- ✅ bcrypt 12 rounds pour hashage mots de passe
- ✅ JWT signés avec algorithme HS256
- ✅ Secrets forts générés (min 64 caractères)
- ✅ Refresh tokens hashés avant stockage BDD
- ✅ Pas de données sensibles dans logs

**Configuration recommandée :**
```bash
# .env production
JWT_SECRET=$(openssl rand -hex 64)
BCRYPT_ROUNDS=12
```

### A03:2021 - Injection

**Mesures implémentées :**
- ✅ Prisma ORM (requêtes paramétrées automatiquement)
- ✅ Validation stricte avec Zod sur tous les inputs
- ✅ Échappement automatique des caractères spéciaux
- ✅ Pas de concaténation SQL manuelle
- ✅ Types TypeScript stricts

**Exemple validation :**
```typescript
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Min 8 caractères'),
  telephone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Format E.164 requis'),
});
```

### A04:2021 - Insecure Design

**Mesures implémentées :**
- ✅ Rate limiting par IP (100 req/min)
- ✅ OTP expiration (10 min) + max tentatives (3)
- ✅ JWT court (15 min) + refresh token rotation
- ✅ Account lockout après échecs répétés
- ✅ Session invalidation sur changement mot de passe

### A05:2021 - Security Misconfiguration

**Mesures implémentées :**
- ✅ Helmet.js avec headers sécurisés
- ✅ CORS restreint (configurable)
- ✅ Variables d'environnement séparées (dev/prod)
- ✅ Pas d'erreurs stack traces en production
- ✅ Versioning API (/v1/)

**Headers HTTP sécurisés :**
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### A06:2021 - Vulnerable and Outdated Components

**Mesures implémentées :**
- ✅ npm audit intégré au CI/CD
- ✅ Dépendances mises à jour mensuellement
- ✅ Lock file commité (package-lock.json)
- ✅ Versions pinées dans package.json

**Commandes de maintenance :**
```bash
npm audit --audit-level=moderate
npm outdated
npm update
```

### A07:2021 - Identification and Authentication Failures

**Mesures implémentées :**
- ✅ MFA via OTP SMS
- ✅ Password policy (min 8 chars, complexité)
- ✅ JWT expiration courte (15 min)
- ✅ Refresh tokens hashés + rotation
- ✅ Logout invalide tous les tokens
- ✅ Protection contre brute-force (rate limit)

**Flow d'authentification sécurisé :**
```
1. Login → OTP envoyé par SMS
2. Vérification OTP → JWT access + refresh
3. Access token : 15 min
4. Refresh token : 7 jours, hashé en BDD
5. Rotation refresh token à chaque usage
6. Logout → révocation immédiate
```

### A08:2021 - Software and Data Integrity Failures

**Mesures implémentées :**
- ✅ Validation input/output avec Zod
- ✅ Checksums S3 pour fichiers uploadés
- ✅ Signature HMAC pour API externes (ACRCloud)
- ✅ Content-Type validation
- ✅ File type validation (multer)

### A09:2021 - Security Logging and Monitoring Failures

**Mesures implémentées :**
- ✅ Logging structuré (Morgan + custom)
- ✅ Correlation ID par requête
- ✅ Alertes sur erreurs 5xx
- ✅ Audit trail pour actions critiques
- ✅ Pas de PII dans les logs

**Exemple log sécurisé :**
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  correlationId: req.headers['x-correlation-id'],
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  duration: Date.now() - startTime,
  // JAMAIS : password, token, email complet
}));
```

### A10:2021 - Server-Side Request Forgery (SSRF)

**Mesures implémentées :**
- ✅ URLs whitelistées pour APIs externes
- ✅ Pas de fetch d'URLs utilisateur
- ✅ Validation stricte des endpoints
- ✅ Network segmentation en production

---

## Checklist Sécurité Production

### Avant Déploiement

- [ ] HTTPS activé (certificat valide)
- [ ] JWT_SECRET fort généré
- [ ] DATABASE_URL sécurisé (SSL activé)
- [ ] CORS restreint aux domaines autorisés
- [ ] Rate limiting activé
- [ ] Logs vérifiés (pas de PII)
- [ ] Erreurs masquées en production
- [ ] Health endpoint protégé
- [ ] Backup BDD configuré
- [ ] Monitoring activé

### Configuration Serveur

```nginx
# Nginx reverse proxy recommandé
server {
    listen 443 ssl http2;
    server_name api.hmis-project.ci;

    ssl_certificate /etc/letsencrypt/live/api.hmis-project.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.hmis-project.ci/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Surveillance Continue

- [ ] npm audit hebdomadaire
- [ ] Revue logs quotidienne
- [ ] Alertes configureés (5xx, auth failures)
- [ ] Tests pénétration trimestriels
- [ ] Mise à jour dépendances mensuelle

---

## Signalement Vulnérabilité

Si vous découvrez une vulnérabilité, merci de la signaler de manière responsable :

📧 **Email** : security@hmis-project.ci  
🔐 **PGP Key** : Disponible sur demande

**Ne créez pas de ticket public pour une vulnérabilité sécurité.**

---

## Contact Sécurité

Pour toute question relative à la sécurité :

- **Responsable Sécurité** : security@hmis-project.ci
- **Urgence** : +225 XX XX XX XX (24/7)

---

*Dernière mise à jour : Janvier 2025*
