# sport-clothes

Plateforme e-commerce de vetements de sport developpee avec **Node.js**, **Express** et **MongoDB**.
L'application combine un backend API et un frontend statique servi depuis le dossier `public/`.

---

## 1. Objectif du projet

`sport-clothes` est une application web de vente en ligne permettant :

- la gestion des produits
- la gestion des utilisateurs
- le traitement des commandes
- la collecte des avis clients
- une interface d'administration

---

## 2. Stack technique

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

## 3. Structure du projet

```text
sport-clothes/
|-- docs/
|   `-- ci.md
|-- public/
|-- Jenkinsfile
|-- eslint.config.mjs
|-- generate-secret.js
|-- package.json
|-- package-lock.json
`-- server.js
```

### Description

- `server.js` : point d'entree principal
- `public/` : frontend statique
- `Jenkinsfile` : pipeline CI
- `docs/ci.md` : documentation CI existante
- `generate-secret.js` : generation de secret securise

---

## 4. Prerequis

Avant de lancer le projet :

- Node.js (LTS recommande)
- npm
- MongoDB (local ou distant)

---

## 5. Variables d'environnement

Creer un fichier `.env` a la racine du projet :

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sport-clothes
SESSION_SECRET=change-this-secret
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## 6. Installation

```bash
npm ci
```

ou

```bash
npm install
```

---

## 7. Lancement du projet

### Mode normal

```bash
npm start
```

### Mode developpement

```bash
npm run dev
```

Acces :

```text
http://localhost:3000
```

---

## 8. Scripts disponibles

```bash
npm start
npm run dev
npm test
```

### Partie ajoutee : tests unitaires et tests d'integration API

Une nouvelle suite de tests automatises a ete ajoutee pour securiser les fonctionnalites critiques du backend.

#### Outils utilises

- `Jest` pour executer les tests
- `Supertest` pour simuler les requetes HTTP sur l'application Express
- des mocks `jest.spyOn(...)` pour eviter l'acces reel a MongoDB dans les scenarios testes

#### Fichiers concernes

- `tests/server.test.js`
- `tests/setupEnv.js`
- `jest.config.cjs`

#### Commande d'execution

```bash
npm test
```

Cette commande lance :

```bash
jest --runInBand
```

#### Tests ajoutes

Les tests ajoutes couvrent notamment :

- la verification du endpoint `GET /health`
- l'authentification admin
- la verification et la suppression de session admin
- la protection des routes admin
- la creation d'une session utilisateur apres inscription
- la connexion utilisateur avec succes et en cas d'echec
- la deconnexion utilisateur
- l'acces au profil utilisateur avec et sans authentification
- la recuperation du catalogue produits
- la gestion d'un produit introuvable
- la creation d'une commande en mode invite
- la recuperation des commandes d'un utilisateur connecte
- le refus d'acces aux commandes sans connexion
- le suivi d'une commande par numero de tracking
- la protection des routes d'avis
- la validation de la note d'un avis
- le refus des doublons d'avis
- l'increment du compteur `helpful`

#### Resultat attendu

```text
Test Suites: 1 passed, 1 total
Tests: 25 passed, 25 total
```

#### Interet de ces tests

Ces tests permettent de :

- verifier les parcours critiques du backend
- securiser les mecanismes d'authentification et d'autorisation
- valider le comportement des sessions
- rendre le pipeline Jenkins plus fiable

Une adaptation a aussi ete faite dans `server.js` pour ignorer le rate limiter quand `NODE_ENV=test`, afin d'eviter les faux echecs pendant l'execution des tests.

---

## 9. Pipeline CI (Jenkins)

Le pipeline inclut :

1. Checkout du code
2. Verification Node/npm
3. Installation (`npm ci`)
4. Linting (`eslint`)
5. Audit securite (`npm audit`)
6. Build (optionnel)
7. Tests (`npm test`)

---

## 10. Securite

### Implemente

- Protection contre brute-force (login)
- Cookies `httpOnly`
- Cookie securise en production
- Rate limiting

### Points a ameliorer

- Secret de session par defaut present
- Comptes admin codes en dur
- Absence de gestion avancee des secrets

### Recommandations

- Utiliser des variables d'environnement securisees
- Supprimer les credentials hardcodes
- Ajouter une gestion securisee des utilisateurs admin

---

## 11. Ameliorations recommandees

### Priorite haute

- Ajouter tests (Jest / Supertest)
- Externaliser toute configuration sensible
- Documenter les endpoints API

### Priorite moyenne

- Docker / Docker Compose
- Seed de base de donnees
- Logs et monitoring

---

## 12. Documentation existante

- CI : `docs/ci.md`

---

## 13. Roadmap

- Stabilisation CI/CD
- Ajout des tests automatises
- Renforcement securite
- Deploiement automatise
- Documentation complete
