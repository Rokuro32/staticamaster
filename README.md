# Phet-ford — Simulations interactives de physique

Site web qui héberge une collection de simulations de physique manipulables
directement dans le navigateur. Aucun contenu de cours, aucun exercice : que des
simulations, classées par section.

**Conçu par** Xavier Arata, B.Ing, CPI

## Sections

| Section | Simulations |
|---|---|
| 📐 Mathématiques | Cercle trigonométrique, Opérations vectorielles |
| ⚖️ Statique | Addition de forces, Moments et rotation, Analyse de treillis, Résistance des matériaux |
| 🚀 Cinématique | Cinématique 1D et graphiques, Mouvement de projectile, Mouvement relatif, Mouvement hélicoïdal |
| 💥 Dynamique | Conservation de la quantité de mouvement |
| ⚙️ Mécanismes et machines | Train planétaire, Coulisseaux croisés, Bielle-manivelle |
| 〰️ Ondes et oscillations | Oscillations et ondes mécaniques, Ondes sonores, Corde de guitare, Ondes électromagnétiques |
| ⚡ Électricité | Circuits à courant continu, Électrocardiogramme |
| ⚛️ Physique moderne | Relativité restreinte, Paradoxe des jumeaux, Naissance de la physique quantique, Physique atomique |
| ☢️ Physique nucléaire | Radioactivité et réactions nucléaires |
| 🌡️ Thermodynamique et fluides | Rayonnement thermique, Effet de serre, Tube de Venturi |

Plusieurs simulations regroupent elles-mêmes plusieurs modules sous forme
d'onglets (par exemple « Naissance de la physique quantique » couvre huit
expériences fondatrices).

## Prérequis

- Node.js 18.17+ (recommandé : 20+)

## Installation et démarrage

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm run start   # production
```

## Structure

```
src/
├── app/
│   ├── page.tsx                      # Catalogue complet (recherche + filtres)
│   ├── a-propos/, fonctionnalites/, bibliographie/   # Pages d'information
│   ├── categorie/[categoryId]/       # Une section
│   ├── simulation/[simId]/           # Une simulation
│   └── layout.tsx, not-found.tsx
├── components/
│   ├── catalog/                      # Cartes et navigateur du catalogue
│   ├── layout/Header.tsx
│   ├── simulations/                  # Les simulations elles-mêmes
│   │   └── SimulationRenderer.tsx    # Registre id -> composant (lazy)
│   └── ui/
├── lib/
│   ├── catalog.ts                    # Sections, métadonnées, helpers
│   ├── physics-constants.ts
│   └── utils.ts
└── types/simulation.ts
```

## Identité visuelle

La palette est dérivée du blason du Cégep de Thetford : noir profond, or/kaki
et blanc.

Le site a **deux ambiances**, parce que les simulations peignent elles-mêmes
leurs surfaces en clair (`bg-white`, `border-gray-200`, couleurs de canevas
codées en dur) :

- le **chrome sombre** — en-tête, accueil, pages de section, pied de page,
  bande de titre d'une simulation ;
- la **scène claire** — le corps d'une page de simulation, pour que le
  simulateur s'y pose naturellement.

Aucune simulation n'a été modifiée par la refonte ; elles n'importent que
`cn`, `physics-constants` et le type `Simulation`.

L'écusson vit dans `public/logo-cegep.svg` — c'est une reconstitution en SVG.
Pour utiliser le fichier officiel, il suffit d'écraser ce fichier (et
`public/favicon.svg`) : rien d'autre à changer dans le code.

Jetons (`tailwind.config.ts`) :

| Jeton | Rôle |
|---|---|
| `ink-500…950` | noirs chauds du chrome |
| `gold-50…900` | or du blason, accent de la marque (`gold-400` = teinte du blason) |
| `sec-<section>` | accent d'une section, `sec-<section>-deep` pour fond clair |
| `scene-50…200` | fonds de la scène claire |

Les thèmes de section vivent dans `CATEGORY_THEMES` (`src/lib/catalog.ts`).
**`src/lib/**` doit rester dans les globs `content` de Tailwind**, sinon
aucune de ces classes n'est générée.

## Ajouter une simulation

1. Créer le composant dans `src/components/simulations/` (`'use client'`).
2. Ajouter son entrée de métadonnées dans `SIMULATIONS` (`src/lib/catalog.ts`)
   avec un `id` en kebab-case et un `categoryId` existant.
3. Enregistrer le composant sous le même `id` dans le `REGISTRY` de
   `src/components/simulations/SimulationRenderer.tsx`.

La page `/simulation/<id>` et les listings sont générés automatiquement.

Pour ajouter une **section**, ajouter une entrée dans `CATEGORIES` et son thème
dans `CATEGORY_THEMES` (`src/lib/catalog.ts`), puis étendre le type `CategoryId`
dans `src/types/simulation.ts`.

## Déploiement

Le projet se déploie tel quel sur toute plateforme Node (Vercel, Railway…).
`nixpacks.toml` est fourni pour les builds Nixpacks.
