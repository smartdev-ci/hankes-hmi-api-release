# 📋 Spécification — Rôle Recenseur (Next.js PWA)

## 🎯 Objectif
Le **Recenseur** est un utilisateur chargé d’effectuer le recensement des établissements (bars, maquis, restaurants, etc.).  
Il doit pouvoir se connecter à l’application, consulter ses indicateurs de performance (KPI), gérer la liste des établissements qu’il a enregistrés, et en ajouter de nouveaux.  
L’application est une **Progressive Web App (PWA)** construite avec **Next.js** afin de permettre une utilisation fluide sur mobile, avec support hors‑ligne et synchronisation.

---

## 👤 Recenseur
### Tâches principales
- **Connexion sécurisée** via JWT/OAuth (NextAuth.js ou API custom).  
- **Accès au tableau de bord personnalisé** :  
  - Nombre total d’établissements enregistrés par lui.  
  - Statistiques (par type d’établissement, par zone géographique, par période).  
- **Gestion de ses établissements** :  
  - Liste des établissements enregistrés.  
  - Actions disponibles : modifier, supprimer, consulter détails.  
- **Ajout d’un établissement** :  
  - Formulaire avec champs obligatoires (nom, type, localisation, contact, etc.).  
  - Validation et enregistrement dans la base via API REST/GraphQL.  

---

## ⚙️ Fonctions
- **Tableau de bord KPI** : affichage dynamique des indicateurs liés au recenseur.  
- **CRUD établissements** : création, lecture, mise à jour, suppression via API.  
- **Filtrage et recherche** : possibilité de filtrer ses établissements par type ou localisation.  
- **Traçabilité** : chaque établissement est lié au recenseur qui l’a enregistré.  
- **Mode hors‑ligne (PWA)** : stockage local (IndexedDB ou localStorage) et synchronisation différée avec le backend.  
- **Géolocalisation & photos** : possibilité d’ajouter la position GPS et une photo de l’établissement.  

---

## 🖥️ Écrans / Interfaces (Next.js)
- `/login` → page de connexion (NextAuth.js ou custom).  
- `/dashboard` → tableau de bord avec KPI et statistiques.  
- `/etablissements` → liste des établissements enregistrés par le recenseur.  
- `/etablissements/new` → formulaire d’ajout d’un établissement.  
- `/etablissements/[id]/edit` → modification d’un établissement existant.  

---

## 📱 Spécificités PWA
- **Installation mobile** : ajout sur écran d’accueil via `manifest.json`.  
- **Service Worker** : cache des assets et gestion hors‑ligne avec `next-pwa`.  
- **IndexedDB/localStorage** : stockage local des établissements en attente de synchronisation.  
- **Notifications push** : rappels ou confirmations de synchronisation.  
- **Accès natif** : caméra pour photos, GPS pour géolocalisation via API Web.  

---

## 🏗️ Stack technique recommandée
- **Frontend** : Next.js 14 (App Router) + TailwindCSS + Zustand/Redux pour état global.  
- **Backend API** : Node.js/Express ou NestJS (REST/GraphQL).  
- **Base de données** : PostgreSQL/MySQL avec Prisma ORM.  
- **Auth** : NextAuth.js avec JWT/OAuth.  
- **PWA features** : `manifest.json`, `service-worker.js`, `next-pwa`.  

---

## ⚡ Points clés
- Chaque recenseur ne voit **que ses propres établissements**.  
- Les KPI sont calculés en fonction des données qu’il a saisies.  
- Architecture modulaire pour permettre l’évolution (ajout futur de validation par superviseur, export de rapports, etc.).  
- Respect des normes de sécurité (authentification JWT/OAuth, validation des données, protection contre injections).  

---
