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

---

## 9. Documentation des tests automatises

Cette section documente la suite de tests backend actuellement presente dans le projet afin que chaque membre de l'equipe puisse :

- comprendre ce qui est deja couvert
- savoir comment executer les tests localement
- identifier les mocks utilises
- ajouter de nouveaux cas sans casser la suite existante

### 9.1 Objectif de la suite

Les tests verifies dans `tests/server.test.js` servent a securiser les parcours critiques de l'API Express, en particulier :

- l'etat de sante de l'application
- l'authentification admin
- l'inscription utilisateur
- la persistance de session
- la protection des routes privees
- la validation des avis produits

Le but n'est pas de tester MongoDB reellement, mais de valider le comportement HTTP et metier des routes.

### 9.2 Stack de test

- `Jest` : framework de test principal
- `Supertest` : envoi de requetes HTTP a l'application Express sans lancer un serveur externe
- `jest.spyOn(...)` : simulation des appels Mongoose et de certaines dependances pour isoler les scenarios

### 9.3 Fichiers impliques

- `tests/server.test.js` : suite principale des tests API
- `tests/setupEnv.js` : variables d'environnement chargees avant les tests
- `jest.config.cjs` : configuration Jest
- `server.js` : application cible testee

### 9.4 Configuration de test

La configuration Jest utilise :

- `testEnvironment: 'node'`
- `setupFiles: ['<rootDir>/tests/setupEnv.js']`
- `clearMocks: true`

Le fichier `tests/setupEnv.js` prepare un environnement de test isole avec :

- `NODE_ENV=test`
- `SESSION_SECRET=test-session-secret`
- `MONGODB_URI=mongodb://127.0.0.1:27017/sport-clothes-test`
- `STRIPE_SECRET_KEY=sk_test_dummy_key`

### 9.5 Commande d'execution

Pour lancer la suite localement :

```bash
npm test
```

Le script execute :

```bash
jest --runInBand
```

L'option `--runInBand` force l'execution des tests en serie. Dans ce projet, cela evite les effets de bord sur les sessions HTTP et rend la suite plus stable.

### 9.6 Principe de fonctionnement

Les tests appellent directement l'application exportee par `server.js` :

- `request(app)` pour les routes publiques ou les appels simples
- `request.agent(app)` pour conserver les cookies de session entre plusieurs requetes

Les acces base de donnees sont majoritairement remplaces par des mocks, par exemple :

- `jest.spyOn(User, 'findOne')`
- `jest.spyOn(Product, 'find')`
- `jest.spyOn(User.prototype, 'save')`

Cette approche permet de tester rapidement :

- les codes HTTP
- les messages d'erreur
- les objets JSON retournes
- le comportement des sessions

### 9.7 Couverture actuelle

Au moment de cette documentation, la suite contient **7 tests** dans `tests/server.test.js`.

#### A. Sante de l'application

- `GET /health`
  Verifie que le service repond avec `200` et expose :
  - `status`
  - `timestamp`
  - `uptime`

#### B. Administration

- `GET /api/admin/products`
  Verifie qu'un utilisateur non authentifie recoit `401`.

- `POST /api/admin/login`
  Verifie qu'un admin peut ouvrir une session et acceder ensuite a une route protegee.

#### C. Utilisateurs

- `POST /api/users/register`
  Verifie le rejet d'un email invalide avec `400`.

- `POST /api/users/register` puis `GET /api/users/check`
  Verifie qu'une inscription cree bien une session utilisateur exploitable.

#### D. Avis clients

- `POST /api/reviews`
  Verifie qu'un utilisateur non connecte recoit `401`.

- `POST /api/reviews`
  Verifie qu'une note en dehors de l'intervalle autorise est refusee avec `400`.

### 9.8 Resultat attendu

Si tout se passe correctement, la sortie Jest doit ressembler a :

```text
Test Suites: 1 passed, 1 total
Tests: 7 passed, 7 total
```

### 9.9 Interet pour l'equipe

Cette suite apporte une premiere base de securisation du backend :

- elle valide les routes les plus sensibles
- elle detecte rapidement une regression sur l'authentification
- elle fiabilise la pipeline Jenkins
- elle fournit un modele simple pour ecrire de nouveaux tests

### 9.10 Bonnes pratiques pour ajouter de nouveaux tests

Pour garder une suite lisible et maintenable, il est recommande de :

- regrouper les tests par domaine fonctionnel
- utiliser `request.agent(app)` quand une session doit etre conservee
- mocker les appels Mongoose au lieu d'utiliser la vraie base
- verifier a la fois le code HTTP et le contenu du JSON retourne
- appeler `jest.restoreAllMocks()` apres chaque test, comme c'est deja fait dans la suite

---

## 10. Pipeline CI (Jenkins)

Le pipeline inclut :

1. Checkout du code
2. Verification Node/npm
3. Installation (`npm ci`)
4. Linting (`eslint`)
5. Audit securite (`npm audit`)
6. Build (optionnel)
7. Tests (`npm test`)

---

## 11. Securite

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

## 12. Ameliorations recommandees

### Priorite haute

- Ajouter tests (Jest / Supertest)
- Externaliser toute configuration sensible
- Documenter les endpoints API

### Priorite moyenne

- Docker / Docker Compose
- Seed de base de donnees
- Logs et monitoring

---

## 13. Documentation existante

- CI : `docs/ci.md`

---

## 14. Roadmap

- Stabilisation CI/CD
- Ajout des tests automatises
- Renforcement securite
- Deploiement automatise
- Documentation complete
