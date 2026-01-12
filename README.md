# StaticaMaster

Application pédagogique interactive pour l'évaluation des compétences en statique.

**Cours:** 203-4A3-RA — Équilibre et analyse des structures
**Contexte:** Techniques de génie du plastique (CÉGEP)

## Fonctionnalités

- **5 Modules** correspondant aux sections du cours
- **Quiz interactifs** avec validation instantanée
- **DCL interactif** (Diagramme de Corps Libre) avec drag & drop
- **Multi-vues** pour chaque problème (Schéma, Équations, Calculs)
- **Feedback ciblé** avec détection des erreurs courantes
- **Suivi de progression** par compétence et module
- **Mode enseignant** avec export des résultats

## Prérequis

- Node.js 18+ (recommandé: 20+)
- npm ou yarn

## Installation

```bash
# Cloner ou télécharger le projet
cd statique-app

# Installer les dépendances
npm install

# Initialiser la base de données
npm run db:init

# Lancer en mode développement
npm run dev
```

L'application sera accessible à http://localhost:3000

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile l'application pour la production |
| `npm run start` | Lance l'application compilée |
| `npm run db:init` | Initialise la base de données SQLite |
| `npm run lint` | Vérifie le code avec ESLint |

## Structure du projet

```
statique-app/
├── data/
│   ├── questions/           # Questions JSON par module
│   │   ├── module1-bases.json
│   │   ├── module2-point.json
│   │   ├── module3-rigide.json
│   │   ├── module4-structures.json
│   │   └── module5-rdm.json
│   └── database.sqlite      # Base de données locale
│
├── src/
│   ├── app/                 # Pages Next.js (App Router)
│   │   ├── api/             # API Routes
│   │   ├── modules/         # Page de sélection des modules
│   │   ├── quiz/[moduleId]/ # Pages de quiz
│   │   ├── progress/        # Tableau de bord progression
│   │   └── teacher/         # Mode enseignant
│   │
│   ├── components/
│   │   ├── ui/              # Composants UI réutilisables
│   │   ├── quiz/            # Composants de quiz
│   │   ├── dcl/             # Canvas DCL interactif
│   │   └── problem/         # Conteneur multi-vues
│   │
│   ├── lib/
│   │   ├── db.ts            # Connexion SQLite
│   │   ├── questions.ts     # Gestion des questions
│   │   ├── validation.ts    # Moteur de validation
│   │   └── utils.ts         # Fonctions utilitaires
│   │
│   └── types/               # Types TypeScript
│
└── scripts/
    └── init-db.ts           # Script d'initialisation BD
```

## Modules du cours

### Module 1 — Bases mathématiques
- Trigonométrie appliquée
- Vecteurs (graphique + analytique)
- Décomposition en composantes
- Produit vectoriel

### Module 2 — Équilibre d'un point matériel
- Diagramme de corps libre (DCL)
- Équilibre 2D (ΣFx=0, ΣFy=0)
- Force résultante et équilibrante
- Membrure à deux forces

### Module 3 — Équilibre d'un corps rigide
- Moment de force
- Bras de levier
- Couples de forces
- Conditions d'équilibre (ΣFx=0, ΣFy=0, ΣM=0)
- Types d'appuis et réactions

### Module 4 — Équilibre des structures
- Treillis 2D (hypothèses)
- Méthode des nœuds
- Méthode des sections
- Forces internes vs externes

### Module 5 — Résistance des matériaux
- Contraintes (σ) et déformations (ε)
- Module de Young (E)
- Diagramme traction
- Coefficient de sécurité (FS)

## Format des questions

Les questions sont stockées en JSON avec la structure suivante:

```json
{
  "id": "m1-q1-decomposition",
  "module": 1,
  "tags": ["vectors", "decomposition"],
  "difficulty": "beginner",
  "type": "numeric",
  "title": "Décomposition d'un vecteur",
  "statement": "Une force F = {F} N...",
  "givens": { "F": 100, "angle": 30 },
  "unknowns": ["Fx"],
  "answer": {
    "variable": "Fx",
    "value": 86.6,
    "unit": "N",
    "tolerance": 2,
    "toleranceType": "percent"
  },
  "hints": ["Indice 1", "Indice 2"],
  "commonMistakes": [...],
  "explanation": "Explication complète...",
  "parameters": {
    "F": { "min": 50, "max": 200, "step": 10, "unit": "N" }
  },
  "answerFormula": "F * cos(rad(angle))"
}
```

## Types de questions supportés

| Type | Description |
|------|-------------|
| `mcq` | Choix multiples |
| `numeric` | Réponse numérique avec tolérance |
| `dcl` | Diagramme de corps libre interactif |
| `equation` | Sélection d'équations |
| `multi-step` | Problème multi-étapes |

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/questions` | GET | Liste les questions (filtrable par module) |
| `/api/questions` | POST | Ajoute une nouvelle question |
| `/api/validate` | POST | Valide une réponse |
| `/api/progress` | GET | Récupère la progression |
| `/api/progress` | POST | Enregistre une tentative |
| `/api/export` | GET | Exporte les données (CSV/JSON) |

## Export des données

### Mode enseignant

1. Accédez à `/teacher`
2. Cliquez sur "Export CSV" ou "Export JSON"
3. Les données incluent: sessions, tentatives, progression par compétence

### API directe

```bash
# Export JSON complet
curl http://localhost:3000/api/export?all=true

# Export CSV
curl http://localhost:3000/api/export?all=true&format=csv

# Export d'un utilisateur
curl http://localhost:3000/api/export?userId=xxx
```

## Personnalisation

### Ajouter des questions

1. Modifiez les fichiers dans `data/questions/`
2. Respectez le format JSON décrit ci-dessus
3. Redémarrez l'application

### Modifier les tolérances

Dans `src/lib/validation.ts`, ajustez `DEFAULT_VALIDATION_CONFIG`:

```typescript
export const DEFAULT_VALIDATION_CONFIG = {
  defaultNumericTolerance: 2,      // % d'erreur accepté
  defaultToleranceType: 'percent',
  enablePartialCredit: true,       // Crédit partiel activé
  dclWeight: 0.3,                  // Poids du DCL (30%)
  equationWeight: 0.3,             // Poids des équations (30%)
  calculationWeight: 0.4,          // Poids des calculs (40%)
  requireCorrectUnits: true,       // Vérifier les unités
};
```

## Déploiement

### Production locale

```bash
npm run build
npm run start
```

### Variables d'environnement

Créez un fichier `.env.local` si nécessaire:

```
# Exemple (pas obligatoire pour fonctionnement de base)
DATABASE_PATH=./data/database.sqlite
```

## Technologies utilisées

- **Next.js 14** - Framework React fullstack
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styles utilitaires
- **SQLite** (better-sqlite3) - Base de données embarquée
- **Zustand** - Gestion d'état
- **Zod** - Validation de schémas

## Licence

Usage éducatif - CÉGEP

## Support

Pour signaler un problème ou suggérer une amélioration, contactez l'enseignant responsable du cours 203-4A3-RA.
