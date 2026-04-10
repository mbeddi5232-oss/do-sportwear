# sport-clothes

Plateforme e-commerce de vêtements de sport développée avec **Node.js**, **Express** et **MongoDB**.  
L’application combine un backend API et un frontend statique servi depuis le dossier `public/`.

---

## 🚀 1. Objectif du projet

`sport-clothes` est une application web de vente en ligne permettant :

- la gestion des produits
- la gestion des utilisateurs
- le traitement des commandes
- la collecte des avis clients
- une interface d’administration

---

## 🧰 2. Stack technique

### Backend
- Node.js
- Express
- Mongoose (MongoDB)
- Express Session
- Cookie Parser
- CORS
- Express Rate Limit
- dotenv
- bcrypt
- Stripe

### Frontend
- HTML / CSS / JavaScript (statique)
- Servi via Express (`public/`)

### DevOps / CI
- Jenkins
- ESLint
- npm audit

---

## 📁 3. Structure du projet


sport-clothes/
├── docs/
│ └── ci.md
├── public/
├── tests/
├── Jenkinsfile
├── eslint.config.mjs
├── generate-secret.js
├── package.json
├── package-lock.json
└── server.js


### Description

- `server.js` : point d’entrée principal
- `public/` : frontend statique
- `Jenkinsfile` : pipeline CI
- `docs/ci.md` : documentation CI existante
- `generate-secret.js` : génération de secret sécurisé

---

## ⚙️ 4. Prérequis

Avant de lancer le projet :

- Node.js (LTS recommandé)
- npm
- MongoDB (local ou distant)

---

## 🔐 Variables d’environnement

Créer un fichier `.env` à la racine du projet :

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sport-clothes
SESSION_SECRET=change-this-secret
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## 📦 6. Installation


npm ci


ou


npm install


---

## ▶️ 7. Lancement du projet

### Mode normal

npm start


### Mode développement

npm run dev


Accès :


http://localhost:3000


---

## 🧪 Scripts disponibles

```bash
npm start
npm run dev
npm test
```

⚠️ Actuellement, les tests automatisés ne sont pas encore implémentés.

---

## 🔄 9. Pipeline CI (Jenkins)

Le pipeline inclut :

1. Checkout du code
2. Vérification Node/npm
3. Installation (`npm ci`)
4. Linting (`eslint`)
5. Audit sécurité (`npm audit`)
6. Build (optionnel)
7. Tests (optionnels)

---

## 🔒 10. Sécurité
### Implémenté

- Protection contre brute-force (login)
- Cookies `httpOnly`
- Cookie sécurisé en production
- Rate limiting

## 📝 Journal de Bord : Automatisation CI/CD (Projet Sport-Clothes)

---

### 🗓️ Phase 1 : Mise en place de l'Infrastructure et Standardisation

- **Initialisation du pipeline Multibranche**  
  Configuration de Jenkins pour scanner automatiquement le dépôt GitHub et détecter les nouvelles branches (notamment la branche `feature/ci-mvp`).

- **Standardisation du code (Linting)**  
  Mise en place d'un *Quality Gate* utilisant ESLint.  
  Objectif : garantir que le code respecte les normes de développement et éviter les erreurs de syntaxe avant la compilation.

- **Résolution des conflits de dépendances**  
  Gestion des erreurs de versions entre ESLint 9 et 10 en utilisant le flag `--legacy-peer-deps` pour stabiliser l'installation sur Jenkins.

---

### 🗓️ Phase 2 : Sécurisation de la Supply Chain (Audit)

- **Analyse de vulnérabilités**  
  Utilisation de `npm audit` comme second *Gatekeeper* dans le pipeline.

- **Correction de failles critiques**
  - **Path-to-regexp (ReDoS)** : correction d'une vulnérabilité de déni de service liée aux expressions régulières.
  - **Brace-expansion & QS** : patch des fuites de mémoire (*Memory Exhaustion*) détectées dans les dépendances imbriquées.

- **Mise à jour du `package-lock.json`**  
  Application des correctifs en local, validation du statut **"0 vulnérabilité"**, puis synchronisation avec le dépôt distant pour garantir un build sain en production.

---

### 🗓️ Phase 3 : Build, Gestion des Branches et Artefacts

- **Configuration du Build Production**  
  Automatisation de la commande `npm run build` dans le `Jenkinsfile` pour générer des fichiers statiques optimisés.

- **Gestion du flux Git (Git Flow)**
  - Création et utilisation de la branche isolée `feature/ci-mvp`
  - Résolution des problèmes de synchronisation (*fetch/checkout*)
  - Gestion du staging (`git add`) pour assurer la traçabilité des modifications du pipeline

- **Mise en place de l'Archivage d'Artefacts**  
  Configuration de la directive `archiveArtifacts` dans Jenkins  
  - **Objectif** : sauvegarder le dossier `build/` après chaque build réussi  
  - Permet le téléchargement direct du site prêt à l’emploi depuis l’interface Jenkins

---


### ⚠️ Points à améliorer

- Secret de session par défaut présent
- Comptes admin codés en dur
- Absence de gestion avancée des secrets

### Recommandations

- Utiliser des variables d’environnement sécurisées
- Supprimer les credentials hardcodés
- Ajouter une gestion sécurisée des utilisateurs admin

---

## 📈 11. Améliorations recommandées

### Priorité haute
- Ajouter tests (Jest / Supertest)
- Externaliser toute configuration sensible
- Documenter les endpoints API

### Priorité moyenne
- Docker / Docker Compose
- Seed de base de données
- Logs et monitoring

---

## 📚 12. Documentation existante

- CI : `docs/ci.md`

---

## 🛣️ 13. Roadmap

- Stabilisation CI/CD
- Ajout des tests automatisés
- Renforcement sécurité
- Déploiement automatisé
- Documentation complète
