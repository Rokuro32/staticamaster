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
| 🚀 Cinématique | Cinématique 1D et graphiques, Mouvement de projectile, Mouvement relatif |
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
